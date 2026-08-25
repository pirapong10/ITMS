export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for User'
  | 'Waiting for Vendor'
  | 'Resolved'
  | 'Closed';

export const SLA_MATRIX: Record<TicketPriority, number> = {
  Critical: 2, // 2 hours
  High: 8,     // 8 hours
  Medium: 24,  // 24 hours
  Low: 48,     // 48 hours
};

export const SLA_PAUSE_STATUSES = new Set<string>([
  'Waiting for User',
  'Waiting for Vendor',
]);

export const SLA_COMPLETED_STATUSES = new Set<string>([
  'Resolved',
  'Closed',
]);

/**
 * Returns the SLA target hours for a given priority.
 */
export function getSlaTargetHours(priority: string): number {
  const normPriority = (priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()) as TicketPriority;
  return SLA_MATRIX[normPriority] ?? SLA_MATRIX.Medium;
}

/**
 * Computes the initial SLA deadline given the creation timestamp and priority.
 */
export function calculateSlaDeadline(
  createdAt: Date | string | number,
  priority: string
): Date {
  const createdDate = new Date(createdAt);
  const targetHours = getSlaTargetHours(priority);
  return new Date(createdDate.getTime() + targetHours * 3600 * 1000);
}

/**
 * Checks if a ticket status causes the SLA timer to pause.
 */
export function isSlaPausedStatus(status: string): boolean {
  return SLA_PAUSE_STATUSES.has(status);
}

/**
 * Checks if a ticket status is completed.
 */
export function isSlaCompletedStatus(status: string): boolean {
  return SLA_COMPLETED_STATUSES.has(status);
}

export interface SlaStateResult {
  remainingSeconds: number;
  totalPausedSeconds: number;
  isPaused: boolean;
  isBreached: boolean;
  progressPercent: number;
  effectiveDeadline: Date;
}

/**
 * Calculates real-time SLA remaining time, pause status, progress %, and breach status.
 */
export function calculateSlaState(params: {
  createdAt: Date | string;
  priority: string;
  status: string;
  slaDeadline: Date | string;
  slaPausedAt?: Date | string | null;
  slaTotalPausedSeconds?: number;
  resolvedAt?: Date | string | null;
  now?: Date | string;
}): SlaStateResult {
  const now = params.now ? new Date(params.now) : new Date();
  const created = new Date(params.createdAt);
  const targetHours = getSlaTargetHours(params.priority);
  const totalSlaSeconds = targetHours * 3600;

  let totalPausedSeconds = params.slaTotalPausedSeconds || 0;
  const isPaused = isSlaPausedStatus(params.status);

  // If currently paused, add the elapsed time since it was paused to total paused seconds
  if (isPaused && params.slaPausedAt) {
    const pausedDate = new Date(params.slaPausedAt);
    const currentPauseDuration = Math.max(
      0,
      Math.floor((now.getTime() - pausedDate.getTime()) / 1000)
    );
    totalPausedSeconds += currentPauseDuration;
  }

  // Effective deadline moves forward by totalPausedSeconds
  const initialDeadline = new Date(params.slaDeadline);
  const effectiveDeadline = new Date(
    initialDeadline.getTime() + totalPausedSeconds * 1000
  );

  const referenceTime =
    isSlaCompletedStatus(params.status) && params.resolvedAt
      ? new Date(params.resolvedAt)
      : now;

  const remainingSeconds = Math.floor(
    (effectiveDeadline.getTime() - referenceTime.getTime()) / 1000
  );

  const isBreached = remainingSeconds <= 0;

  // Calculate progress percentage (0% = just started, 100% = deadline reached)
  const elapsedWorkingSeconds = totalSlaSeconds - remainingSeconds;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedWorkingSeconds / totalSlaSeconds) * 100))
  );

  return {
    remainingSeconds,
    totalPausedSeconds,
    isPaused,
    isBreached,
    progressPercent,
    effectiveDeadline,
  };
}

export interface StatusTransitionResult {
  slaPausedAt: Date | null;
  slaTotalPausedSeconds: number;
  newDeadline: Date;
  isBreached: boolean;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

/**
 * Handles SLA adjustments when a ticket changes status (e.g. Pause -> Resume, Resolve, Close).
 */
export function handleStatusTransition(params: {
  currentStatus: string;
  newStatus: string;
  slaDeadline: Date | string;
  slaPausedAt?: Date | string | null;
  slaTotalPausedSeconds?: number;
  now?: Date;
}): StatusTransitionResult {
  const now = params.now || new Date();
  let totalPaused = params.slaTotalPausedSeconds || 0;
  let slaPausedAt: Date | null = params.slaPausedAt ? new Date(params.slaPausedAt) : null;
  let resolvedAt: Date | null = null;
  let closedAt: Date | null = null;

  const wasPaused = isSlaPausedStatus(params.currentStatus);
  const willBePaused = isSlaPausedStatus(params.newStatus);

  // If transitioning FROM a paused state TO an unpaused/resolved state, finalize accumulated paused time
  if (wasPaused && slaPausedAt) {
    const pauseDuration = Math.max(
      0,
      Math.floor((now.getTime() - slaPausedAt.getTime()) / 1000)
    );
    totalPaused += pauseDuration;
    slaPausedAt = null;
  }

  // If transitioning INTO a paused state
  if (willBePaused) {
    slaPausedAt = now;
  }

  // If transitioning to Resolved
  if (params.newStatus === 'Resolved') {
    resolvedAt = now;
  }

  // If transitioning to Closed
  if (params.newStatus === 'Closed') {
    closedAt = now;
  }

  const initialDeadline = new Date(params.slaDeadline);
  const newDeadline = new Date(initialDeadline.getTime() + totalPaused * 1000);
  const isBreached = now.getTime() > newDeadline.getTime();

  return {
    slaPausedAt,
    slaTotalPausedSeconds: totalPaused,
    newDeadline,
    isBreached,
    resolvedAt,
    closedAt,
  };
}

export interface MttrResult {
  count: number;
  totalMinutes: number;
  averageMinutes: number;
  formattedMttr: string;
}

/**
 * Calculates Mean Time to Resolution (MTTR) across resolved tickets.
 */
export function calculateMttr(
  tickets: Array<{ created_at: Date | string; resolved_at?: Date | string | null }>
): MttrResult {
  const resolvedTickets = tickets.filter(
    (t) => t.resolved_at !== null && t.resolved_at !== undefined
  );

  if (resolvedTickets.length === 0) {
    return {
      count: 0,
      totalMinutes: 0,
      averageMinutes: 0,
      formattedMttr: '0m',
    };
  }

  let totalMinutes = 0;
  for (const t of resolvedTickets) {
    const start = new Date(t.created_at).getTime();
    const end = new Date(t.resolved_at!).getTime();
    const diffMin = Math.max(0, Math.round((end - start) / (1000 * 60)));
    totalMinutes += diffMin;
  }

  const averageMinutes = Math.round(totalMinutes / resolvedTickets.length);
  const hours = Math.floor(averageMinutes / 60);
  const minutes = averageMinutes % 60;

  const formattedMttr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    count: resolvedTickets.length,
    totalMinutes,
    averageMinutes,
    formattedMttr,
  };
}
