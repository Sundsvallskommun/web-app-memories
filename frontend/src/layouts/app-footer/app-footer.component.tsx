'use client';

import { Footer, Link, Logo } from '@sk-web-gui/react';
import { ArrowRight, Clock, Mail, MapPin, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const INSTAGRAM = 'https://www.instagram.com/sundsvallsminnen.se/';

const ADDRESS = 'Medelpadsarkiv, Kulturmagasinet, Packhusgatan 4, 852 31 Sundsvall';
const EMAIL = 'sundsvallsminnen@sundsvall.se';
const PHONE = '060–19 18 75';
const OPENING_HOURS = 'Tis–tor 12.00–16.00';

const ADDRESS_HREF = 'https://www.google.com/maps/search/?api=1&query=Packhusgatan+4%2C+852+31+Sundsvall';
const EMAIL_HREF = `mailto:${EMAIL}`;
const PHONE_HREF = 'tel:+4660191875';
const MORE_CONTACTS_HREF =
  'https://sundsvall.se/kommun/uppleva-och-gora/kultur/kulturmagasinet/medelpadsarkiv/besok-medelpadsarkiv/oppettider';
const OM_WEBSITE = 'https://sundsvallsminnen.se/om-sundsvallsminnen/';

const TEXT_CLASS = 'font-header font-medium py-2 !text-primitives-overlay-lighten-8';

const BODY_CLASS = 'm-0 font-header font-medium text-primitives-overlay-lighten-8';

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
  text?: string;
  items: FooterItem[];
}

interface ContactDetail {
  label: string;
  value: string;
  href?: string;
}

const ABOUT_TEXT =
  'Sundsvallsminnen är en portal för Sundsvallsområdets lokalhistoria. Här kan du söka information och källmaterial om människor, miljöer, händelser och företeelser i det historiska Sundsvallsområdet.';

const FOLLOW_TEXT =
  'På Instagram delar vi bilder och berättelser ur samlingarna, och tipsar om nytt material i portalen.';

const ABOUT_LINKS: FooterItem[] = [{ label: 'Om webbplatsen', href: OM_WEBSITE, icon: ArrowRight }];

const DESKTOP_SECTIONS: FooterSection[] = [
  {
    heading: 'Kontakt',
    items: [
      { label: ADDRESS, href: ADDRESS_HREF, icon: MapPin },
      { label: EMAIL, href: EMAIL_HREF, icon: Mail },
      { label: PHONE, href: PHONE_HREF, icon: Smartphone },
      { label: OPENING_HOURS, prefix: 'Öppettider', icon: Clock },
      { label: 'Fler kontaktvägar och öppettider', href: MORE_CONTACTS_HREF, icon: ArrowRight },
    ],
  },
  { heading: 'Om innehållet', text: ABOUT_TEXT, items: ABOUT_LINKS },
  {
    heading: 'Följ oss',
    text: FOLLOW_TEXT,
    items: [{ label: 'Instagram', href: INSTAGRAM, icon: ArrowRight }],
  },
];

const MOBILE_CONTACT: ContactDetail[] = [
  { label: 'Telefon', value: PHONE, href: PHONE_HREF },
  { label: 'E-postadress', value: EMAIL, href: EMAIL_HREF },
  { label: 'Besöksadress', value: ADDRESS, href: ADDRESS_HREF },
  { label: 'Öppettider', value: OPENING_HOURS },
];

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
        <ul className="m-0 flex list-none flex-col gap-12 p-0">
          <li className="flex">{linkOrText('Fler kontaktvägar och öppettider', MORE_CONTACTS_HREF)}</li>
        </ul>
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

      <section className="flex flex-col gap-16">
        <h2 className={HEADING_CLASS}>Följ oss</h2>
        <ul className="m-0 flex list-none flex-col gap-12 p-0">
          <li className="flex">{linkOrText('Instagram', INSTAGRAM)}</li>
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
      </div>

      <div className="grid grid-cols-3 gap-48">
        {DESKTOP_SECTIONS.map((section) => (
          <section key={section.heading} className="flex flex-col gap-16">
            <h2 className={HEADING_CLASS}>{section.heading}</h2>

            {section.text && <p className={BODY_CLASS}>{section.text}</p>}

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
