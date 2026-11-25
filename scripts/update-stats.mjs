// Rebuilds the app cards in assets/stats from assets/stats.json and live store ratings.
// Google Play ratings differ by country; this reads the India storefront.
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("assets/stats.json", "utf8"));

async function play(id) {
  const r = await fetch(`https://play.google.com/store/apps/details?id=${id}&hl=en&gl=IN`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const m = (await r.text()).match(/"ratingValue":"([\d.]+)","ratingCount":"(\d+)"/);
  if (!m) throw new Error(`${id}: rating not found`);
  return Number(m[1]).toFixed(1);
}

async function appStore(id) {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=in`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const a = (await r.json()).results?.[0];
  if (!a) throw new Error(`${id}: not found`);
  return a.averageUserRating.toFixed(1);
}

const THEMES = {
  light: { bg: "#ffffff", line: "#e1e0d9", ink: "#0b0b0b", sub: "#52514e", grid: "#eceae4" },
  dark: { bg: "#151b23", line: "#30363d", ink: "#f0f6fc", sub: "#9aa4af", grid: "#262d36" },
};
const tick = (n) => (n >= 1000 ? `${n / 1000}K` : `${n}`);

function card(app, ratings, mode) {
  const t = THEMES[mode], c = app[mode];
  const W = 420, H = 336, x0 = 58, x1 = 388, y0 = 246, y1 = 170;
  const px = (i) => x0 + (i / (app.points.length - 1)) * (x1 - x0);
  const py = (v) => y0 - (v / app.max) * (y0 - y1);
  const line = app.points.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join("");
  const icon = readFileSync(`assets/icons/${app.key}.png`).toString("base64");
  const last = app.points.length - 1;
  const stats = [...app.stats, ...ratings];
  const step = (W - 56) / stats.length;
  const label = `${app.name}: ${app.hero} ${app.heroLabel}. ${stats.map(([v, l]) => `${v} ${l.replace("*", "")}`).join(", ")}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<defs><clipPath id="i"><rect x="28" y="26" width="48" height="48" rx="11"/></clipPath></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.line}"/>
<image href="data:image/png;base64,${icon}" x="28" y="26" width="48" height="48" clip-path="url(#i)"/>
<text x="90" y="47" font-size="18" font-weight="600" fill="${t.ink}">${app.name}</text>
<text x="90" y="67" font-size="13" fill="${t.sub}">${app.tagline}</text>
<text x="28" y="128" font-size="38" font-weight="600" fill="${t.ink}">${app.hero}</text>
<text x="${28 + app.hero.length * 22 + 8}" y="128" font-size="13" fill="${t.sub}">${app.heroLabel}</text>
<text x="28" y="154" font-size="11" fill="${t.sub}">${app.chartTitle}</text>
${app.ticks.map((v) => `<path d="M${x0} ${py(v)}H${x1}" stroke="${t.grid}"/><text x="${x0 - 8}" y="${py(v) + 4}" font-size="11" text-anchor="end" fill="${t.sub}">${tick(v)}</text>`).join("\n")}
<path d="${line}L${x1} ${y0}L${x0} ${y0}Z" fill="${c}" opacity=".1"/>
<path d="${line}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${px(last)}" cy="${py(app.points[last]).toFixed(1)}" r="5" fill="${c}" stroke="${t.bg}" stroke-width="2"/>
<text x="${x0}" y="263" font-size="11" fill="${t.sub}">${app.xLabels[0]}</text>
<text x="${x1}" y="263" font-size="11" text-anchor="end" fill="${t.sub}">${app.xLabels[1]}</text>
${stats.map(([v, l], i) => `<text x="${28 + i * step}" y="295" font-size="17" font-weight="600" fill="${t.ink}">${v}</text><text x="${28 + i * step}" y="312" font-size="11" fill="${t.sub}">${l}</text>`).join("\n")}
</svg>
`;
}

// Fetch everything first so a failure leaves the last good cards in place.
const out = [];
for (const app of data.apps) {
  const ratings = [[`${await play(app.play)} ★`, "Google Play"]];
  if (app.appStore) ratings.push([`${await appStore(app.appStore)} ★`, "App Store"]);
  for (const mode of ["light", "dark"]) out.push([`assets/stats/${app.key}-${mode}.svg`, card(app, ratings, mode)]);
  console.log(app.name, ratings.map((r) => r.join(" ")).join(", "));
}
for (const [file, svg] of out) writeFileSync(file, svg);
