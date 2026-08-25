import { z } from 'zod';
import { query } from './db';

export const SupportedCurrencies = ['USD', 'THB', 'EUR', 'JPY', 'SGD', 'GBP'] as const;
export type CurrencyCode = (typeof SupportedCurrencies)[number];

export const ConvertCurrencySchema = z.object({
  amount: z.number().min(0),
  from_currency: z.enum(['USD', 'THB', 'EUR', 'JPY', 'SGD', 'GBP']),
  to_currency: z.enum(['USD', 'THB', 'EUR', 'JPY', 'SGD', 'GBP']),
});

export type ConvertCurrencyInput = z.input<typeof ConvertCurrencySchema>;

export interface ExchangeRateItem {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  updated_at: string;
}

/**
 * Returns all active exchange rates from database.
 */
export async function getExchangeRates(): Promise<ExchangeRateItem[]> {
  const res = await query(`SELECT * FROM exchange_rates ORDER BY base_currency, target_currency`);
  return res.rows.map((row: any) => ({
    id: row.id,
    base_currency: row.base_currency,
    target_currency: row.target_currency,
    rate: Number(row.rate),
    updated_at: row.updated_at,
  }));
}

/**
 * Converts an amount from one currency to another using stored exchange rates.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
}> {
  if (from === to) {
    return {
      fromAmount: amount,
      fromCurrency: from,
      toAmount: amount,
      toCurrency: to,
      rate: 1.0,
    };
  }

  const rates = await getExchangeRates();
  const rateMap = new Map<string, number>();
  for (const r of rates) {
    rateMap.set(`${r.base_currency}_${r.target_currency}`, r.rate);
  }

  let rate: number | undefined;

  // 1. Direct rate
  if (rateMap.has(`${from}_${to}`)) {
    rate = rateMap.get(`${from}_${to}`);
  }
  // 2. Inverted direct rate
  else if (rateMap.has(`${to}_${from}`)) {
    const inv = rateMap.get(`${to}_${from}`)!;
    rate = 1 / inv;
  }
  // 3. Cross-rate via USD
  else {
    const fromToUsd = from === 'USD' ? 1 : (rateMap.get(`${from}_USD`) || (rateMap.has(`USD_${from}`) ? 1 / rateMap.get(`USD_${from}`)! : undefined));
    const usdToTarget = to === 'USD' ? 1 : (rateMap.get(`USD_${to}`) || (rateMap.has(`${to}_USD`) ? 1 / rateMap.get(`${to}_USD`)! : undefined));

    if (fromToUsd !== undefined && usdToTarget !== undefined) {
      rate = fromToUsd * usdToTarget;
    }
  }

  if (rate === undefined) {
    throw new Error(`Exchange rate not available for ${from} to ${to}`);
  }

  const toAmount = Math.round(amount * rate * 100) / 100;

  return {
    fromAmount: amount,
    fromCurrency: from,
    toAmount,
    toCurrency: to,
    rate: Math.round(rate * 1000000) / 1000000,
  };
}

/**
 * Formats currency amount with appropriate symbols and formatting.
 */
export function formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    THB: '฿',
    EUR: '€',
    JPY: '¥',
    GBP: '£',
    SGD: 'S$',
  };

  const symbol = currencySymbols[currency] || `${currency} `;
  const formattedNumber = amount.toLocaleString(locale, {
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  });

  return `${symbol}${formattedNumber}`;
}
