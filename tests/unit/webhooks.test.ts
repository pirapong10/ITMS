import {
  CreateWebhookSchema,
  signWebhookPayload,
} from '../../src/lib/webhooks';

describe('Event-Driven Webhooks (Unit Tests)', () => {
  describe('Validation Schemas', () => {
    it('should validate webhook subscription payload', () => {
      const payload = {
        url: 'https://api.thirdparty.com/webhooks/itsm',
        events: ['ticket.created', 'ticket.resolved'],
      };
      const parsed = CreateWebhookSchema.parse(payload);
      expect(parsed.url).toBe('https://api.thirdparty.com/webhooks/itsm');
      expect(parsed.events.length).toBe(2);
    });

    it('should reject invalid URL', () => {
      expect(() =>
        CreateWebhookSchema.parse({
          url: 'not-a-url',
          events: ['*'],
        })
      ).toThrow();
    });
  });

  describe('HMAC-SHA256 Payload Signature', () => {
    it('should generate valid sha256= signature prefix and verify tamper sensitivity', () => {
      const secret = 'whsec_test_secret_123';
      const payload = { event: 'ticket.created', id: 'TK-2026-0001' };

      const sig1 = signWebhookPayload(secret, payload);
      const sig2 = signWebhookPayload(secret, payload);
      expect(sig1).toBe(sig2);
      expect(sig1.startsWith('sha256=')).toBe(true);

      const tamperedPayload = { event: 'ticket.created', id: 'TK-2026-9999' };
      const sigTampered = signWebhookPayload(secret, tamperedPayload);
      expect(sig1).not.toBe(sigTampered);
    });
  });
});
