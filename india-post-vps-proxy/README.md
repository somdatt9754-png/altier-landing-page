# India Post VPS Proxy

This small service is intended to run on the existing Hostinger VPS so India Post sees the VPS public/static IP instead of a Supabase Edge Function egress IP.

Flow:

`Supabase Edge Function -> Hostinger VPS -> https://test.cept.gov.in`

The proxy does not store India Post credentials and does not log request bodies or authorization headers.

## VPS setup

```bash
cd /path/to/india-post-vps-proxy
npm install --omit=dev
export PORT=8080
export PROXY_SHARED_SECRET='SET_A_LONG_RANDOM_SECRET_HERE'
npm start
```

Put the service behind the VPS's existing HTTPS/reverse-proxy setup and expose only the `/health` and `/proxy` routes. Do not expose port 8080 directly to the public internet if the VPS already has a reverse proxy/firewall.

## Proxy request

POST `/proxy` with header `X-India-Post-Proxy-Key` and JSON like:

```json
{
  "method": "POST",
  "path": "/beextcustomer/v1/access/login",
  "headers": { "accept": "application/json" },
  "body": { "username": "...", "password": "..." }
}
```

Only `/beextcustomer/...` paths are allowed. The upstream host is fixed to `https://test.cept.gov.in`.

## Supabase secrets

After the VPS HTTPS endpoint is live, configure these Supabase Edge Function secrets for `india-post-booking`:

- `INDIA_POST_PROXY_URL` = the HTTPS URL ending in `/proxy`
- `INDIA_POST_PROXY_SECRET` = exactly the same value as `PROXY_SHARED_SECRET`

Existing `INDIA_POST_CUSTOMER_ID` and `INDIA_POST_PASSWORD` remain in Supabase secrets.
