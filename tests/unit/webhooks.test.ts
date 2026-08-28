import {
  CreateWebhookSchema,
  signWebhookPayload,
  createWebhookSubscription,
  listWebhookSubscriptions,
  deleteWebhookSubscription,
  dispatchWebhookEvent,
  getWebhookDeliveries,
} from '../../src/lib/webhooks';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Event-Driven Webhooks (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('Webhook Subscriptions CRUD', () => {
    const tenantId = 'tenant-123';

    it('should create and list webhook subscriptions', async () => {
      const mockSub = {
        id: 'wh-1',
        url: 'https://webhook.site/test',
        events: ['ticket.created'],
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockSub] }),
        };
        return cb(client);
      });

      const sub = await createWebhookSubscription(tenantId, {
        url: 'https://webhook.site/test',
        events: ['ticket.created'],
      });
      expect(sub.id).toBe('wh-1');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockSub] }),
        };
        return cb(client);
      });

      const list = await listWebhookSubscriptions(tenantId);
      expect(list.length).toBe(1);
    });

    it('should delete webhook subscription', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'wh-1' }] }),
        };
        return cb(client);
      });

      const deleted = await deleteWebhookSubscription(tenantId, 'wh-1');
      expect(deleted).toBe(true);
    });
  });

  describe('Event Dispatching & Delivery Logs', () => {
    const tenantId = 'tenant-123';

    it('should dispatch webhook event successfully', async () => {
      const mockSub = {
        id: 'wh-1',
        url: 'https://webhook.site/test',
        secret: 'whsec_secret_123',
        events: ['ticket.created'],
      };
      const mockDeliveryLog = {
        id: 'log-1',
        subscription_id: 'wh-1',
        status: 'Delivered',
        response_status: 200,
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockSub] }) // select matching subs
            .mockResolvedValueOnce({ rows: [mockDeliveryLog] }), // insert log
        };
        return cb(client);
      });

      const mockSender = jest.fn().mockResolvedValue({ status: 200, body: '{"ok":true}' });

      const logs = await dispatchWebhookEvent(
        tenantId,
        'ticket.created',
        { ticket_id: 'TK-1' },
        mockSender
      );

      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('Delivered');
      expect(mockSender).toHaveBeenCalled();
    });

    it('should handle mockSender failure with error status and exception', async () => {
      const mockSub = {
        id: 'wh-1',
        url: 'https://webhook.site/test',
        secret: 'whsec_secret_123',
        events: ['*'],
      };
      const mockDeliveryLog = {
        id: 'log-2',
        status: 'Failed',
        response_status: 500,
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockSub] })
            .mockResolvedValueOnce({ rows: [mockDeliveryLog] }),
        };
        return cb(client);
      });

      const mockSender = jest.fn().mockRejectedValue(new Error('Connection timed out'));

      const logs = await dispatchWebhookEvent(
        tenantId,
        'ticket.created',
        { ticket_id: 'TK-1' },
        mockSender
      );

      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('Failed');
    });

    it('should retrieve delivery logs for subscription', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'log-1', status: 'Delivered' }] }),
        };
        return cb(client);
      });

      const logs = await getWebhookDeliveries(tenantId, 'wh-1');
      expect(logs.length).toBe(1);
    });
  });
});
