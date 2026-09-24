'use client';

import { Footer, Link, Logo } from '@sk-web-gui/react';
import { ArrowRight, Clock, Mail, MapPin, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const INSTAGRAM = 'https://www.instagram.com/sundsvallsminnen.se/';

const ADDRESS = 'Medelpadsarkiv, Kulturmagasinet, Packhusgatan 4, 852 31 Sundsvall';
const EMAIL = 'sundsvallsminnen@sundsvall.se';
const PHONE = '060–19 18 75';
const OPENING_HOURS = 'Tis–tor 12.00–16.00';

const ADDRESS_HREF = 'https://www.google.com/maps/search/?api=1&query=Packhusgatan+4%20+Sundsvall';
const EMAIL_HREF = `mailto:${EMAIL}`;
const PHONE_HREF = 'tel:+4660191875';
const MORE_CONTACTS_HREF =
  'https://sundsvall.se/kommun/uppleva-och-gora/kultur/kulturmagasinet/medelpadsarkiv/besok-medelpadsarkiv/oppettider';
const OM_WEBSITE = '/about';

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

const ABOUT_TEXT =
  'Sundsvallsminnen är en portal för Sundsvallsområdets lokalhistoria. Här kan du söka information och källmaterial om människor, miljöer, händelser och företeelser i det historiska Sundsvallsområdet.';

const FOLLOW_TEXT =
  'På Instagram delar vi bilder och berättelser ur samlingarna, och tipsar om nytt material i portalen.';

const ABOUT_LINKS: FooterItem[] = [{ label: 'Om webbplatsen', href: OM_WEBSITE, icon: ArrowRight }];

/** Both frames show the same sections. Only the layout and the texts differ. */
const SECTIONS: FooterSection[] = [
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

const linkOrText = (text: string, href?: string) =>
  href ?
    <Link variant="tertiary" inverted href={href} className={TEXT_CLASS}>
      {text}
    </Link>
  : <span className={TEXT_CLASS}>{text}</span>;

/** The texts are for the desktop columns, which would otherwise look bare. */
const Section: React.FC<{ section: FooterSection; withText?: boolean }> = ({ section, withText }) => (
  <section className="flex flex-col gap-16">
    <h2 className={HEADING_CLASS}>{section.heading}</h2>

    {withText && section.text && <p className={BODY_CLASS}>{section.text}</p>}

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
);

export const AppFooter: React.FC = () => (
  <Footer className="px-20 py-48 bg-inverted-background-200 lg:px-24 lg:pb-80 lg:pt-64" data-cy="app-footer">
    {/* Mobile frame */}
    <div className="flex w-full flex-col gap-48 lg:hidden" data-cy="app-footer-mobile">
      {SECTIONS.map((section) => (
        <Section key={section.heading} section={section} />
      ))}
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

      {/* One gap for every column, so the three read as equal parts. */}
      <div className="grid grid-cols-3 gap-48">
        {SECTIONS.map((section) => (
          <Section key={section.heading} section={section} withText />
        ))}
      </div>
    </div>
  </Footer>
);

export default AppFooter;
