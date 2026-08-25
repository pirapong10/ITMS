import { createHmac, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  secret: z.string().optional(),
});

export type CreateWebhookInput = z.input<typeof CreateWebhookSchema>;

export interface WebhookSubscriptionRecord {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryLogRecord {
  id: string;
  subscription_id: string;
  tenant_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  status: 'Delivered' | 'Failed';
  created_at: string;
}

/**
 * Computes HMAC-SHA256 signature for webhook payload.
 */
export function signWebhookPayload(secret: string, payload: any): string {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(content).digest('hex');
  return `sha256=${signature}`;
}

/**
 * Creates a new Webhook Subscription.
 */
export async function createWebhookSubscription(
  tenantId: string,
  input: CreateWebhookInput
): Promise<WebhookSubscriptionRecord> {
  const validated = CreateWebhookSchema.parse(input);
  const now = new Date();
  const id = randomUUID();
  const secret = validated.secret || `whsec_${randomBytes(20).toString('hex')}`;

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO webhook_subscriptions (
        id, tenant_id, url, secret, events, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, $6, $6)
      RETURNING *;`,
      [id, tenantId, validated.url, secret, validated.events, now.toISOString()]
    );

    return res.rows[0];
  });
}

/**
 * Lists Webhook Subscriptions for a tenant.
 */
export async function listWebhookSubscriptions(
  tenantId: string
): Promise<WebhookSubscriptionRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM webhook_subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  });
}

/**
 * Deletes a Webhook Subscription.
 */
export async function deleteWebhookSubscription(
  tenantId: string,
  id: string
): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM webhook_subscriptions WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    return res.rows.length > 0;
  });
}

/**
 * Dispatches an event to all matching webhook subscriptions and logs delivery.
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  eventType: string,
  data: any,
  mockSender?: (url: string, headers: Record<string, string>, body: string) => Promise<{ status: number; body: string }>
): Promise<WebhookDeliveryLogRecord[]> {
  const eventPayload = {
    id: `evt_${randomUUID()}`,
    event: eventType,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(eventPayload);
  const deliveryLogs: WebhookDeliveryLogRecord[] = [];

  return withTenantTransaction(tenantId, async (client) => {
    const subRes = await client.query(
      `SELECT * FROM webhook_subscriptions
       WHERE tenant_id = $1 AND is_active = true AND ($2 = ANY(events) OR '*' = ANY(events))`,
      [tenantId, eventType]
    );

    for (const sub of subRes.rows) {
      const signature = signWebhookPayload(sub.secret, payloadString);
      const deliveryId = randomUUID();

      let responseStatus = 200;
      let responseBody = 'OK';
      let status: 'Delivered' | 'Failed' = 'Delivered';

      if (mockSender) {
        try {
          const res = await mockSender(
            sub.url,
            {
              'Content-Type': 'application/json',
              'X-ITSM-Signature': signature,
              'X-ITSM-Event': eventType,
            },
            payloadString
          );
          responseStatus = res.status;
          responseBody = res.body;
          if (responseStatus >= 400) status = 'Failed';
        } catch (err: any) {
          responseStatus = 500;
          responseBody = err.message || 'Connection Error';
          status = 'Failed';
        }
      }

      const logRes = await client.query(
        `INSERT INTO webhook_delivery_logs (
          id, subscription_id, tenant_id, event_type, payload, response_status,
          response_body, attempt_count, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, current_timestamp)
        RETURNING *;`,
        [deliveryId, sub.id, tenantId, eventType, payloadString, responseStatus, responseBody, status]
      );

      deliveryLogs.push(logRes.rows[0]);
    }

    return deliveryLogs;
  });
}

/**
 * Retrieves delivery logs for a subscription.
 */
export async function getWebhookDeliveries(
  tenantId: string,
  subscriptionId: string
): Promise<WebhookDeliveryLogRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM webhook_delivery_logs
       WHERE subscription_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [subscriptionId, tenantId]
    );
    return res.rows;
  });
}
