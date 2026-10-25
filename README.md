# bulk-aura-feed

Weekly snapshot of BULK's public Aura leaderboard (active traders), used by the BULK copy-trader dashboard's Leaderboard tab. The dashboard pulls `aura-leaderboard.json` from this repo every hour.

BULK's Aura API sits behind a Vercel checkpoint that blocks server/datacenter IPs (VPS and GitHub Actions both fail), so a scheduled Devin session refreshes it every Saturday after Aura is distributed (~13:00 UTC):

```
npm install --no-save --no-package-lock playwright-core@1.47.2
CDP_URL=http://localhost:29229 node fetch.mjs   # needs a running Chrome with remote debugging
git add aura-leaderboard.json && git commit -m "Aura leaderboard $(date -u +%F)" && git push
```
