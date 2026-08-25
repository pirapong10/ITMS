import { NextResponse } from 'next/server';
import { dictionaries, resolveLocale } from '@/src/lib/i18n';

export async function GET(req: Request) {
  try {
    const locale = resolveLocale(req);
    const dictionary = dictionaries[locale] || dictionaries['en'];

    return NextResponse.json(
      {
        locale,
        supportedLocales: Object.keys(dictionaries),
        translations: dictionary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get Translations Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
