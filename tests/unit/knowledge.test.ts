import {
  CreateArticleSchema,
  UpdateArticleSchema,
  FeedbackSchema,
  ConvertTicketSchema,
  ConvertProblemSchema,
} from '../../src/lib/knowledge';

describe('Knowledge Management & KCS (Unit Tests)', () => {
  describe('Validation Schemas', () => {
    it('should validate valid Knowledge Article creation payload', () => {
      const payload = {
        title: 'How to Configure GlobalProtect VPN on macOS',
        summary: 'Step-by-step guide for setting up corporate VPN client on macOS Sequoia',
        content: '1. Download client. 2. Enter portal gateway. 3. Authenticate with SSO.',
        category: 'Network',
        tags: ['VPN', 'macOS', 'Remote Access'],
        visibility: 'Public' as const,
        status: 'Published' as const,
      };
      const parsed = CreateArticleSchema.parse(payload);
      expect(parsed.title).toBe('How to Configure GlobalProtect VPN on macOS');
      expect(parsed.visibility).toBe('Public');
      expect(parsed.tags.length).toBe(3);
    });

    it('should validate Article update payload', () => {
      const payload = {
        title: 'Updated VPN Setup Guide',
        status: 'Under Review' as const,
      };
      const parsed = UpdateArticleSchema.parse(payload);
      expect(parsed.title).toBe('Updated VPN Setup Guide');
      expect(parsed.status).toBe('Under Review');
    });

    it('should validate feedback payload', () => {
      const payload = {
        is_helpful: true,
        feedback_text: 'Very clear instructions, solved my issue in 2 minutes!',
      };
      const parsed = FeedbackSchema.parse(payload);
      expect(parsed.is_helpful).toBe(true);
      expect(parsed.feedback_text).toContain('Very clear instructions');
    });

    it('should validate ticket conversion schema', () => {
      const parsed = ConvertTicketSchema.parse({
        ticket_id: 'TK-2026-0001',
        visibility: 'Public',
      });
      expect(parsed.ticket_id).toBe('TK-2026-0001');
      expect(parsed.visibility).toBe('Public');
    });

    it('should validate problem conversion schema', () => {
      const parsed = ConvertProblemSchema.parse({
        problem_id: 'PRB-2026-0001',
        visibility: 'Internal',
      });
      expect(parsed.problem_id).toBe('PRB-2026-0001');
    });
  });
});
