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

const chromaticMatch = app.match(/const chromatic=(\[[^\n]+\]);/);
assert.ok(chromaticMatch, "quarter-tone note labels must exist");
const noteNameStart = app.indexOf("  function noteName(midi)");
const noteNameEnd = app.indexOf("\n  function pianoPosition", noteNameStart);
assert.ok(noteNameStart >= 0 && noteNameEnd > noteNameStart, "note name formatter must exist");
const frequencyStart = app.indexOf("  function frequencyToNote(freq)");
const frequencyEnd = app.indexOf("\n  function updateMeter", frequencyStart);
const noteHelpers = new Function("const chromatic=" + chromaticMatch[1] + "; const A4=440;\n" + app.slice(noteNameStart, noteNameEnd) + "\n" + app.slice(frequencyStart, frequencyEnd) + "\nreturn {noteName, frequencyToNote};")();
assert.equal(noteHelpers.noteName(63.5), "مي نصف بيمول", "quarter-tone note should be named correctly");
const quarterToneHz = 440 * Math.pow(2, (63.5 - 69) / 12);
assert.equal(noteHelpers.frequencyToNote(quarterToneHz).midi, 63.5, "tuner should retain quarter-tone pitch");

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
for (const style of ["jazzSwing","bluesShuffle","house","deepHouse","disco","rock","funk","reggae","bossaNova"]) {
  assert.ok(app.includes(style + ":{name:"), "missing western rhythm pattern: " + style);
  assert.ok(html.includes('value="' + style + '"'), "missing western rhythm option: " + style);
}
assert.match(app, /pattern\.stepsPerBeat\|\|4/, "scheduler must support triplet subdivisions");
assert.match(app, /const cents=1200\*Math\.log2\(hz\/targetFrequency\)/, "deviation must be measured against the selected string");
assert.match(css, /@media\(max-width:/, "responsive breakpoints must exist");


const rhythmStart = app.indexOf("  const rhythmPatterns=");
const rhythmEnd = app.indexOf("  let drumAudioContext", rhythmStart);
assert.ok(rhythmStart >= 0 && rhythmEnd > rhythmStart, "rhythm patterns must be declared");
const rhythmSource = app.slice(rhythmStart + "  const rhythmPatterns=".length, rhythmEnd).trim().replace(/;\s*$/, "");
const rhythms = new Function("return (" + rhythmSource + ")")();
const drumTypes = ["dum","tak","daf","riq","clap","cymbal","snare","bass","slap","sagat","shaker","tom","hihat","openHat","ride"];
assert.equal(Object.keys(rhythms).length, 14, "all 14 rhythm presets should be available");
for (const [name, pattern] of Object.entries(rhythms)) {
  const subdivisions = pattern.stepsPerBeat || 4;
  assert.ok(pattern.beats > 0, name + " must define a positive meter");
  for (const [step, hits] of Object.entries(pattern.steps)) {
    assert.ok(Number.isInteger(Number(step)) && Number(step) >= 0 && Number(step) < pattern.beats * subdivisions, name + " has an out-of-meter step: " + step);
    for (const type of hits) {
      assert.ok(drumTypes.includes(type), name + " uses an unknown sound: " + type);
      assert.ok(html.includes('data-drum="' + type + '"'), "missing playable pad for sound: " + type);
    }
  }
}
assert.deepEqual(Object.keys(rhythms.house.steps).filter(step => rhythms.house.steps[step].includes("bass")).sort((a,b)=>a-b), ["0","4","8","12"], "house must use four-on-the-floor kick");
assert.ok(rhythms.house.steps[4].includes("clap") && rhythms.house.steps[12].includes("clap"), "house clap should land on beats 2 and 4");
assert.deepEqual(rhythms.reggae.steps[8], ["bass","snare","hihat"], "reggae One Drop should land kick and snare together on beat 3");
assert.equal(rhythms.jazzSwing.stepsPerBeat, 3, "jazz swing must use triplet subdivision");
assert.ok(Object.values(rhythms.jazzSwing.steps).some(hits => hits.includes("ride")), "jazz swing should use a ride cymbal");
assert.match(app, /createDynamicsCompressor/, "drum voices should use a shared dynamics compressor");
assert.match(app, /function drumMetal/, "metallic instruments should use inharmonic partial synthesis");
assert.match(html, /data-drum="hihat"/, "closed hi-hat pad must be present");
assert.match(html, /data-drum="openHat"/, "open hi-hat pad must be present");
assert.match(html, /data-drum="ride"/, "ride pad must be present");

console.log("Smoke tests passed: pitch detection, silence handling, quarter tones, RTL markup, unique IDs, navigation, instruments, selected-string cents, eastern and western rhythm patterns, triplet swing timing, 2/4 rhythm, and responsive CSS.");


assert.match(css, /\.topbar\{[\s\S]*?position:sticky/, "navigation should remain accessible while scrolling");
assert.match(css, /\.workspace\{display:grid/, "tuner workspace should use a clear responsive grid");
assert.match(css, /\.info-grid\{display:grid/, "instruction cards should be separated into a grid");
assert.match(css, /prefers-reduced-motion:reduce/, "reduced motion preference should be respected");
assert.match(css, /@media\(max-width:680px\)/, "mobile layout should be defined");
assert.match(html, /id="siteTitle"/, "main page should have an accessible title");
assert.match(html, /aria-label="صفحة استوديو الإيقاعات"/, "drum page should have a descriptive label");

assert.match(html, /id="maqamVoice"/, "maqam player must expose an instrument voice selector");
const recordedVoices=["piano","electricGuitar","nylonGuitar","steelGuitar","flute","violin","cello","saxophone","qanun"];
for (const voice of recordedVoices) {
  assert.ok(html.includes('value="' + voice + '"'), "missing recorded instrument option: " + voice);
  assert.match(app, new RegExp(voice + ":\\{name:.*?folder:"), "recorded voice must map to local samples: " + voice);
}
for (const voice of ["oud","nay"]) {
  assert.ok(html.includes('value="' + voice + '"'), "missing experimental instrument option: " + voice);
  assert.match(app, new RegExp(voice + ":\\{name:.*?wave:"), "experimental voice must be clearly synthesized: " + voice);
}
assert.match(app, /async function loadMaqamSample/, "recorded samples should load through Web Audio");
assert.match(app, /ctx\.decodeAudioData/, "recorded samples should decode into audio buffers");
assert.match(app, /source\.playbackRate\.setValueAtTime\(Math\.pow\(2,\(midi-sample\[1\]\)\/12\)/, "sample playback must transpose accurately, including quarter tones");
assert.match(app, /async function preloadMaqamSamples/, "scale playback should preload required samples");
assert.match(html, /id="maqamVoiceSource"/, "instrument sample status must be visible");
assert.match(app, /maqamVoice.*addEventListener\("change"/, "changing the instrument voice should update playback");
const bundledSamples=[
  "piano/C1.ogg","piano/C2.ogg","piano/C3.ogg","piano/C4.ogg","piano/C5.ogg","piano/C6.ogg","piano/C7.ogg","piano/C8.ogg",
  "nylon/E2.ogg","nylon/A2.ogg","nylon/E3.ogg","nylon/A3.ogg","nylon/E4.ogg","nylon/E5.ogg",
  "steel/E2.ogg","steel/A2.ogg","steel/E3.ogg","steel/A3.ogg","steel/E4.ogg","steel/E5.ogg",
  "electricGuitar/E2.ogg","electricGuitar/C3.ogg","electricGuitar/C4.ogg","electricGuitar/C5.ogg","electricGuitar/C6.ogg",
  "flute/C4.ogg","flute/C5.ogg","flute/C6.ogg","flute/C7.ogg",
  "violin/G3.ogg","violin/C4.ogg","violin/G4.ogg","violin/C5.ogg","violin/G5.ogg","violin/C6.ogg",
  "cello/C2.ogg","cello/C3.ogg","cello/C4.ogg","cello/C5.ogg",
  "saxophone/E3.ogg","saxophone/C4.ogg","saxophone/E4.ogg","saxophone/A4.ogg","saxophone/C5.ogg","saxophone/E5.ogg",
  "qanun/F3.m4a","qanun/G3.m4a","qanun/A3.m4a","qanun/B3.m4a","qanun/Cs4.m4a","qanun/Ds4.m4a",
  "qanun/F4.m4a","qanun/G4.m4a","qanun/A4.m4a","qanun/B4.m4a","qanun/Cs5.m4a","qanun/Ds5.m4a",
  "qanun/F5.m4a","qanun/G5.m4a","qanun/A5.m4a","qanun/B5.m4a","qanun/Cs6.m4a","qanun/Ds6.m4a"
];
assert.equal(bundledSamples.length,63,"the bundled sample inventory should be complete");
for (const file of bundledSamples) assert.ok(fs.existsSync(path.join(root,"assets/audio",file)),"missing bundled instrument sample: "+file);
assert.match(css, /\.maqam-voice-source/, "sample provenance status should be styled");

assert.match(html, /id="octaveUp"/, "maqam octave raise arrow must be available");
assert.match(html, /id="octaveDown"/, "maqam octave lower arrow must be available");
assert.match(app, /let maqamOctaveShift=0/, "maqam octave shift should start at the selected root octave");
assert.match(app, /baseRoot\+\(maqamOctaveShift\*12\)/, "octave control must transpose by twelve semitones");
assert.match(app, /octaveUp.*addEventListener\("click"/, "right arrow should raise the octave");
assert.match(app, /octaveDown.*addEventListener\("click"/, "left arrow should lower the octave");
assert.match(app, /MAX_MAQAM_OCTAVE=2/, "octave raising should have a safe upper bound");
assert.match(app, /MIN_MAQAM_OCTAVE=-2/, "octave lowering should have a safe lower bound");
assert.match(css, /\.maqam-octave-controls/, "octave controls should have dedicated responsive styling");

assert.match(app, /state\.starting\|\|state\.stream/, "microphone startup should reject duplicate requests");
assert.match(app, /state\.startToken\+\+/, "stopping the tuner should invalidate pending microphone requests");
assert.match(app, /now-state\.lastAnalysisAt>=40/, "pitch detection should be throttled instead of running on every animation frame");
assert.match(app, /if\(token!==pianoState\.playbackToken\)\{voice\.stop\(\);return;\}/, "a late-loaded sample must not play after scale playback is stopped");
assert.match(app, /playPianoNote\(midi,label,\.48,token\)/, "scale sequence cancellation token must reach note playback");

const soundEffects=["crow","forestBirds","rainforest","sea","stream","thunder","wind","rain"];
for(const effect of soundEffects){
  assert.match(html,new RegExp('data-effect="'+effect+'"'),"nature page should expose "+effect);
  assert.match(app,new RegExp(effect+':\\{name:'),"nature sound should map to a real field recording: "+effect);
}
for(const removed of ["glassTap","leaves","gunshot"]) assert.doesNotMatch(html,new RegExp('data-effect="'+removed+'"'),"non-nature or misleading effect removed: "+removed);
assert.match(html,/id="effectsPage"/,"nature sounds must have a dedicated navigable page");
assert.match(html,/data-page="effectsPage"/,"nature sounds page must be reachable from main navigation");
assert.match(html,/id="effectsVolume"/,"nature sounds must expose a volume control");
assert.match(app,/function initSoundEffects\(/,"nature sound controls must be initialized");
assert.match(app,/const effectLibrary=/,"nature sounds must use a data-driven recording library");
assert.match(app,/new Audio\(\)/,"nature sounds must play audio files rather than generated tones");
assert.match(app,/audio\.src=item\.url/,"each sound must load its licensed source file");
assert.match(app,/Special:Redirect\/file\//,"audio must use direct Wikimedia file redirects");
assert.doesNotMatch(app,/effectNoise|effectTone|effectsBus/,"nature sounds must not be generated with Web Audio synthesis");
assert.match(app,/function stopSoundEffect\(/,"the nature sound player must support stopping playback");
assert.match(app,/currentEffectAudio\.volume=effectsVolumeValue/,"the volume control must affect active recordings");
assert.match(html,/id="effectsStop"/,"the page must provide a stop control");
assert.match(html,/id="effectsLoop"/,"the page must provide a loop control for long recordings");
assert.match(css,/\.effects-grid/,"nature sound cards need a responsive grid");
assert.match(css,/\.effect-card:focus-visible/,"sound effect controls must be keyboard accessible");
