/**
 * scripts/audit-hud.mjs — programmatic responsive + a11y audit for the TerraPulse HUD.
 *
 * Usage:
 *   node scripts/audit-hud.mjs          audit + screenshots
 *   node scripts/audit-hud.mjs --shots  screenshots only
 *
 * Requires the dev server on http://127.0.0.1:3001 and the already-installed
 * `playwright` package. Nothing under src/ or package.json is touched.
 *
 * Checks (spec docs/design/STITCH-HUD-SPEC.md):
 *   C8  rectangle-intersection overlap assertions between HUD corners
 *   C7  every interactive element inside a HUD container is >= 44x44
 *   C6  numeric readouts compute font-variant-numeric: tabular-nums
 *   + BERITA mode reachability at mobile and desktop breakpoints
 *
 * Note: the dev server renders the Next.js dev error toast on page load (a
 * maplibre/deck StrictMode teardown race, see docs/design/RESPONSIVE-AUDIT.md),
 * which can unmount the React tree. Every viewport load is retried until the
 * telemetry strip actually has a box; the crash count is reported.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'http://127.0.0.1:3001/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = path.join(ROOT, 'screenshots');
const SHOTS_ONLY = process.argv.includes('--shots');

const VIEWPORTS = [
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
];

const SEL = {
  lockup: '[aria-label="TerraPulse brand"]',
  telemetry: '[aria-label="Telemetri sistem"]',
  timelineRoot: '[role="slider"][aria-label="Timeline playback"]',
  timelinePill: '[role="slider"][aria-label="Timeline playback"] .tp-panel',
  layerDesktop: '#panel-peta aside',
  layerMobileTrigger: 'button[aria-label="Buka kontrol layer"]',
  eventCardClose: '[aria-label="Tutup detail"]',
  newsPanel: '#panel-berita',
  newsToggleMobile: 'button[aria-label="Buka panel berita"]',
  newsClose: '#panel-berita button[aria-label="Tutup panel berita"]',
  tabBerita: '#tab-berita',
  petaPanel: '#panel-peta',
  mapCanvas: '.maplibregl-canvas',
  mapContainer: '.maplibregl-map',
};

const HUD_ROOTS = [
  SEL.telemetry,
  SEL.lockup,
  SEL.timelineRoot,
  SEL.layerDesktop,
  SEL.layerMobileTrigger,
  SEL.newsToggleMobile,
  SEL.newsPanel,
];

const INTERACTIVE = 'button, a[href], input, [role="tab"], select';
const CONSOLE_IGNORE = ['Extension', 'chrome-extension', 'favicon', 'Content Security Policy'];
const firstLine = (s) => String(s).split('\n')[0].slice(0, 170);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rect = (r) => (r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1) } : null);

function overlap(a, b) {
  if (!a || !b) return null;
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const area = w * h;
  return { intersects: area > 0.5, area: +area.toFixed(1) };
}

async function rectOf(page, selector) {
  try {
    const r = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) return null;
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, selector);
    return rect(r);
  } catch {
    return null;
  }
}

const evalSafe = async (page, fn, arg) => {
  try {
    return await page.evaluate(fn, arg);
  } catch (err) {
    return { __error: firstLine(err.message) };
  }
};

async function eventCardOpen(page) {
  return !!(await page.$eval(SEL.eventCardClose, (el) => el.getBoundingClientRect().height > 0).catch(() => false));
}

const eventCardRect = (page) =>
  page
    .evaluate((sel) => {
      const close = document.querySelector(sel);
      const shell = close?.closest('div.fixed');
      if (!shell) return null;
      const b = shell.getBoundingClientRect();
      return b.width < 1 ? null : { x: b.x, y: b.y, w: b.width, h: b.height };
    }, SEL.eventCardClose)
    .then(rect)
    .catch(() => null);

/**
 * Opens the EventCard by clicking a deck.gl marker. deck picking goes through
 * MapboxOverlay.pickObject, so the marker's screen position is all we need:
 * bright pixels in the map canvas are clustered into centroids, largest first,
 * and each centroid is clicked until the card opens.
 */
