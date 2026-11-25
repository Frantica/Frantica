// Refreshes the block between the STATS markers in README.md from public store pages.
// Ratings on Google Play differ by country; this reads the India storefront.
import { readFileSync, writeFileSync } from "node:fs";

async function play(id) {
  const r = await fetch(`https://play.google.com/store/apps/details?id=${id}&hl=en&gl=IN`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const html = await r.text();
  const installs = html.match(/>([\d.,]+[KMB]?\+)<\/div><div[^>]*>Downloads/)?.[1];
  if (!installs) throw new Error(`${id}: downloads not found`);
  const rating = html.match(/"ratingValue":"([\d.]+)","ratingCount":"(\d+)"/);
  return { installs, rating: rating ? `★ ${Number(rating[1]).toFixed(1)} (${rating[2]})` : "–" };
}

async function appStore(id) {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=in`);
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const a = (await r.json()).results?.[0];
  if (!a) throw new Error(`${id}: not found`);
  return { installs: "–", rating: `★ ${a.averageUserRating.toFixed(1)} (${a.userRatingCount})` };
}

const rows = [
  ["Ongaku · Google Play", await play("com.ongaku")],
  ["Kumsing · Google Play", await play("com.kanglalabs.kumsing")],
  ["Kumsing · App Store", await appStore("6804580494")],
];

const block = [
  "| Store | Downloads badge | Rating (count) |",
  "|---|---|---|",
  ...rows.map(([n, s]) => `| ${n} | ${s.installs} | ${s.rating} |`),
].join("\n");

const md = readFileSync("README.md", "utf8");
const re = /(<!-- STATS:START -->)[\s\S]*?(<!-- STATS:END -->)/;
if (!re.test(md)) throw new Error("STATS markers missing");
writeFileSync("README.md", md.replace(re, (_, a, b) => `${a}\n${block}\n${b}`));
console.log(block);
