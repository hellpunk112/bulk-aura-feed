# bulk-aura-feed

Weekly snapshot of BULK's public Aura leaderboard (active traders), used by the BULK copy-trader dashboard's Leaderboard tab.

A GitHub Action runs every Saturday at 13:30 and 15:00 UTC (after Aura is distributed), fetches the leaderboard with a real Chrome, and commits `aura-leaderboard.json` when it changes. Run it manually from the Actions tab with "Run workflow".
