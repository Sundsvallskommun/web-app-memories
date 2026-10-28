'use client';

import NextLink from 'next/link';
import { Breadcrumb, Link } from '@sk-web-gui/react';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';

const READ_MORE = [
  { label: 'Slutrapport från projektet 2003-2005', href: '/dokument/text-3447' },
  {
    label: 'Vårt dokumentära kulturarv – idéer i anslutning till projektet Sundsvallsminnen – artikel',
    href: '/dokument/publ-13885',
  },
];

const AboutPage: React.FC = () => (
  <DefaultLayout>
    <Main>
      <div className="flex flex-col gap-24 py-24">
        <Breadcrumb>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Sökning</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item currentPage>
            <Breadcrumb.Link>Om webbplatsen</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb>

        <article className="flex flex-col gap-16" data-cy="about-content">
          <h1 className="font-header text-h2-md">Om Sundsvallsminnen</h1>

          <p className="m-0">
            I Sundsvallsminnen kan du söka information och källmaterial om det historiska Sundsvallsområdet. Du kan söka
            bland de ämnen som intresserar dig genom att navigera i olika teman. Genom att söka på webbplatsen och i
            databasen kan du finna mer information om människor, företag och föreningar. Här hittar du även dokument i
            form av texter, bilder och registeruppgifter.
          </p>

          <p className="m-0">
            De huvudsakliga källorna till Sundsvallsminnen är Sundsvalls kommunarkiv, Föreningsarkivet Västernorrland,
            Sundsvalls museum, Demografiska databasen vid Umeå universitet, SCA Merlo arkiv och Sundsvalls Tidning.
          </p>

          <p className="m-0">
            Sundsvallsminnen ägs och drivs av Sundsvalls kommun. Portalen utvecklades åren 2000-2005 främst med stöd av
            EU och Mål-1-medel inom landstingets ramprogram ”Industrisamhällets kulturarv” (ISKA), men även med stöd av
            näringslivet och Demografiska Databasen vid Umeå universitet.
          </p>

          <p className="m-0">
            Det är vår förhoppning att Sundsvallsminnen ska bli en resurs för vår region – inte bara för oss som verkar
            här utan för alla som är intresserade av områdets historia.
          </p>

          <h2 className="mt-8 font-header text-h4-md">Läs mer</h2>

          <ul className="m-0 flex list-none flex-col gap-8 p-0">
            {READ_MORE.map((item) => (
              <li key={item.href} className="flex">
                <Link as={NextLink} href={item.href} data-cy="about-read-more">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </Main>
  </DefaultLayout>
);

export default AboutPage;
