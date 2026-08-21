# tb-up

A small monitor for your TorBox and Premiumize API keys. It checks each enabled service every two minutes and posts to [ntfy](https://ntfy.sh) only when a service changes state.

## Run with Docker

1. Copy `.env.example` to `.env` and set `TORBOX_API_KEY`. Add `PREMIUMIZE_API_KEY` to enable Premiumize monitoring. Optionally set an `NTFY_URL`; without it the monitor only logs.
2. Start it:

   ```sh
   docker compose up -d
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

TorBox uses `GET /v1/api/user/me` and requires HTTP 2xx plus `success: true`. Premiumize uses `GET /api/account/info` and requires JSON `status: "success"`; the API key is sent in a Bearer authorization header as Premiumize recommends. [Premiumize API documentation](https://www.premiumize.me/api)

The first alert is held until `FAILURES_BEFORE_ALERT` consecutive failed checks (default: 2). All failed states are treated as one outage, so a single outage notification is sent until the service becomes healthy again. A recovery notification waits for `SUCCESSES_BEFORE_RECOVERY` consecutive healthy checks (default: 2).

Each ntfy alert includes a local timestamp in the notification body. Set `TIME_ZONE` to an IANA time zone such as `America/Chicago` in `.env`; it defaults to `UTC`.

## Run without Docker

Node 22 or later has all required dependencies built in:

```sh
cp .env.example .env
set -a; source .env; set +a
npm start
```

Run tests with `npm test`.

## Updates from GHCR

Each push to the deployment branch publishes a multi-architecture image to GitHub Container Registry:

- `ghcr.io/thetoadsage/tb-up:stable`
- `ghcr.io/thetoadsage/tb-up:sha-<commit>`

To update a server to the latest tested image:

```sh
docker compose pull
docker compose up -d
```

The GHCR package must be public for anonymous pulls. After the first image publishes, open the package settings on GitHub and set its visibility to public. If you keep it private, log in to `ghcr.io` on the server with a GitHub token that has `read:packages` permission before running `docker compose pull`.