async function markerCandidates(page) {
  return page
    .evaluate((sel) => {
      const c = document.querySelector(sel);
      if (!c || !c.width) return [];
      const off = document.createElement('canvas');
      off.width = c.width;
      off.height = c.height;
      const g = off.getContext('2d');
      try {
        g.drawImage(c, 0, 0);
      } catch {
        return [];
      }
      const d = g.getImageData(0, 0, off.width, off.height).data;
      const b = c.getBoundingClientRect();
      const sx = off.width ? b.width / off.width : 1;
      const sy = off.height ? b.height / off.height : 1;
      const clusters = [];
      for (let y = 0; y < off.height; y += 2) {
        for (let x = 0; x < off.width; x += 2) {
          const i = (y * off.width + x) * 4;
          if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 90) continue;
          let hit = null;
          for (const cl of clusters) {
            if (Math.abs(cl.cx - x) < 14 && Math.abs(cl.cy - y) < 14) {
              hit = cl;
              break;
            }
          }
          if (hit) {
            hit.n += 1;
            hit.cx = (hit.cx * (hit.n - 1) + x) / hit.n;
            hit.cy = (hit.cy * (hit.n - 1) + y) / hit.n;
          } else if (clusters.length < 4000) {
            clusters.push({ n: 1, cx: x, cy: y });
          }
        }
      }
      return clusters
        .sort((p, q) => q.n - p.n)
        .slice(0, 12)
        .map((cl) => ({ n: cl.n, x: Math.round(b.x + cl.cx * sx), y: Math.round(b.y + cl.cy * sy) }));
    }, SEL.mapCanvas)
    .catch(() => []);
}

async function openEventCard(page) {
  if (await eventCardOpen(page)) return 'already open';
  const canvas = await rectOf(page, SEL.mapCanvas);
  if (!canvas) return 'no map canvas';

  const tryClick = async (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (x < canvas.x + 2 || x > canvas.x + canvas.w - 2 || y < canvas.y + 2 || y > canvas.y + canvas.h - 2) return false;
    await page.mouse.click(x, y).catch(() => {});
    await sleep(600);
    return eventCardOpen(page);
  };

  for (const m of await markerCandidates(page)) {
    if (await tryClick(m.x, m.y)) return `marker pixel scan (${m.x},${m.y} n=${m.n})`;
  }

  // Recentre on an epicentre through the telemetry ticker, then rescan.
  for (let i = 0; i < 2; i++) {
    await page.click(`${SEL.telemetry} button`, { timeout: 3000 }).catch(() => {});
    await sleep(1800);
    for (const m of await markerCandidates(page)) {
      if (await tryClick(m.x, m.y)) return 'ticker recentre + marker scan';
    }
  }
  return 'not reached';
}

