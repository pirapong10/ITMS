import { NextResponse } from 'next/server';
import { getSubscriptionPlans } from '@/src/lib/billing';

export async function GET() {
  try {
    const plans = await getSubscriptionPlans();
    return NextResponse.json({ plans }, { status: 200 });
  } catch (error: any) {
    console.error('List Plans Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
