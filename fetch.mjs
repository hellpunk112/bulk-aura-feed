// Saves BULK's Aura leaderboard (active traders) to aura-leaderboard.json.
// app.bulk.trade sits behind a Vercel bot checkpoint that blocks datacenter IPs (incl. GitHub Actions),
// so this drives an already-running Chrome over CDP: CDP_URL=http://localhost:29229 node fetch.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = 'aura-leaderboard.json';
const cdp = process.env.CDP_URL;
const browser = cdp ? await chromium.connectOverCDP(cdp) : await chromium.launch({ channel: 'chrome', headless: false, args: ['--headless=new', '--no-sandbox'] });
let page;
try {
  const ctx = cdp ? browser.contexts()[0] : await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  page = await ctx.newPage();
  const base = 'https://app.bulk.trade/api/aura/v1/aura/leaderboard?page_size=100&sort_by=aura&sort_direction=desc';
  await page.goto(`${base}&page=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) {
    ok = await page.evaluate(() => document.body?.innerText?.trim().startsWith('{')).catch(() => false);
    if (!ok) await page.waitForTimeout(1500);
  }
  if (!ok) {
    const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    throw new Error(`Vercel checkpoint did not clear: ${text.replace(/\s+/g, ' ').slice(0, 200)}`);
  }
  const data = await page.evaluate(async base => {
    const get = async q => {
      const r = await fetch(`${base}${q}`);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
      return r.json();
    };
    const totalWallets = (await get('&page=1')).total;
    const traders = [];
    for (let p = 1; p <= 60; p++) {
      const d = await get(`&page=${p}&trading_only=true&league_source=frozen`);
      traders.push(...d.rows);
      if (!d.has_next) break;
    }
    return { totalWallets, traders };
  }, base);
  if (data.traders.length < 100) throw new Error(`Only ${data.traders.length} traders returned`);
  const traders = data.traders.map(r => ({
    rank: r.rank,
    wallet: r.wallet,
    aura: r.aura,
    tradingAura: r.trading_aura,
    league: r.league?.name,
    topPercent: r.league?.top_percent == null ? undefined : Math.round(r.league.top_percent * 100) / 100,
    categories: r.categories ?? {},
    updatedAt: r.updated_at
  }));
  const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  if (old && JSON.stringify(old.traders) === JSON.stringify(traders)) {
    console.log(`No Aura change (${traders.length} traders)`);
  } else {
    writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), totalWallets: data.totalWallets, traders }));
    console.log(`Saved ${traders.length} traders of ${data.totalWallets} wallets`);
  }
} finally {
  if (cdp) await page?.close().catch(() => {});
  await browser.close().catch(() => {});
}
