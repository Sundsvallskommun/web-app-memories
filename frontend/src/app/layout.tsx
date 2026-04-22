import '@styles/tailwind.scss';
import { ReactNode } from 'react';
import AppLayout from '@layouts/app/app-layout.component';
import i18nConfig from './i18nConfig';

// Root layout has no `[locale]` segment — the locale lives in `[locale]/layout.tsx`
// one level down. Next 15 types the root's `params` as `Promise<{}>` and typecheck
// fails if we try to declare `{ locale: string }` here. Use the default locale for
// the `<html lang>` attribute; the locale layout further in the tree swaps in the
// right i18n resources per request.

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang={i18nConfig.defaultLocale}>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
};

export default RootLayout;
