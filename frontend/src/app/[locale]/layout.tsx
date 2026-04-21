import { ReactNode } from 'react';
import { headers } from 'next/headers';
import LocalizationProvider from '@components/localization-provider/localization-provider';
import initLocalization from '../i18n';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

const namespaces = ['common', 'paths', 'layout'];

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;
  const { resources } = await initLocalization(locale, namespaces);

  return <LocalizationProvider {...{ locale, resources, namespaces }}>{children}</LocalizationProvider>;
};

export const generateMetadata = async ({ params }: LocaleLayoutProps) => {
  const { locale } = await params;
  const { t } = await initLocalization(locale, namespaces);
  const path = (await headers()).get('x-path');

  const title = path
    ? `Sundsvallsminnen - ${t(`paths:${path}.title`, { defaultValue: 'Sök i arkivet' })}`
    : 'Sundsvallsminnen';
  const description = t(`paths:${path}.description`, {
    defaultValue: 'Sök bland kulturhistoriskt material från Sundsvallsregionen',
  });

  return {
    title,
    description,
  };
};

export default LocaleLayout;
