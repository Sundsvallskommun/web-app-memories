import { legacyRedirect } from '@utils/legacy-redirect';

const redirectFor = (address: string, locales: string[] = ['sv']) => {
  const url = new URL(address, 'https://sok.sundsvallsminnen.se');
  return legacyRedirect(url.pathname, url.searchParams, locales);
};

const targetOf = (address: string) => {
  const result = redirectFor(address);
  return result && `${result.pathname}${result.search}`;
};

describe('legacyRedirect, document pages', () => {
  it.each([
    ['/dokument/info?AID=4386&TES=Dtext', '/dokument/text-4386'],
    ['/dokument/info?AID=23094&TES=Dtextp', '/dokument/publ-23094'],
    ['/dokument/info?AID=14999&TES=Dimgp', '/dokument/publ-14999'],
    ['/dokument/info?AID=1301&TES=Dbio&VAL=jurpers', '/dokument/jurpers-1301'],
    ['/dokument/info?JID=23369&TYP=Publikationer', '/dokument/publ-23369'],
    ['/dokument/info?JID=100&TYP=text', '/dokument/text-100'],
    ['/dokument/info?JID=12&TYP=FILM', '/dokument/film-12'],
    ['/dokument/info?JID=7&TYP=LJUD', '/dokument/audio-7'],
    ['/dokument/info?JID=9260&TYP=F%C3%B6rem%C3%A5l', '/dokument/photo-9260'],
    ['/person/info?PER=person&JID=1&PID=50699', '/dokument/person-50699'],
  ])('sends %s to %s', (address, expected) => {
    expect(targetOf(address)).toBe(expected);
    expect(redirectFor(address)?.permanent).toBe(true);
  });

  it('reads the code when the whole address was pasted again after it', () => {
    expect(
      targetOf('/dokument/info?AID=14423&TES=Dtextphttp://sok.sundsvallsminnen.se/dokument/info?AID=14423&TES=Dtextp')
    ).toBe('/dokument/publ-14423');
  });

  it('ignores the case of parameter names and codes', () => {
    expect(targetOf('/Dokument/Info?aid=4386&tes=DTEXT')).toBe('/dokument/text-4386');
  });

  it('accepts a trailing slash', () => {
    expect(targetOf('/dokument/info/?AID=4386&TES=Dtext')).toBe('/dokument/text-4386');
  });
});

describe('legacyRedirect, addresses that cannot be mapped', () => {
  it.each([
    ['TYP=Dokument, which has other numbering', '/dokument/info?JID=4286&TYP=Dokument'],
    ['an unknown TES code', '/dokument/info?AID=1&TES=Dokand'],
    ['an unknown TYP code', '/dokument/info?JID=1&TYP=Karta'],
    ['Dbio without VAL=jurpers', '/dokument/info?AID=1301&TES=Dbio'],
    ['an id that is not a number', '/dokument/info?AID=abc&TES=Dtext'],
    ['a zero id', '/dokument/info?AID=0&TES=Dtext'],
    ['no parameters', '/dokument/info'],
    ['a person outside register 1', '/person/info?PER=person&JID=2&PID=50699'],
    ['a person without PID', '/person/info?PER=person&JID=1'],
  ])('sends %s to the start page, temporarily', (_, address) => {
    expect(redirectFor(address)).toEqual({ pathname: '/', search: '', permanent: false });
  });

  it('sends Dfilm, whose numbering is not verified, to a film search, temporarily', () => {
    expect(redirectFor('/dokument/info?AID=5&TES=Dfilm')).toEqual({
      pathname: '/',
      search: '?type=Film',
      permanent: false,
    });
  });

  it.each([
    '/arkiv/info?JID=3011&SORTERA=name',
    '/arkiv/serie?JID=3011&SORTERA=name',
    '/arkiv/volym?JID=3011&NODE=2&SORTERA=name',
    '/arkiv/results?ar1=&ar2=&arksam=vita&plats=&verkkat=&inst=&sort=startyear&page=1&order=asc&sok=S%C3%B6k',
  ])('sends the archive view %s to the start page, permanently', (address) => {
    expect(redirectFor(address)).toEqual({ pathname: '/', search: '', permanent: true });
  });
});

