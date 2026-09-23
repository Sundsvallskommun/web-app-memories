'use client';

import { Button, Footer, Link, Logo } from '@sk-web-gui/react';
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Map as MapIcon, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** No agreed destination yet. Kept in one place so it is easy to find and fill. */
const PENDING = '#';

const ADDRESS = 'Norrmalmsgatan 4, 853 85 Sundsvall';
const EMAIL = 'kontakt@sundsvall.se';
const PHONE = '060-123 45 67';
const OPENING_HOURS = 'Mån–fre 09.00–16.00';

const ADDRESS_HREF = 'https://www.google.com/maps/search/?api=1&query=Norrmalmsgatan+4%2C+853+85+Sundsvall';
const EMAIL_HREF = `mailto:${EMAIL}`;
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
  { label: 'Om webbplatsen', href: PENDING, icon: ArrowRight },
  { label: 'Tillgänglighetsredogörelse', href: PENDING, icon: ArrowRight },
];

const DESKTOP_SECTIONS: FooterSection[] = [
  {
    heading: 'Kontakt',
    items: [
      { label: ADDRESS, href: ADDRESS_HREF, icon: MapPin },
      { label: EMAIL, href: EMAIL_HREF, icon: Mail },
      { label: PHONE, href: PHONE_HREF, icon: Smartphone },
      { label: OPENING_HOURS, prefix: 'Öppettider', icon: Clock },
      { label: 'Fler kontaktvägar och öppettider', href: PENDING, icon: ArrowRight },
    ],
  },
  { heading: 'Om innehållet', items: ABOUT_LINKS },
  {
    heading: 'Följ oss',
    items: [
      { label: 'Facebook', href: PENDING, icon: ArrowRight },
      { label: 'Instagram', href: PENDING, icon: ArrowRight },
      { label: 'LinkedIn', href: PENDING, icon: ArrowRight },
      { label: 'Youtube', href: PENDING, icon: ArrowRight },
    ],
  },
];

const MOBILE_CONTACT: ContactDetail[] = [
  { label: 'Telefon', value: PHONE, href: PHONE_HREF },
  { label: 'E-postadress', value: EMAIL, href: EMAIL_HREF },
  { label: 'Besöksadress', value: ADDRESS, href: ADDRESS_HREF },
  { label: 'Öppettider', value: OPENING_HOURS },
];

const ActionButtons: React.FC = () => (
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
      Resa hit
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
      Kontakta oss
    </Button.Component>
  </div>
);

const linkOrText = (text: string, href?: string) =>
  href ?
    <Link variant="tertiary" inverted href={href} className={TEXT_CLASS}>
      {text}
    </Link>
  : <span className={TEXT_CLASS}>{text}</span>;

export const AppFooter: React.FC = () => (
  <Footer className="px-20 py-48 bg-inverted-background-200 lg:px-24 lg:pb-80 lg:pt-64" data-cy="app-footer">
    {/* Mobile frame */}
    <div className="flex w-full flex-col gap-48 lg:hidden" data-cy="app-footer-mobile">
      <ActionButtons />

      <section className="flex flex-col gap-16">
        <h2 className={HEADING_CLASS}>Kontakt</h2>
        <dl className="m-0 flex flex-col gap-12">
          {MOBILE_CONTACT.map((detail) => (
            <div key={detail.label} className="flex items-start gap-8">
              <dt className="shrink-0 py-2 font-header text-[16px] font-bold leading-[24px] text-inverted-dark-primary">
                {detail.label}
              </dt>
              <dd className="m-0">{linkOrText(detail.value, detail.href)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-16">
        <h2 className={HEADING_CLASS}>Om innehållet</h2>
        <ul className="m-0 flex list-none flex-col gap-12 p-0">
          {ABOUT_LINKS.map((item) => (
            <li key={item.label} className="flex">
              {linkOrText(item.label, item.href)}
            </li>
          ))}
        </ul>
      </section>
    </div>

    {/* Desktop frame */}
    <div className="mx-auto hidden w-full max-w-content flex-col gap-48 lg:flex" data-cy="app-footer-desktop">
      <div className="flex flex-row items-center justify-between gap-24">
        <Logo
          variant="service"
          title="Sundsvallsminnen"
          inverted
          className="[&_.sk-logo-figure]:!h-48 [&_.sk-logo-figure]:!w-[28.67px]"
        />

        <ActionButtons />
      </div>

      <div className="grid grid-cols-3 gap-24">
        {DESKTOP_SECTIONS.map((section) => (
          <section key={section.heading} className="flex flex-col gap-16">
            <h2 className={HEADING_CLASS}>{section.heading}</h2>

            <ul className="m-0 flex list-none flex-col gap-12 p-0">
              {section.items.map((item) => {
                const Icon = item.icon;
                const text = item.prefix ? `${item.prefix}: ${item.label}` : item.label;

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

export default AppFooter;
