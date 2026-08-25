import { NextResponse } from 'next/server';
import {
  convertTimestamp,
  ConvertTimezoneSchema,
} from '@/src/lib/timezone';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ConvertTimezoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = convertTimestamp(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Convert Timezone Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
