import { NextResponse } from 'next/server';
import { getSupportedTimezonesList } from '@/src/lib/timezone';

export async function GET() {
  try {
    const timezones = getSupportedTimezonesList();
    return NextResponse.json({ timezones }, { status: 200 });
  } catch (error: any) {
    console.error('List Timezones Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
