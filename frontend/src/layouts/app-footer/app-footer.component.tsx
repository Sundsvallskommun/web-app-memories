'use client';

import { Button, Footer, Link, Logo } from '@sk-web-gui/react';
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Map as MapIcon, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** No agreed destination yet. Kept in one place so it is easy to find and fill. */
const PENDING = '#';

const ADDRESS_HREF = 'https://www.google.com/maps/search/?api=1&query=Norrmalmsgatan+4%2C+853+85+Sundsvall';
const EMAIL_HREF = 'mailto:kontakt@sundsvall.se';
const PHONE_HREF = 'tel:+46601234567';

const BUTTON_CLASS =
  'font-header h-44 max-h-44 py-10 pl-16 pr-18 !border-primitives-overlay-lighten-7 !text-primitives-overlay-lighten-8';

const TEXT_CLASS = 'font-header font-medium py-2 !text-primitives-overlay-lighten-8';

const HEADING_CLASS =
  'font-header text-[18px] font-extrabold leading-[28px] text-inverted-dark-primary lg:text-[22px] lg:leading-[32px]';

interface FooterItem {
  label: string;
  prefix?: string;
  href?: string;
  icon: LucideIcon;
}

interface FooterSection {
  heading: string;
  items: FooterItem[];
}

interface ContactDetail {
  label: string;
  value: string;
  href?: string;
}

const ABOUT_LINKS: FooterItem[] = [
  { label: 'footer.about.site', href: PENDING, icon: ArrowRight },
  { label: 'footer.about.accessibility', href: PENDING, icon: ArrowRight },
  { label: 'footer.about.personal_data', href: PENDING, icon: ArrowRight },
  { label: 'footer.about.cookies', href: '/kakor', icon: ArrowRight },
];

const DESKTOP_SECTIONS: FooterSection[] = [
  {
    heading: 'footer.contact.heading',
    items: [
      { label: 'footer.contact.address', href: ADDRESS_HREF, icon: MapPin },
      { label: 'footer.contact.email', href: EMAIL_HREF, icon: Mail },
      { label: 'footer.contact.phone', href: PHONE_HREF, icon: Smartphone },
      { label: 'footer.contact.opening_hours', prefix: 'footer.contact.opening_hours_label', icon: Clock },
      { label: 'footer.contact.more', href: PENDING, icon: ArrowRight },
    ],
  },
  { heading: 'footer.about.heading', items: ABOUT_LINKS },
  {
    heading: 'footer.social.heading',
    items: [
      { label: 'footer.social.facebook', href: PENDING, icon: ArrowRight },
      { label: 'footer.social.instagram', href: PENDING, icon: ArrowRight },
      { label: 'footer.social.linkedin', href: PENDING, icon: ArrowRight },
      { label: 'footer.social.youtube', href: PENDING, icon: ArrowRight },
    ],
  },
];

const MOBILE_CONTACT: ContactDetail[] = [
  { label: 'footer.contact.phone_label', value: 'footer.contact.phone', href: PHONE_HREF },
  { label: 'footer.contact.email_label', value: 'footer.contact.email', href: EMAIL_HREF },
  { label: 'footer.contact.address_label', value: 'footer.contact.address', href: ADDRESS_HREF },
  { label: 'footer.contact.opening_hours_label', value: 'footer.contact.opening_hours' },
];

export const AppFooter: React.FC = () => {
  const { t } = useTranslation();

  const linkOrText = (text: string, href?: string) =>
    href ?
      <Link variant="tertiary" inverted href={href} className={TEXT_CLASS}>
        {text}
      </Link>
    : <span className={TEXT_CLASS}>{text}</span>;

  return (
    <Footer className="px-20 py-48 bg-inverted-background-200 lg:px-40 lg:pb-80 lg:pt-64" data-cy="app-footer">
      {/* Mobile frame */}
      <div className="flex w-full flex-col gap-48 lg:hidden" data-cy="app-footer-mobile">
        <section className="flex flex-col gap-16">
          <h2 className={HEADING_CLASS}>{t('layout:footer.contact.heading')}</h2>
          <dl className="m-0 flex flex-col gap-12">
            {MOBILE_CONTACT.map((detail) => (
              <div key={detail.label} className="flex items-start gap-8">
                <dt className="shrink-0 py-2 font-header text-[16px] font-bold leading-[24px] text-inverted-dark-primary">
                  {t(`layout:${detail.label}`)}
                </dt>
                <dd className="m-0">{linkOrText(t(`layout:${detail.value}`), detail.href)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-16">
          <h2 className={HEADING_CLASS}>{t('layout:footer.about.heading')}</h2>
          <ul className="m-0 flex list-none flex-col gap-12 p-0">
            {ABOUT_LINKS.map((item) => (
              <li key={item.label} className="flex">
                {linkOrText(t(`layout:${item.label}`), item.href)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Desktop frame */}
      <div className="mx-auto hidden w-full max-w-[1280px] flex-col gap-48 lg:flex" data-cy="app-footer-desktop">
        <div className="flex flex-row items-center justify-between gap-24">
          <Logo
            variant="service"
            title={t('layout:footer.title')}
            inverted
            className="[&_.sk-logo-figure]:!h-48 [&_.sk-logo-figure]:!w-[28.67px]"
          />

          <div className="flex flex-wrap gap-12">
            <Button.Component
              as="a"
              href={PENDING}
              variant="secondary"
              rounded
              inverted
              leftIcon={<MapIcon size={18} />}
              className={BUTTON_CLASS}
            >
              {t('layout:footer.directions')}
            </Button.Component>
            <Button.Component
              as="a"
              href={PENDING}
              variant="secondary"
              rounded
              inverted
              leftIcon={<MessageCircle size={18} />}
              className={BUTTON_CLASS}
            >
              {t('layout:footer.contact_us')}
            </Button.Component>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-24">
          {DESKTOP_SECTIONS.map((section) => (
            <section key={section.heading} className="flex flex-col gap-16">
              <h2 className={HEADING_CLASS}>{t(`layout:${section.heading}`)}</h2>

              <ul className="m-0 flex list-none flex-col gap-12 p-0">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const label = t(`layout:${item.label}`);
                  const prefix = item.prefix ? t(`layout:${item.prefix}`) : undefined;
                  const text = prefix ? `${prefix}: ${label}` : label;

                  return (
                    <li key={item.label} className="flex items-center gap-8">
                      <span className="flex shrink-0 p-2 text-primitives-overlay-lighten-8" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      {linkOrText(text, item.href)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;
