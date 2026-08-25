import { z } from 'zod';
import { withTenantTransaction } from './db';

export const SupportedTimezones = [
  'UTC',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Australia/Sydney',
] as const;

export type SupportedTimezone = (typeof SupportedTimezones)[number];

// Zod Validation Schemas
export const ConvertTimezoneSchema = z.object({
  timestamp: z.string().min(1, 'Timestamp is required'),
  target_timezone: z.string().min(1, 'Target timezone is required'),
  source_timezone: z.string().optional().default('UTC'),
});

export const BusinessHoursSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM (e.g. 08:30)'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM (e.g. 17:30)'),
  work_days: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]), // 0=Sun, 1=Mon, ..., 6=Sat
  holidays: z.array(z.string()).optional().default([]),
});

export const UpdateBusinessHoursSettingsSchema = z.object({
  timezone: z.string().optional(),
  business_hours: BusinessHoursSchema.optional(),
});

export type ConvertTimezoneInput = z.input<typeof ConvertTimezoneSchema>;
export type BusinessHoursConfig = z.infer<typeof BusinessHoursSchema>;
export type UpdateBusinessHoursSettingsInput = z.input<typeof UpdateBusinessHoursSettingsSchema>;

export interface TimezoneItem {
  code: string;
  label: string;
  offset: string;
  offsetMinutes: number;
  isDst: boolean;
}

/**
 * Returns detailed offset and DST information for a timezone.
 */
export function getTimezoneInfo(timezone: string, asOfDate: Date | string = new Date()): TimezoneItem {
  const date = new Date(asOfDate);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });

  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  const offsetStr = tzPart ? tzPart.value.replace('GMT', '') || '+00:00' : '+00:00';

  // Compute offset minutes
  let offsetMinutes = 0;
  const match = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    offsetMinutes = sign * (hours * 60 + minutes);
  }

  // Check DST by comparing January and July offsets
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const janOffset = getOffsetMinutes(timezone, jan);
  const julOffset = getOffsetMinutes(timezone, jul);
  const standardOffset = Math.min(janOffset, julOffset);
  const isDst = offsetMinutes > standardOffset;

  return {
    code: timezone,
    label: timezone.replace('_', ' '),
    offset: offsetStr.startsWith('+') || offsetStr.startsWith('-') ? offsetStr : `+${offsetStr}`,
    offsetMinutes,
    isDst,
  };
}

function getOffsetMinutes(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  const offsetStr = tzPart ? tzPart.value.replace('GMT', '') || '+00:00' : '+00:00';
  const match = offsetStr.match(/([+-])(\d{2}):(\d{2})/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
  }
  return 0;
}

/**
 * Returns list of all supported timezones with active offsets.
 */
export function getSupportedTimezonesList(asOf?: Date | string): TimezoneItem[] {
  return SupportedTimezones.map((tz) => getTimezoneInfo(tz, asOf));
}

/**
 * Formats a UTC timestamp into target timezone.
 */
export function formatInTimezone(
  utcDate: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
): string {
  const date = new Date(utcDate);
  return new Intl.DateTimeFormat('en-CA', {
    ...options,
    timeZone: timezone,
  }).format(date);
}

/**
 * Converts a timestamp from source timezone to target timezone and canonical UTC.
 */
export function convertTimestamp(params: {
  timestamp: string | Date;
  target_timezone: string;
  source_timezone?: string;
}): {
  utcIso: string;
  targetFormatted: string;
  targetTimezone: string;
  offset: string;
} {
  const date = new Date(params.timestamp);
  const targetTz = params.target_timezone;
  const info = getTimezoneInfo(targetTz, date);
  const targetFormatted = formatInTimezone(date, targetTz);

  return {
    utcIso: date.toISOString(),
    targetFormatted,
    targetTimezone: targetTz,
    offset: info.offset,
  };
}

/**
 * Calculates Business Hours SLA Deadline:
 * Advances required hours strictly within working schedule (e.g. 08:30-17:30 Mon-Fri).
 */
export function calculateBusinessHoursDeadline(
  startDate: Date | string,
  requiredHours: number,
  config: BusinessHoursConfig = {
    start: '08:30',
    end: '17:30',
    work_days: [1, 2, 3, 4, 5],
    holidays: [],
  },
  timezone: string = 'UTC'
): Date {
  const [startHour, startMin] = config.start.split(':').map((n) => parseInt(n, 10));
  const [endHour, endMin] = config.end.split(':').map((n) => parseInt(n, 10));
  const dailyWorkMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  if (dailyWorkMinutes <= 0) {
    // Fallback if config is invalid: 24/7 continuous
    const d = new Date(startDate);
    d.setUTCHours(d.getUTCHours() + requiredHours);
    return d;
  }

  let remainingMinutes = Math.round(requiredHours * 60);
  let current = new Date(startDate);

  // Advance in minutes
  while (remainingMinutes > 0) {
    const dayOfWeek = current.getUTCDay();
    const isWorkDay = config.work_days.includes(dayOfWeek);
    const dateStr = current.toISOString().split('T')[0];
    const isHoliday = config.holidays && config.holidays.includes(dateStr);

    const currentMinutes = current.getUTCHours() * 60 + current.getUTCMinutes();
    const workStartMinutes = startHour * 60 + startMin;
    const workEndMinutes = endHour * 60 + endMin;

    if (!isWorkDay || isHoliday || currentMinutes >= workEndMinutes) {
      // Roll over to next day work start
      current.setUTCDate(current.getUTCDate() + 1);
      current.setUTCHours(startHour, startMin, 0, 0);
      continue;
    }

    if (currentMinutes < workStartMinutes) {
      // Jump to today's start
      current.setUTCHours(startHour, startMin, 0, 0);
      continue;
    }

    // Currently within business hours: available minutes remaining today
    const availableToday = workEndMinutes - currentMinutes;
    if (remainingMinutes <= availableToday) {
      current.setUTCMinutes(current.getUTCMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      current.setUTCMinutes(current.getUTCMinutes() + availableToday);
      remainingMinutes -= availableToday;
    }
  }

  return current;
}

/**
 * Retrieves tenant business hours & timezone settings.
 */
export async function getTenantBusinessHoursSettings(tenantId: string) {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT timezone, business_hours FROM tenant_i18n_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (res.rows.length === 0) {
      return {
        timezone: 'Asia/Bangkok',
        business_hours: {
          start: '08:30',
          end: '17:30',
          work_days: [1, 2, 3, 4, 5],
          holidays: [],
        },
      };
    }

    return res.rows[0];
  });
}

/**
 * Updates tenant business hours & timezone settings.
 */
export async function updateTenantBusinessHoursSettings(
  tenantId: string,
  input: UpdateBusinessHoursSettingsInput
) {
  const validated = UpdateBusinessHoursSettingsSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const updates: string[] = ['updated_at = current_timestamp'];
    const values: any[] = [];
    let paramIndex = 1;

    if (validated.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex}`);
      values.push(validated.timezone);
      paramIndex++;
    }
    if (validated.business_hours !== undefined) {
      updates.push(`business_hours = $${paramIndex}`);
      values.push(JSON.stringify(validated.business_hours));
      paramIndex++;
    }

    values.push(tenantId);

    const res = await client.query(
      `UPDATE tenant_i18n_settings SET ${updates.join(', ')} WHERE tenant_id = $${paramIndex} RETURNING timezone, business_hours;`,
      values
    );

    return res.rows[0];
  });
}
