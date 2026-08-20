# TorBox Up

A tiny monitor for the TorBox API key you actually use. It checks `GET /v1/api/user/me` every two minutes and posts to [ntfy](https://ntfy.sh) only when the API state changes.

## Run with Docker

1. Copy `.env.example` to `.env` and set `TORBOX_API_KEY`. Optionally set an `NTFY_URL`; without it the monitor only logs.
2. Start it:

   ```sh
   docker compose up -d --build
   ```

3. Watch the first probe:

   ```sh
   docker compose logs -f
   ```

## States

- `healthy`: HTTP 2xx and `{ "success": true }`.
- `auth_failed`: HTTP 401/403, `BAD_TOKEN`, or `NO_AUTH`.
- `api_issue`: a malformed or otherwise unsuccessful API response.
- `connection_issue`: timeout or network failure.

The first alert is held until `FAILURES_BEFORE_ALERT` consecutive failed checks (default: 2). A single recovery notification is sent once the service becomes healthy again.

## Run without Docker

Node 22 or later has all required dependencies built in:

```sh
cp .env.example .env
set -a; source .env; set +a
npm start
```

Run tests with `npm test`.