describe('legacyRedirect, searches', () => {
  it('carries free text, type and years over to the start page', () => {
    expect(
      targetOf(
        '/dokument/results?databas=Text&ar1=1918&ar2=1930&frisok=v%C3%A4der&plats=&upphovsman=&sortera=artal&page=1&order=asc&sok=S%C3%B6k'
      )
    ).toBe('/?q=v%C3%A4der&type=Text&from=1918&to=1930');
    expect(redirectFor('/dokument/results?databas=Text')?.permanent).toBe(true);
  });

  it.each([
    ['Publikationer', 'Publication'],
    ['Foto', 'Photo'],
    ['Film', 'Film'],
    ['Ljud', 'Audio'],
    ['F%C3%B6rem%C3%A5l', 'Object'],
  ])('maps databas=%s to type=%s', (database, type) => {
    expect(targetOf(`/dokument/results?databas=${database}`)).toBe(`/?type=${type}`);
  });

  it('takes the year from full dates', () => {
    expect(targetOf('/dokument/results?databas=Foto&ar1=1919-05-01&ar2=1919-12-31&frisok=flyg')).toBe(
      '/?q=flyg&type=Photo&from=1919&to=1919'
    );
  });

  it('drops empty fields, unknown databases and years out of range', () => {
    expect(targetOf('/dokument/results?databas=Okand&ar1=&ar2=0999&frisok=+skridsko+&plats=&upphovsman=')).toBe(
      '/?q=skridsko'
    );
  });

  it('keeps the creator', () => {
    expect(targetOf('/dokument/results?databas=Foto&upphovsman=Wallin')).toBe('/?type=Photo&creator=Wallin');
  });

  it('keeps only one year when the other is missing', () => {
    expect(targetOf('/dokument/results?databas=Publikationer&ar1=1934&ar2=&frisok=medelpads+kyrkor')).toBe(
      '/?q=medelpads+kyrkor&type=Publication&from=1934'
    );
  });

  it.each([
    ['/dokument/search', '/'],
    ['/person/search', '/?type=Person'],
    ['/jurpers/search', '/?type=LegalEntity'],
    ['/arkiv/search', '/'],
  ])('sends the search form %s to %s, permanently', (address, expected) => {
    expect(targetOf(address)).toBe(expected);
    expect(redirectFor(address)?.permanent).toBe(true);
  });
});

describe('legacyRedirect, locale and new addresses', () => {
  it('keeps a locale prefix', () => {
    expect(targetOf('/sv/dokument/info?AID=4386&TES=Dtext')).toBe('/sv/dokument/text-4386');
    expect(targetOf('/sv/person/search')).toBe('/sv?type=Person');
  });

  it('drops the default locale prefix, since that locale is served without one', () => {
    const url = new URL('https://sok.sundsvallsminnen.se/sv/dokument/info?AID=4386&TES=Dtext');
    expect(legacyRedirect(url.pathname, url.searchParams, ['sv', 'en'], 'sv')?.pathname).toBe('/dokument/text-4386');
    expect(legacyRedirect('/en/person/search', new URLSearchParams(), ['sv', 'en'], 'sv')?.pathname).toBe('/en');
  });

  it('does not treat an unknown first segment as a locale', () => {
    expect(redirectFor('/en/dokument/info?AID=4386&TES=Dtext')).toBeNull();
  });

  it.each(['/', '/sv', '/dokument/publ-24589', '/dokument/text-4386', '/om-webbplatsen', '/dokument/information'])(
    'leaves %s alone',
    (address) => {
      expect(redirectFor(address)).toBeNull();
    }
  );
});
