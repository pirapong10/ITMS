import { CreateDsarSchema } from '../../src/lib/privacy';

describe('Data Privacy & DSAR (Unit Tests)', () => {
  describe('Validation Schemas', () => {
    it('should validate DSAR export request payload', () => {
      const payload = {
        request_type: 'Export' as const,
        subject_email: 'user.gdpr@company.com',
        requester_notes: 'Employee requesting personal data under GDPR Article 15',
      };
      const parsed = CreateDsarSchema.parse(payload);
      expect(parsed.request_type).toBe('Export');
      expect(parsed.subject_email).toBe('user.gdpr@company.com');
    });

    it('should validate DSAR erasure request payload', () => {
      const payload = {
        request_type: 'Erasure' as const,
        subject_email: 'former.employee@company.com',
      };
      const parsed = CreateDsarSchema.parse(payload);
      expect(parsed.request_type).toBe('Erasure');
    });

    it('should reject invalid email format', () => {
      expect(() =>
        CreateDsarSchema.parse({
          subject_email: 'not-an-email',
        })
      ).toThrow();
    });
  });
});
