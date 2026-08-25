import { NextResponse } from 'next/server';
import {
  convertCurrency,
  ConvertCurrencySchema,
} from '@/src/lib/currency';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ConvertCurrencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const conversion = await convertCurrency(
      parsed.data.amount,
      parsed.data.from_currency,
      parsed.data.to_currency
    );

    return NextResponse.json(conversion, { status: 200 });
  } catch (error: any) {
    console.error('Convert Currency Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
