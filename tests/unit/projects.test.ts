import {
  CreateProjectSchema,
  CreateProjectTaskSchema,
  CreateTaskSchema,
} from '../../src/lib/projects';

describe('Project & Task Management (Unit Tests)', () => {
  describe('Zod Validation Schemas', () => {
    it('should validate valid project payload', () => {
      const payload = {
        name: 'Network Infrastructure Upgrade 2026',
        category: 'Infrastructure',
        budget: 250000,
        status: 'In Progress' as const,
      };
      const parsed = CreateProjectSchema.parse(payload);
      expect(parsed.name).toBe('Network Infrastructure Upgrade 2026');
      expect(parsed.budget).toBe(250000);
      expect(parsed.status).toBe('In Progress');
    });

    it('should reject invalid project name', () => {
      expect(() => CreateProjectSchema.parse({ name: 'N' })).toThrow();
    });

    it('should validate valid project task payload', () => {
      const payload = {
        title: 'Core Switch Installation',
        status: 'Todo' as const,
        order_index: 1,
        is_milestone: true,
      };
      const parsed = CreateProjectTaskSchema.parse(payload);
      expect(parsed.title).toBe('Core Switch Installation');
      expect(parsed.is_milestone).toBe(true);
    });

    it('should validate valid Kanban task payload', () => {
      const payload = {
        title: 'Fix VPN Gateway Latency',
        priority: 'Urgent' as const,
        status: 'In Progress' as const,
      };
      const parsed = CreateTaskSchema.parse(payload);
      expect(parsed.title).toBe('Fix VPN Gateway Latency');
      expect(parsed.priority).toBe('Urgent');
      expect(parsed.status).toBe('In Progress');
    });
  });
});
