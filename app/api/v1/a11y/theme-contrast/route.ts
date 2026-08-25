import { NextResponse } from 'next/server';
import { calculateContrastRatio } from '@/src/lib/a11y';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fg = searchParams.get('fg') || '#000000';
    const bg = searchParams.get('bg') || '#ffffff';

    const result = calculateContrastRatio(fg, bg);

    return NextResponse.json({
      foreground: fg,
      background: bg,
      ...result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Contrast Check Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
