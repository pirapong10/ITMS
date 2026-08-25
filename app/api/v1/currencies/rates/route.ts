import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/src/lib/currency';

export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json({ rates }, { status: 200 });
  } catch (error: any) {
    console.error('Get Exchange Rates Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
