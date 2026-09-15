'use client';

import { Header, Link } from '@sk-web-gui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AppFooter } from '@layouts/app-footer/app-footer.component';

interface DefaultLayoutProps {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: Readonly<DefaultLayoutProps>) {
  const router = useRouter();
  const { t } = useTranslation();

  const setFocusToMain = () => {
    const contentElement = document.getElementById('content');
    contentElement?.focus();
  };

  const handleLogoClick = () => {
    router.push('/');
  };

  const title = process.env.NEXT_PUBLIC_APP_NAME;
  const subtitle = 'Sök i arkivets databas';

  return (
    <div className="DefaultLayout full-page-layout">
      <Link
        as={NextLink}
        href="#content"
        onClick={setFocusToMain}
        accessKey="s"
        className="next-link-a"
        data-cy="systemMessage-a"
      >
        {t('layout:header.goto_content')}
      </Link>

      <Header
        data-cy="nav-header"
        title={title}
        subtitle={subtitle}
        aria-label={`${title} ${subtitle}`}
        logoLinkOnClick={handleLogoClick}
      />

      <div className={`main-container flex-grow relative w-full flex flex-col`}>
        <div className="main-content-padding">{children}</div>
      </div>

      <AppFooter />
    </div>
  );
}
