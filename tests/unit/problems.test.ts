import {
  CreateProblemSchema,
  UpdateProblemSchema,
  LinkTicketsSchema,
  ResolveProblemSchema,
} from '../../src/lib/problems';

describe('Problem Management & KEDB (Unit Tests)', () => {
  describe('Validation Schemas', () => {
    it('should validate valid problem creation payload', () => {
      const payload = {
        title: 'Core Switch Intermittent Packet Loss',
        description: 'VLAN 10 and 20 experiencing 15% packet drops',
        category: 'Network',
        priority: 'High' as const,
        impact: 'High' as const,
        is_known_error: true,
        workaround: 'Reroute traffic to Secondary Switch B',
      };
      const parsed = CreateProblemSchema.parse(payload);
      expect(parsed.title).toBe('Core Switch Intermittent Packet Loss');
      expect(parsed.is_known_error).toBe(true);
      expect(parsed.category).toBe('Network');
    });

    it('should validate problem update payload', () => {
      const payload = {
        status: 'Investigating' as const,
        root_cause: 'Faulty SFP+ transceiver port 24',
      };
      const parsed = UpdateProblemSchema.parse(payload);
      expect(parsed.status).toBe('Investigating');
      expect(parsed.root_cause).toBe('Faulty SFP+ transceiver port 24');
    });

    it('should validate ticket linking payload', () => {
      const parsed = LinkTicketsSchema.parse({
        ticket_ids: ['TK-2026-0001', 'TK-2026-0002'],
      });
      expect(parsed.ticket_ids.length).toBe(2);
    });

    it('should validate resolution payload', () => {
      const payload = {
        root_cause: 'Firmware bug in switch OS v12.4',
        solution: 'Upgraded switch firmware to v12.4.2 patch',
        cascade_to_tickets: true,
      };
      const parsed = ResolveProblemSchema.parse(payload);
      expect(parsed.root_cause).toBe('Firmware bug in switch OS v12.4');
      expect(parsed.cascade_to_tickets).toBe(true);
    });

    it('should reject resolution payload missing root cause or solution', () => {
      expect(() =>
        ResolveProblemSchema.parse({
          root_cause: '',
          solution: 'Fixed',
        })
      ).toThrow();
    });
  });
});