async function touchTargets(page) {
  return page
    .evaluate(
      ({ roots, sel }) => {
        const seen = new Set();
        const out = [];
        for (const rootSel of roots) {
          const root = document.querySelector(rootSel);
          if (!root) continue;
          const candidates = [...(root.matches(sel) ? [root] : []), ...root.querySelectorAll(sel)];
          for (const el of candidates) {
            if (seen.has(el)) continue;
            seen.add(el);
            const b = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || b.width < 1 || b.height < 1) continue;
            if (b.width < 44 || b.height < 44) {
              const label = el.getAttribute('aria-label') || (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26);
              const scope = rootSel.includes('panel-berita')
                ? 'NewsPanel'
                : rootSel.includes('Telemetri')
                  ? 'TelemetryStrip'
                  : rootSel.includes('Timeline')
                    ? 'TimelineBar'
                    : rootSel.includes('TerraPulse')
                      ? 'BrandLockup'
                      : 'LayerPanel';
              out.push({ scope, selector: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}[${label}]`, w: +b.width.toFixed(1), h: +b.height.toFixed(1) });
            }
          }
        }
        return out;
      },
      { roots: HUD_ROOTS, sel: INTERACTIVE }
    )
    .then((r) => (r.__error ? [] : r))
    .catch(() => []);
}

async function tabularNums(page) {
  const pill = await page.$(SEL.timelinePill).catch(() => null);
  const box = pill ? await pill.boundingBox().catch(() => null) : null;
  if (box) await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2).catch(() => {});
  await sleep(150);

  const res = await evalSafe(page, ({ timelineRoot, telemetry, eventCardClose, newsPanel }) => {
    const checks = [];
    const add = (name, el, required = true) => {
      if (!el || el.getBoundingClientRect().width < 1) {
        if (required) checks.push({ name, found: false, ok: false, fvn: null });
        return;
      }
      const fvn = getComputedStyle(el).fontVariantNumeric || '';
      checks.push({ name, found: true, ok: fvn.includes('tabular-nums'), fvn });
    };
    const tRoot = document.querySelector(timelineRoot);
    const tele = document.querySelector(telemetry);
    const card = document.querySelector(eventCardClose)?.closest('div.fixed') || null;
    const news = document.querySelector(newsPanel);

    add('telemetry ticker', tele?.querySelector('button'), false);
    add('timeline clock', tRoot?.querySelector('.tp-value'), false);
    add('timeline hover bubble', tRoot?.querySelector('[class*="bottom-full"]'), false);
    add('timeline speed select', tRoot?.querySelector('select'), false);

    if (card) {
      const label = (text) => {
        for (const s of card.querySelectorAll('span')) {
          if (s.textContent.trim().toUpperCase() === text && s.nextElementSibling) return s.nextElementSibling;
        }
        return null;
      };
      add('EventCard MAGNITUDO', label('MAGNITUDO'), false);
      add('EventCard KEDALAMAN', label('KEDALAMAN'), false);
      add('EventCard WAKTU', label('WAKTU'), false);
      add('EventCard KOORDINAT value', label('KOORDINAT'), false);
      add('EventCard coord button', [...card.querySelectorAll('button')].find((b) => /^-?\d+\.\d+,\s*-?\d+\.\d+/.test(b.textContent.trim())), false);
    }
    if (news) add('NewsPanel relative time', news.querySelector('.tp-label.text-tp-dim'), false);
    return checks;
  }, { timelineRoot: SEL.timelineRoot, telemetry: SEL.telemetry, eventCardClose: SEL.eventCardClose, newsPanel: SEL.newsPanel });

  return Array.isArray(res) ? res : [];
}

async function hudState(page) {
  return page
    .evaluate(
      ({ telemetry, lockup, timelineRoot, layerDesktop, layerMobileTrigger, newsPanel, petaPanel }) => {
        const vis = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return 'absent';
          const cs = getComputedStyle(el);
          const b = el.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || b.width < 1 || b.height < 1) return 'hidden';
          return 'visible';
        };
        const peta = document.querySelector(petaPanel);
        return {
          telemetry: vis(telemetry),
          lockup: vis(lockup),
          timeline: vis(timelineRoot),
          layerPanel: vis(layerDesktop) === 'absent' ? vis(layerMobileTrigger) : vis(layerDesktop),
          newsPanel: vis(newsPanel),
          petaHiddenAttr: peta ? peta.hasAttribute('hidden') : null,
          petaDisplay: peta ? getComputedStyle(peta).display : 'absent',
          devPortal: document.querySelectorAll('nextjs-portal').length,
        };
      },
      {
        telemetry: SEL.telemetry,
        lockup: SEL.lockup,
        timelineRoot: SEL.timelineRoot,
        layerDesktop: SEL.layerDesktop,
        layerMobileTrigger: SEL.layerMobileTrigger,
        newsPanel: SEL.newsPanel,
        petaPanel: SEL.petaPanel,
      }
    )
    .catch(() => null);
}

async function loadPage(page, tries = 4) {
  let state = null;
  for (let i = 1; i <= tries; i++) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(SEL.mapCanvas, { state: 'attached', timeout: 30_000 }).catch(() => {});
    await sleep(2600); // data + HUD settle (the dev teardown race surfaces here)
    state = await hudState(page);
    if (state && state.telemetry === 'visible') return { attempts: i, state };
  }
  return { attempts: tries, state };
}

// ---------------------------------------------------------------------------
async function auditViewport(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 768 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(firstLine(m.text()));
  });
  page.on('pageerror', (e) => pageErrors.push(firstLine(e.message)));

  const r = { viewport: vp.name, mobile: vp.width < 768, rects: {}, overlaps: [], touch: [], newsTouch: [], tabular: [], newsRowTargets: [], steps: [] };
  const step = async (name, fn) => {
    try {
      return await fn();
    } catch (err) {
      r.steps.push(`${name}: ${firstLine(err.message)}`);
      return null;
    }
  };

  try {
    const load = await loadPage(page);
    r.loadAttempts = load.attempts;
    r.visibility = load.state;

    await step('peta rects', async () => {
      r.rects.lockup = await rectOf(page, SEL.lockup);
      r.rects.timeline = (await rectOf(page, SEL.timelinePill)) || (await rectOf(page, SEL.timelineRoot));
      r.rects.layerPanel = (await rectOf(page, SEL.layerDesktop)) || (await rectOf(page, SEL.layerMobileTrigger));
      r.rects.telemetry = await rectOf(page, SEL.telemetry);
      r.rects.newsToggle = await rectOf(page, SEL.newsToggleMobile);
      r.rects.mapCanvas = await rectOf(page, SEL.mapCanvas);
      r.rects.mapContainer = await rectOf(page, SEL.mapContainer);
      r.layerKind = (await page.$(SEL.layerDesktop)) ? 'desktop panel' : (await page.$(SEL.layerMobileTrigger)) ? 'mobile trigger' : 'none';
    });

    r.touch = (await step('touch targets', () => touchTargets(page))) ?? [];
    r.tabular = (await step('tabular-nums', () => tabularNums(page))) ?? [];

    await step('berita', async () => {
      const toggle = vp.width < 768 ? SEL.newsToggleMobile : SEL.tabBerita;
      await page.click(toggle, { timeout: 6000 });
      r.beritaClicked = true;
      await sleep(1200);
      r.rects.newsPanel = await rectOf(page, SEL.newsPanel);
      // Cross-mode evidence: what the PETA HUD does while BERITA is open.
      r.rects.timelineInBerita = await rectOf(page, SEL.timelineRoot);
      r.visibilityBerita = await hudState(page);
      r.newsReachable = await page
        .$eval(SEL.newsPanel, (el) => {
          const close = el.querySelector('button');
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && !!close && close.getBoundingClientRect().height >= 44;
        })
        .catch(() => false);
      r.newsRowTargets = await page
        .$$eval(`${SEL.newsPanel} a[href]`, (as) => as.slice(0, 3).map((a) => `${Math.round(a.getBoundingClientRect().width)}x${Math.round(a.getBoundingClientRect().height)}`))
        .catch(() => []);
      r.newsTouch = await touchTargets(page);
      r.newsTabular = (await tabularNums(page)).filter((c) => c.name === 'NewsPanel relative time');
      await page.click(SEL.newsClose, { timeout: 3000 }).catch(() => {});
      await sleep(700);
      r.backToPeta = (await hudState(page))?.timeline === 'visible';
    });

    // EventCard last: opening it is the flakiest step and can unstick the map.
    await step('event card', async () => {
      r.eventCardHow = await openEventCard(page);
      r.eventCardOpened = await eventCardOpen(page);
      if (r.eventCardOpened) {
        r.rects.eventCard = await eventCardRect(page);
        r.cardTabular = (await tabularNums(page)).filter((c) => c.name.startsWith('EventCard'));
      }
    });

    const p = r.rects;
    for (const [label, a, b, note] of [
      ['lockup vs timeline', p.lockup, p.timeline, ''],
      ['lockup vs EventCard', p.lockup, p.eventCard, ''],
      ['timeline vs EventCard', p.timeline, p.eventCard, ''],
      ['NewsPanel vs timeline-in-BERITA', p.newsPanel, p.timelineInBerita, 'live BERITA-mode rects (PETA tree hidden)'],
      ['NewsPanel vs timeline (PETA rect, cross-mode)', p.newsPanel, p.timeline, 'reference only: PETA rect measured before switching'],
    ]) {
      const o = overlap(a, b);
      r.overlaps.push({
        pair: label,
        a: a ? `${a.x},${a.y} ${a.w}x${a.h}` : null,
        b: b ? `${b.x},${b.y} ${b.w}x${b.h}` : null,
        intersects: o ? o.intersects : null,
        area: o ? o.area : null,
        note,
      });
    }

    const sig = (list) => {
      const m = new Map();
      for (const e of list) m.set(e, (m.get(e) || 0) + 1);
      return [...m.entries()].map(([text, count]) => ({ text, count }));
    };
    r.errors = {
      console: consoleErrors.length,
      consoleUnique: sig(consoleErrors.filter((e) => !CONSOLE_IGNORE.some((s) => e.includes(s)))),
      page: pageErrors.length,
      pageUnique: sig(pageErrors),
    };
  } finally {
    await context.close();
  }
  return r;
}

// ---------------------------------------------------------------------------
const pad = (s, n) => {
  s = String(s ?? '—');
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
};
const fmtRect = (x) => (x ? `${x.x},${x.y} ${x.w}x${x.h}` : 'not rendered');

function printReport(results, shots) {
  const L = [];
  const say = (s = '') => L.push(s);
  say('=== TerraPulse HUD responsive/a11y audit ===');
  say(`server ${BASE}  viewports ${VIEWPORTS.map((v) => v.name).join(', ')}`);
  say('');

  say('--- load / crash ---');
  for (const r of results) {
    say(`${pad(r.viewport, 10)} loadAttempts=${r.loadAttempts} telemetry=${r.visibility?.telemetry} petaDisplay=${r.visibility?.petaDisplay} consoleErrors=${r.errors?.console} pageErrors=${r.errors?.page}`);
  }
  say('');

  say('--- measured rects in PETA mode (x,y wxh) ---');
  say(pad('viewport', 10) + pad('lockup', 22) + pad('timeline', 22) + pad('layerPanel', 22) + pad('telemetry', 22) + pad('newsToggle', 20) + 'newsPanel(BERITA)');
  for (const r of results) {
    const p = r.rects;
    say(pad(r.viewport, 10) + pad(fmtRect(p.lockup), 22) + pad(fmtRect(p.timeline), 22) + pad(fmtRect(p.layerPanel), 22) + pad(fmtRect(p.telemetry), 22) + pad(fmtRect(p.newsToggle), 20) + fmtRect(p.newsPanel));
  }
  say('');
  say('--- map sizing ---');
  for (const r of results) say(`${pad(r.viewport, 10)} canvas=${pad(fmtRect(r.rects.mapCanvas), 22)} container=${fmtRect(r.rects.mapContainer)}`);
  say('');

  say('--- overlap assertions (spec C8) ---');
  const overlapFails = [];
  for (const r of results) {
    say(`${r.viewport}  (layer control: ${r.layerKind})`);
    for (const o of r.overlaps) {
      const res = o.intersects === null ? 'N/A (one rect not rendered)' : o.intersects ? `FAIL overlap ${o.area}px²` : 'PASS no overlap';
      if (o.intersects) overlapFails.push(`${r.viewport} ${o.pair}=${o.area}px²`);
      say(`  ${pad(o.pair, 44)} A=${pad(o.a, 22)} B=${pad(o.b, 22)} ${res}${o.note ? '  [' + o.note + ']' : ''}`);
    }
  }
  say(`  intersecting pairs: ${overlapFails.length ? overlapFails.join(' | ') : 'none'}`);
  say('');

  say('--- touch targets < 44x44 (spec C7) — HUD containers only ---');
  let touchTotal = 0;
  for (const r of results) {
    const list = [...r.touch, ...(r.newsTouch || [])];
    touchTotal += list.length;
    say(`${pad(r.viewport, 10)} ${list.length ? `FAIL — ${list.length} violation(s)` : 'PASS — 0 violations'}`);
    for (const t of list) say(`    ${t.scope}: ${t.selector} → ${t.w}x${t.h}`);
  }
  say(`  total violations: ${touchTotal}`);
  say('');

  say('--- tabular-nums (spec C6) ---');
  let tabTotal = 0;
  for (const r of results) {
    const checks = [...(r.tabular || []), ...(r.newsTabular || []), ...(r.cardTabular || [])];
    const bad = checks.filter((c) => c.found && !c.ok);
    tabTotal += bad.length;
    say(`${pad(r.viewport, 10)} ${bad.length ? 'FAIL' : 'PASS'} — ${checks.map((c) => `${c.name}=${c.found ? (c.ok ? 'ok' : `FAIL(${c.fvn})`) : 'n/a'}`).join(', ')}`);
  }
  say(`  readouts failing: ${tabTotal}`);
  say('');

  say('--- EventCard ---');
  for (const r of results) say(`${pad(r.viewport, 10)} opened=${!!r.eventCardOpened} via=${r.eventCardHow} rect=${fmtRect(r.rects.eventCard)}`);
  say('');

  say('--- BERITA reachability ---');
  for (const r of results) {
    say(
      `${pad(r.viewport, 10)} clicked=${!!r.beritaClicked} panel=${pad(fmtRect(r.rects.newsPanel), 22)} closeBtn>=44=${r.newsReachable ? 'yes' : 'NO'} rows(first3)=${JSON.stringify(r.newsRowTargets)} ` +
        `petaHiddenAttr=${r.visibilityBerita?.petaHiddenAttr} petaDisplay=${r.visibilityBerita?.petaDisplay} timelineWhileBerita=${fmtRect(r.rects.timelineInBerita)} backToPeta=${!!r.backToPeta}`
    );
  }
  say('');

  say('--- console / page errors (unique signatures) ---');
  for (const r of results) {
    if (!r.errors) {
      say(`${pad(r.viewport, 10)} not collected`);
      continue;
    }
    say(`${pad(r.viewport, 10)} console=${r.errors.console} page=${r.errors.page}`);
    for (const s of r.errors.consoleUnique.slice(0, 4)) say(`    console x${s.count}: ${s.text}`);
    for (const s of r.errors.pageUnique.slice(0, 4)) say(`    page x${s.count}: ${s.text}`);
  }
  say('');

  say('--- step failures ---');
  const stepFails = results.filter((r) => r.steps?.length);
  if (!stepFails.length) say('  none');
  for (const r of stepFails) for (const s of r.steps) say(`  ${r.viewport} ${s}`);
  say('');

  if (shots?.length) {
    say('--- screenshots ---');
    for (const s of shots) {
      const px = s.pixels || {};
      say(
        `${s.file}  console=${s.console} page=${s.page}  ${s.note}  open=${s.drawerOpen}  ` +
          `pixels nonBlack=${px.nonBlack}/${px.total} (${px.pctNonBlack}%) bright=${px.bright} colors=${px.distinctColors} ${px.size || ''}${px.err ? ' ERR ' + px.err : ''}`
      );
      for (const t of (s.consoleText || []).slice(0, 3)) say(`    console: ${t}`);
      for (const t of (s.pageText || []).slice(0, 3)) say(`    page: ${t}`);
    }
    say('');
  }

  console.log(L.join('\n'));
}

// ---------------------------------------------------------------------------
async function shoot(browser, spec) {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, hasTouch: spec.touch });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(firstLine(m.text()));
  });
  page.on('pageerror', (e) => pageErrors.push(firstLine(e.message)));
  let note = spec.note;
  let drawerOpen = false;
  if (spec.prepare) {
    for (let attempt = 1; attempt <= 3 && !drawerOpen; attempt++) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(SEL.mapCanvas, { state: 'attached', timeout: 30_000 }).catch(() => {});
      await sleep(2600 + spec.settle);
      try {
        await spec.prepare(page);
        drawerOpen = spec.verify ? await spec.verify(page) : false;
        if (!drawerOpen) note = `${spec.note} — attempt ${attempt}: not open`;
      } catch (err) {
        note = `${spec.note} — attempt ${attempt} failed: ${firstLine(err.message)}`;
      }
    }
  } else {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(SEL.mapCanvas, { state: 'attached', timeout: 30_000 }).catch(() => {});
    await sleep(3800);
  }
  const file = path.join(SHOT_DIR, spec.file);
  await page.screenshot({ path: file });
  const filtered = consoleErrors.filter((e) => !CONSOLE_IGNORE.some((x) => e.includes(x)));
  const out = {
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    console: filtered.length,
    page: pageErrors.length,
    consoleText: [...new Set(filtered)],
    pageText: [...new Set(pageErrors)],
    note,
    drawerOpen,
    pixels: await pixelStats(file),
  };
  await context.close();
  return out;
}

/** Non-black / bright pixel counts, so a blank screenshot cannot pass silently. */
async function pixelStats(file) {
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const img = await loadImage(file);
    const c = createCanvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let nonBlack = 0;
    let bright = 0;
    let total = 0;
    const colors = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      total += 1;
      if (lum > 8) nonBlack += 1;
      if (lum > 40) bright += 1;
      if (colors.size < 512) colors.add(`${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`);
    }
    return { size: `${img.width}x${img.height}`, nonBlack, bright, total, pctNonBlack: +((100 * nonBlack) / total).toFixed(1), distinctColors: colors.size };
  } catch (err) {
    return { err: firstLine(err.message) };
  }
}

async function screenshots() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const spec = [
    { file: 'stitch-desktop.png', width: 1280, height: 800, touch: false, settle: 0, note: '1280x800 PETA mode, full HUD' },
    {
      file: 'stitch-mobile.png',
      width: 390,
      height: 844,
      touch: true,
      settle: 0,
      note: '390x844 BERITA drawer open',
      prepare: async (page) => {
        await page.click(SEL.newsToggleMobile, { timeout: 8000 });
        await sleep(1500);
      },
      verify: async (page) =>
        page.$eval(SEL.newsPanel, (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 40).catch(() => false),
    },
    {
      file: 'stitch-desktop-eventcard.png',
      width: 1280,
      height: 800,
      touch: false,
      settle: 0,
      note: '1280x800 PETA mode, EventCard open',
      prepare: async (page) => {
        await openEventCard(page);
      },
      verify: async (page) => eventCardOpen(page),
    },
  ];
  const browser = await chromium.launch();
  const shots = [];
  for (const s of spec) shots.push(await shoot(browser, s));
  await browser.close();
  return shots;
}

// ---------------------------------------------------------------------------
if (SHOTS_ONLY) {
  console.log(JSON.stringify(await screenshots(), null, 2));
} else {
  const browser = await chromium.launch();
  const results = [];
  for (const vp of VIEWPORTS) results.push(await auditViewport(browser, vp));
  await browser.close();
  let shots = [];
  try {
    shots = await screenshots();
  } catch (err) {
    shots = [{ file: 'screenshots (none)', console: -1, page: -1, consoleText: [], pageText: [], note: `screenshot pass failed: ${firstLine(err.message)}` }];
  }
  printReport(results, shots);
}
