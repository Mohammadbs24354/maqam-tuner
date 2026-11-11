const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

new Function(app);

const start = app.indexOf("  function autoCorrelate(");
const end = app.indexOf("\n  function tick()", start);
assert.ok(start >= 0 && end > start, "pitch detector must exist");
const autoCorrelate = new Function(app.slice(start, end) + "\nreturn autoCorrelate;")();

const sampleRate = 48000;
const sampleCount = 4096;
const testFrequencies = [55, 82.407, 110, 146.832, 195.998, 207.65, 261.626, 440, 587.33, 659.255, 880, 1174.66];
for (const target of testFrequencies) {
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const phase = 2 * Math.PI * target * i / sampleRate;
    samples[i] = 0.2 * Math.sin(phase) + 0.06 * Math.sin(2 * phase) + 0.025 * Math.sin(3 * phase);
  }
  const detected = autoCorrelate(samples, sampleRate);
  const errorPercent = Math.abs((detected - target) / target) * 100;
  assert.ok(detected > 0 && errorPercent < 0.2, target + " Hz detection error: " + detected);
}
assert.equal(autoCorrelate(new Float32Array(sampleCount), sampleRate), -1, "silence should not produce a pitch");

assert.match(html, /<html lang="ar" dir="rtl">/, "page must be Arabic RTL");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, "HTML IDs must be unique");
const missingIds = [...new Set([...app.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1]).filter(id => !ids.includes(id)))];
assert.deepEqual(missingIds, [], "all direct JavaScript element references must exist in HTML");

const pageTags = [...html.matchAll(/<[^>]*\bclass="site-page"[^>]*>/g)].map(match => match[0]);
const pageIds = new Set(pageTags.map(tag => (tag.match(/\bid="([^"]+)"/) || [])[1]).filter(Boolean));
const navTargets = [...html.matchAll(/data-page="([^"]+)"/g)].map(match => match[1]);
for (const target of navTargets) assert.ok(pageIds.has(target), "navigation target must exist: " + target);
for (const instrument of ["oud", "guitar", "buzuq", "violin", "easternViolin"]) {
  assert.ok(html.includes('data-instrument="' + instrument + '"'), "missing instrument: " + instrument);
}
assert.match(app, /malfuf:\{name:"ملفوف",beats:2/, "malfuf should loop as 2/4");
assert.match(app, /const cents=1200\*Math\.log2\(hz\/targetFrequency\)/, "deviation must be measured against the selected string");
assert.match(css, /@media\(max-width:/, "responsive breakpoints must exist");

console.log("Smoke tests passed: pitch detection, silence handling, RTL markup, unique IDs, navigation, instruments, selected-string cents, rhythm meter, and responsive CSS.");
