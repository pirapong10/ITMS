import {
  getSlaTargetHours,
  calculateSlaDeadline,
  isSlaPausedStatus,
  isSlaCompletedStatus,
  calculateSlaState,
  handleStatusTransition,
  calculateMttr,
  SLA_MATRIX,
} from '../../src/lib/sla';

describe('SLA Matrix & Core Engine (Unit Tests)', () => {
  describe('SLA Target Hours & Matrix', () => {
    it('should return correct hours per priority', () => {
      expect(getSlaTargetHours('Critical')).toBe(2);
      expect(getSlaTargetHours('critical')).toBe(2);
      expect(getSlaTargetHours('High')).toBe(8);
      expect(getSlaTargetHours('high')).toBe(8);
      expect(getSlaTargetHours('Medium')).toBe(24);
      expect(getSlaTargetHours('Low')).toBe(48);
      expect(getSlaTargetHours('UnknownPriority')).toBe(24);
    });

    it('should calculate initial SLA deadline correctly', () => {
      const base = new Date('2026-08-25T10:00:00.000Z');
      const criticalDeadline = calculateSlaDeadline(base, 'Critical');
      expect(criticalDeadline.toISOString()).toBe('2026-08-25T12:00:00.000Z');

      const highDeadline = calculateSlaDeadline(base, 'High');
      expect(highDeadline.toISOString()).toBe('2026-08-25T18:00:00.000Z');

      const mediumDeadline = calculateSlaDeadline(base, 'Medium');
      expect(mediumDeadline.toISOString()).toBe('2026-08-26T10:00:00.000Z');

      const lowDeadline = calculateSlaDeadline(base, 'Low');
      expect(lowDeadline.toISOString()).toBe('2026-08-27T10:00:00.000Z');
    });

    it('should identify pause and completed statuses', () => {
      expect(isSlaPausedStatus('Waiting for User')).toBe(true);
      expect(isSlaPausedStatus('Waiting for Vendor')).toBe(true);
      expect(isSlaPausedStatus('In Progress')).toBe(false);
      expect(isSlaPausedStatus('Open')).toBe(false);

      expect(isSlaCompletedStatus('Resolved')).toBe(true);
      expect(isSlaCompletedStatus('Closed')).toBe(true);
      expect(isSlaCompletedStatus('Open')).toBe(false);
    });
  });

  describe('SLA State & Countdown Calculations', () => {
    it('should calculate remaining time and progress % accurately for an active ticket', () => {
      const created = '2026-08-25T10:00:00.000Z';
      const deadline = '2026-08-25T12:00:00.000Z'; // 2 hours (Critical)
      const now = '2026-08-25T11:00:00.000Z'; // 1 hour elapsed

      const state = calculateSlaState({
        createdAt: created,
        priority: 'Critical',
        status: 'In Progress',
        slaDeadline: deadline,
        now,
      });

      expect(state.isPaused).toBe(false);
      expect(state.isBreached).toBe(false);
      expect(state.remainingSeconds).toBe(3600);
      expect(state.progressPercent).toBe(50);
      expect(state.effectiveDeadline.toISOString()).toBe(deadline);
    });

    it('should detect breached SLA when time expires', () => {
      const created = '2026-08-25T10:00:00.000Z';
      const deadline = '2026-08-25T12:00:00.000Z';
      const now = '2026-08-25T12:30:00.000Z'; // 30 minutes overdue

      const state = calculateSlaState({
        createdAt: created,
        priority: 'Critical',
        status: 'In Progress',
        slaDeadline: deadline,
        now,
      });

      expect(state.isBreached).toBe(true);
      expect(state.remainingSeconds).toBe(-1800);
      expect(state.progressPercent).toBe(100);
    });

    it('should freeze countdown and extend effective deadline during paused state', () => {
      const created = '2026-08-25T10:00:00.000Z';
      const deadline = '2026-08-25T12:00:00.000Z';
      const pausedAt = '2026-08-25T11:00:00.000Z'; // paused after 1 hour
      const now = '2026-08-25T11:30:00.000Z'; // 30 minutes while paused

      const state = calculateSlaState({
        createdAt: created,
        priority: 'Critical',
        status: 'Waiting for Vendor',
        slaDeadline: deadline,
        slaPausedAt: pausedAt,
        slaTotalPausedSeconds: 0,
        now,
      });

      expect(state.isPaused).toBe(true);
      expect(state.isBreached).toBe(false);
      // Total paused seconds includes 1800s (30m)
      expect(state.totalPausedSeconds).toBe(1800);
      // Remaining seconds is frozen at 3600s (1h remaining)
      expect(state.remainingSeconds).toBe(3600);
      // Effective deadline moved by 30 mins
      expect(state.effectiveDeadline.toISOString()).toBe('2026-08-25T12:30:00.000Z');
    });

    it('should preserve SLA status on resolved ticket', () => {
      const created = '2026-08-25T10:00:00.000Z';
      const deadline = '2026-08-25T12:00:00.000Z';
      const resolvedAt = '2026-08-25T11:30:00.000Z';
      const now = '2026-08-25T15:00:00.000Z';

      const state = calculateSlaState({
        createdAt: created,
        priority: 'Critical',
        status: 'Resolved',
        slaDeadline: deadline,
        resolvedAt,
        now,
      });

      expect(state.isBreached).toBe(false);
      expect(state.remainingSeconds).toBe(1800);
    });
  });

  describe('Status Transition SLA Handling', () => {
    it('should pause SLA when transitioning to Waiting for User', () => {
      const deadline = new Date('2026-08-25T18:00:00.000Z');
      const pauseTime = new Date('2026-08-25T12:00:00.000Z');

      const res = handleStatusTransition({
        currentStatus: 'In Progress',
        newStatus: 'Waiting for User',
        slaDeadline: deadline,
        now: pauseTime,
      });

      expect(res.slaPausedAt?.toISOString()).toBe(pauseTime.toISOString());
      expect(res.slaTotalPausedSeconds).toBe(0);
      expect(res.isBreached).toBe(false);
    });

    it('should unpause and extend deadline when transitioning back to In Progress', () => {
      const initialDeadline = new Date('2026-08-25T18:00:00.000Z');
      const pausedAt = new Date('2026-08-25T12:00:00.000Z');
      const resumeTime = new Date('2026-08-25T14:00:00.000Z'); // 2 hours paused (7200s)

      const res = handleStatusTransition({
        currentStatus: 'Waiting for User',
        newStatus: 'In Progress',
        slaDeadline: initialDeadline,
        slaPausedAt: pausedAt,
        slaTotalPausedSeconds: 0,
        now: resumeTime,
      });

      expect(res.slaPausedAt).toBeNull();
      expect(res.slaTotalPausedSeconds).toBe(7200);
      // New deadline should be 18:00 + 2 hours = 20:00
      expect(res.newDeadline.toISOString()).toBe('2026-08-25T20:00:00.000Z');
      expect(res.isBreached).toBe(false);
    });

    it('should set resolvedAt when transitioning to Resolved', () => {
      const deadline = new Date('2026-08-25T18:00:00.000Z');
      const resolveTime = new Date('2026-08-25T16:00:00.000Z');

      const res = handleStatusTransition({
        currentStatus: 'In Progress',
        newStatus: 'Resolved',
        slaDeadline: deadline,
        now: resolveTime,
      });

      expect(res.resolvedAt?.toISOString()).toBe(resolveTime.toISOString());
      expect(res.isBreached).toBe(false);
    });

    it('should set closedAt when transitioning to Closed', () => {
      const deadline = new Date('2026-08-25T18:00:00.000Z');
      const closeTime = new Date('2026-08-25T19:00:00.000Z');

      const res = handleStatusTransition({
        currentStatus: 'Resolved',
        newStatus: 'Closed',
        slaDeadline: deadline,
        now: closeTime,
      });

      expect(res.closedAt?.toISOString()).toBe(closeTime.toISOString());
    });
  });

  describe('MTTR Calculation', () => {
    it('should return 0 when no tickets are resolved', () => {
      const res = calculateMttr([]);
      expect(res.count).toBe(0);
      expect(res.totalMinutes).toBe(0);
      expect(res.averageMinutes).toBe(0);
      expect(res.formattedMttr).toBe('0m');
    });

    it('should calculate accurate MTTR across multiple resolved tickets', () => {
      const tickets = [
        {
          created_at: '2026-08-25T08:00:00.000Z',
          resolved_at: '2026-08-25T09:30:00.000Z', // 90 min
        },
        {
          created_at: '2026-08-25T10:00:00.000Z',
          resolved_at: '2026-08-25T12:00:00.000Z', // 120 min
        },
        {
          created_at: '2026-08-25T13:00:00.000Z',
          resolved_at: null, // not resolved, ignored
        },
      ];

      const res = calculateMttr(tickets);
      expect(res.count).toBe(2);
      expect(res.totalMinutes).toBe(210);
      expect(res.averageMinutes).toBe(105); // 1h 45m
      expect(res.formattedMttr).toBe('1h 45m');
    });
  });
});
