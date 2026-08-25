import {
  CreateTicketSchema,
  UpdateTicketSchema,
  ResolutionSchema,
  CsatSchema,
  CannedResponseSchema,
} from '../../src/lib/tickets';

describe('Ticket Validation & Schema Logic (Unit Tests)', () => {
  describe('CreateTicketSchema', () => {
    it('should validate valid ticket payload with defaults', () => {
      const valid = {
        title: 'Network printer not responding',
      };
      const parsed = CreateTicketSchema.parse(valid);
      expect(parsed.title).toBe('Network printer not responding');
      expect(parsed.priority).toBe('Medium');
      expect(parsed.category).toBe('General');
      expect(parsed.description).toBe('');
      expect(parsed.attachments).toEqual([]);
    });

    it('should validate full ticket payload', () => {
      const full = {
        title: 'Core Switch failure',
        description: 'Server room switch down',
        category: 'Network',
        priority: 'Critical',
        assigned_to: 'tech-01',
        reporter_name: 'John Doe',
        reporter_email: 'john@example.com',
        attachments: [{ name: 'log.txt', url: 'https://cdn.example.com/log.txt' }],
      };
      const parsed = CreateTicketSchema.parse(full);
      expect(parsed.priority).toBe('Critical');
      expect(parsed.reporter_email).toBe('john@example.com');
      expect(parsed.attachments.length).toBe(1);
    });

    it('should reject invalid title or email', () => {
      expect(() =>
        CreateTicketSchema.parse({
          title: 'ab', // too short
        })
      ).toThrow();

      expect(() =>
        CreateTicketSchema.parse({
          title: 'Valid Title',
          reporter_email: 'not-an-email',
        })
      ).toThrow();

      expect(() =>
        CreateTicketSchema.parse({
          title: 'Valid Title',
          priority: 'SuperUrgent' as any, // invalid enum
        })
      ).toThrow();
    });
  });

  describe('UpdateTicketSchema', () => {
    it('should validate partial update payload', () => {
      const update = {
        status: 'In Progress',
        assigned_to: 'tech-02',
      };
      const parsed = UpdateTicketSchema.parse(update);
      expect(parsed.status).toBe('In Progress');
      expect(parsed.assigned_to).toBe('tech-02');
    });

    it('should reject invalid status value', () => {
      expect(() =>
        UpdateTicketSchema.parse({
          status: 'UnknownStatus',
        })
      ).toThrow();
    });
  });

  describe('ResolutionSchema', () => {
    it('should validate valid resolution payload', () => {
      const res = {
        resolution_notes: 'Replaced power supply unit and verified voltages.',
        assigned_to: 'tech-01',
      };
      const parsed = ResolutionSchema.parse(res);
      expect(parsed.resolution_notes).toContain('Replaced power supply');
    });

    it('should reject empty or short resolution notes', () => {
      expect(() =>
        ResolutionSchema.parse({
          resolution_notes: 'no',
        })
      ).toThrow();
    });
  });

  describe('CsatSchema', () => {
    it('should accept valid 1-5 rating', () => {
      expect(CsatSchema.parse({ rating: 1 }).rating).toBe(1);
      expect(CsatSchema.parse({ rating: 5, feedback: 'Great service' }).rating).toBe(5);
    });

    it('should reject out-of-range rating', () => {
      expect(() => CsatSchema.parse({ rating: 0 })).toThrow();
      expect(() => CsatSchema.parse({ rating: 6 })).toThrow();
      expect(() => CsatSchema.parse({ rating: 3.5 })).toThrow();
    });
  });

  describe('CannedResponseSchema', () => {
    it('should validate canned response payload', () => {
      const res = {
        title: 'Password Reset Steps',
        content: 'Please visit the self-service portal to reset your password.',
        shortcut_code: '#pwd-reset',
      };
      const parsed = CannedResponseSchema.parse(res);
      expect(parsed.title).toBe('Password Reset Steps');
      expect(parsed.category).toBe('General');
    });
  });
});
