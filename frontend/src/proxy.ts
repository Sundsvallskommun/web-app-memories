import { NextRequest, NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from '@app/i18nConfig';
import { legacyRedirect } from '@utils/legacy-redirect';

export async function proxy(req: NextRequest) {
  const legacy = legacyRedirect(
    req.nextUrl.pathname,
    req.nextUrl.searchParams,
    i18nConfig.locales,
    i18nConfig.defaultLocale
  );
  if (legacy) {
    // Cloning nextUrl keeps the host and the base path.
    const url = req.nextUrl.clone();
    url.pathname = legacy.pathname;
    url.search = legacy.search;
    return NextResponse.redirect(url, legacy.permanent ? 308 : 307);
  }

  req.headers.set('x-path', req.nextUrl.pathname);
  return i18nRouter(req, i18nConfig);
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
