# Party Seating — serverless API deploy

The interactive UI on GitHub Pages calls a Vercel serverless API for live optimization.

## One-time setup

1. Sign in at [vercel.com](https://vercel.com) and import the `zehaog2.github.io` repository.
2. Deploy with the root [`vercel.json`](../vercel.json) (no build command required).
3. Copy the deployment URL (e.g. `https://zehaog2-party-seating.vercel.app`).
4. Set that URL in one of:
   - [`Party_Seating/config.js`](config.js) — copy from [`config.example.js`](config.example.js)
   - or the `PRODUCTION_API` constant in [`party_seating.html`](party_seating.html)
5. Push to GitHub. Pages serves the static UI; Vercel serves `/api/*`.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `SOLVER_MAX_SECONDS` | `10` in `vercel.json` | CP-SAT time cap (keep below Vercel function timeout) |

On Vercel Pro you can raise `maxDuration` in `vercel.json` and `SOLVER_MAX_SECONDS` for larger instances (up to 300 guests).

## Verify

```sh
curl -s "https://YOUR-VERCEL-PROJECT.vercel.app/api/config"
curl -s -X POST "https://YOUR-VERCEL-PROJECT.vercel.app/api/run" \
  -H 'Content-Type: application/json' \
  -d '{"N":35,"N_TABLES":5,"CAP":9,"W_FOOD":50,"W_CONF":50}'
curl -s -X POST "https://YOUR-VERCEL-PROJECT.vercel.app/api/run" \
  -H 'Content-Type: application/json' \
  -d '{"N":301,"N_TABLES":5,"CAP":9}'  # expect 400, N must be ≤ 300
```

## Local development

```sh
cd Party_Seating
pip install ortools
python3 server.py   # http://127.0.0.1:8765/party_seating.html
```

The UI tries `localhost:8765` first, then falls back to the production Vercel URL.
