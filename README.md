# Biometric gateway for BMS (Armenia migration service)

- `server/` — NestJS (ESM) JSON gateway over the BMS SOAP service. Contract: `server/wsdl/` (WSDL + XSDs).
- `client/` — React + Vite UI. In dev, `/api` is proxied to the server.

Requires Node >= 20.19 (`nvm use`; see `.nvmrc`).

## Run (with the mock BMS)
```sh
cd server && cp .env.example .env && npm install
npm run mock:bms                                   # mock SOAP service on :8099
BMS_ENDPOINT=http://127.0.0.1:8099/BMS_SystemIISHost/BMS_System.svc npm run start:dev
cd ../client && npm install && npm run dev         # http://localhost:5173
```
Mock special SSNs: `DUP` (duplicate id), `NOMATCH` (not verified), `FAULT` (SOAP fault), `SLOW` (timeout).

## Real BMS
Set `BMS_ENDPOINT` (default `https://bms.migration.am/BMS_SystemIISHost/BMS_System.svc`), and `BMS_DEFAULT_THRESHOLD`
(threshold range is not in the WSDL; ask the BMS operator) in `server/.env`.

## API (`/api/bms/...`, JSON, images as base64)
`GET info` · `POST face/{add,delete,verify,identify}` · `POST fingerprints/{add,delete,verify,identify}` · `POST fir`.
Business results (e.g. `UniqueRegistrationIDError`, `NotVerified`) return HTTP 200 with a `status`; SOAP faults -> 502, timeouts -> 504.

## Security
No authentication yet: the server binds to `127.0.0.1` only. Do not expose it without adding auth.

## Tests
`cd server && npm run test:e2e` (all 10 operations against the mock), `npm run lint`, `npm run build`.
