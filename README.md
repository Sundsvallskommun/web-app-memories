# Sundsvallsminnen

Webbgränssnitt för sökning i Sundsvalls minnes-arkiv — filmer, publikationer, fotografier, föremål och ljud.

## APIer som används

| API      | Version |
| -------- | ------: |
| Memories |     3.2 |

Applikationsanvändaren i WSO2 måste prenumerera på detta API.

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn 1.22.22

### Steg för steg

1. Klona ner repot.

```
git clone https://github.com/Sundsvallskommun/web-app-sundsvallsminnen.git
```

2. Installera dependencies för både `backend` och `frontend`

```
cd frontend
yarn install

cd backend
yarn install
```

3. Skapa .env-fil för `frontend`

```
cd frontend
cp .env-example .env
```

Redigera `.env` för behov, för utveckling bör exempelvärdet fungera.

4. Skapa .env-fil för `backend`

```
cd backend
cp .env.example .env.development.local
```

Redigera `.env.development.local` för behov. URLer och nycklar behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att Memories-API:t ska fungera, du måste ha en applikation från WSO2-portalen.
- `API_BASE_URL` pekar ut WSO2-gateway för Memories.

5. Starta backend och frontend i var sin terminal

```
cd backend
yarn dev

cd frontend
yarn dev
```

Frontend körs på `http://localhost:3000`, backend (BFF) på `http://localhost:3001`.

## Arkitektur

- **`frontend/`** — Next.js 15 App Router, TypeScript, @sk-web-gui/react 3.x
- **`backend/`** — Express BFF som proxyar och cachar anrop mot Memories-API:t (v3.1). Cache är in-memory med 30 min TTL per källa × sökfråga.

## Synka datamodeller

Memories-API:t exponerar en OpenAPI-spec. Om kontrakten ändras behöver datatyperna i `backend/src/controllers/document.mapper.ts` och `frontend/src/data-contracts/document.ts` justeras manuellt — det finns ingen kodgenerering i projektet just nu.
