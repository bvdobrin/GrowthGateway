# GrowthGateway

Comms & Growth digital asset management middleware MVP.

Live web application here: https://growthgateway-production.up.railway.app

## Prerequisites

- [Node.js](https://nodejs.org/) 20.9.0 or newer
- npm (comes with Node.js)

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

`npm run dev` builds design tokens first, then starts the Vite dev server. A `.env` file is optional: without one, the AI assistant uses the in-browser mock (`VITE_GLEAN_MODE=mock`).

## Environment

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_GLEAN_MODE` | `mock` | `mock` uses the in-browser assistant. `proxy` sends chat requests to `VITE_GLEAN_PROXY_URL`. |
| `VITE_GLEAN_PROXY_URL` | `/api/glean/chat` | Used only when `VITE_GLEAN_MODE=proxy`. The proxy holds Glean credentials; the browser does not. |

Restart the dev server after changing `.env`.

## Other commands

```bash
npm run build      # typecheck and production build
npm run preview    # serve the production build locally
npm test           # run the test suite once
npm run typecheck  # typecheck only
```
