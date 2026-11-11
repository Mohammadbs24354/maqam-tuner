# Maqam Tuner

**Maqam Tuner** is a browser-based musical toolkit for tuning string instruments, exploring Arabic maqamat, and practising with interactive rhythm patterns. The interface is Arabic and right-to-left (RTL), with responsive layouts for desktop and mobile screens.

- **Live tuner:** microphone-based pitch detection, string reference tones, cents deviation, and editable string frequencies.
- **Maqam explorer:** interactive scale degrees, quarter-tone notes, instrument voices, and octave transposition.
- **Rhythm studio:** playable drum pads, ready-made Eastern and Western patterns, tempo control, and keyboard shortcuts.\n- **Sound effects:** eight real nature field recordings hosted on Wikimedia Commons, with volume, loop, and stop controls.

**Live application:** https://mohammadbs24354.github.io/maqam-tuner/  
**Source code:** https://github.com/Mohammadbs24354/maqam-tuner

## Features

### Instrument tuner

The tuner currently includes presets for:

- Oud
- Guitar (standard and Drop D)
- Buzuq
- Western violin
- Eastern violin

Select a string to compare its detected pitch with the selected reference. The tuner displays the detected note, octave, frequency in Hz, and deviation in cents. Double-click a string card to enter a custom reference frequency.

Eastern instrument tunings vary by region, school, string count, and performer. The included oud, buzuq, and Eastern violin presets are starting points, not universal standards.

### Maqam explorer

Explore nine ascending scale templates:

- Bayati
- Kurd
- Saba
- Sikah
- Hijaz
- Huzam
- Ajam
- Nahawand
- Rast

Choose a root note, play individual scale degrees, or play the complete scale. Quarter-tone positions are represented as fractional MIDI note values. The octave controls transpose the selected maqam by one octave per step, within a two-octave range in either direction.

The voice selector includes sampled instruments and experimental synthesized voices:

| Voice | Playback source |
| --- | --- |
| Piano | Recorded samples |
| Electric guitar | Recorded samples |
| Nylon-string guitar | Recorded samples |
| Steel-string guitar | Recorded samples |
| Flute | Recorded samples |
| Violin | Recorded samples |
| Cello | Recorded samples |
| Saxophone | Recorded samples |
| Qanun | Recorded Turkish qanun samples |
| Oud | Experimental synthesized tone |
| Nay | Experimental synthesized tone |

Recorded notes are loaded on demand, decoded through the Web Audio API, and cached in memory for the current page session. Notes between recorded sample pitches are played using playback-rate transposition. This is not a full multisampled instrument: large pitch shifts can change the natural timbre. The oud and nay options are synthesized approximations, not acoustic recordings.

### Rhythm studio

The rhythm studio provides **14 preset patterns**.

**Eastern**
- Maqsum
- Baladi
- Malfuf
- Saidi
- Wahda

**Western**
- Jazz swing
- Blues shuffle
- House
- Deep house
- Disco
- Rock
- Funk
- Reggae
- Bossa nova

The tempo control ranges from 50 to 180 BPM. Users can also play individual percussion sounds while a pattern is running. The drum voices are synthesized in the browser using the Web Audio API; they are not recorded drum samples.

## Sound effects\n\nThe sound-effects library currently includes glass tapping, a stylized crow call, rustling leaves, ocean surf, breaking glass, thunder, a cinematic gunshot, wind, and rain. These effects are synthesized locally with the Web Audio API; they are not field recordings or downloaded sound files. The effects have a separate volume control and require a user click to start audio playback.\n\n## Technology

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Web Audio API
- MediaDevices API (getUserMedia)
- GitHub Actions
- GitHub Pages

There is no framework, package manager, build step, backend service, database, or API key required by the current application.

## Run locally

Microphone access requires a secure context. Use HTTPS or localhost; opening the HTML file directly may prevent microphone access.

With Python installed:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also use any local static-file server.

## Tests

The project includes a dependency-free Node.js smoke test suite.

```bash
node --check app.js
node tests/smoke.test.js
```

The tests cover JavaScript syntax, pitch detection against generated test tones, silence handling, quarter-tone naming, HTML IDs and navigation targets, instrument and rhythm configuration, bundled audio-file presence, octave controls, public-domain nature recording source mapping and playback controls, and selected accessibility/responsive-style safeguards.

These are automated source-level and algorithm tests. They do **not** replace real-browser testing of microphone permissions, audio playback, device compatibility, latency, or visual rendering.

## Project structure

```text
.
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── audio/
│       ├── ATTRIBUTION.md
│       ├── piano/
│       ├── electricGuitar/
│       ├── nylon/
│       ├── steel/
│       ├── flute/
│       ├── violin/
│       ├── cello/
│       ├── saxophone/
│       └── qanun/
├── tests/
│   └── smoke.test.js
└── .github/
    └── workflows/
        └── deploy.yml
```

- index.html contains the page structure and Arabic UI.
- styles.css contains the visual system and responsive layouts.
- app.js contains tuner logic, maqam playback, sample loading, drum synthesis, rhythm scheduling, nature recording playback, and navigation.
- assets/audio contains the recorded instrument samples and their attribution details.
- tests/smoke.test.js contains the Node.js smoke tests.
- .github/workflows/deploy.yml validates the JavaScript, runs the tests, and deploys the site to GitHub Pages on pushes to main.

## Architecture and scalability

The current application is a **client-side static web app**. Its main responsibilities are separated into HTML, CSS, JavaScript, audio assets, tests, and a deployment workflow. Instrument tunings, maqam definitions, voice profiles, and rhythm patterns are data-driven, which makes adding another preset relatively straightforward.

The current codebase is intentionally lightweight and does not need a server for its core features. Microphone input, pitch analysis, sample playback, and drum synthesis run in the visitor's browser. This keeps hosting and operational complexity low.

There are, however, important limits to the current architecture:

1. **The JavaScript is still a monolith.** The application is wrapped in one IIFE, but tuner, maqam, audio, rhythm, and navigation code live in the same app.js file. As features grow, this increases coupling and makes isolated testing harder.
2. **There is no persistent user data.** Custom string frequencies, saved rhythms, and preferences are not stored across sessions. The current app does not use Local Storage, IndexedDB, or a database.
3. **There is no backend or account system.** User profiles, cloud sync, sharing, collaborative features, and server-managed content would require additional services.
4. **Audio processing is browser/device dependent.** Pitch detection and audio scheduling share browser resources with the interface. Low-powered phones, background tabs, microphone processing, and browser audio policies need real-device testing.
5. **Sample coverage is intentionally limited.** The sample library uses a small number of reference pitches per instrument and transposes them. It is compact, but it cannot reproduce the range and articulation of a professionally multisampled instrument.
6. **Automated tests are not end-to-end browser tests.** The current CI checks syntax, source-level behavior, and deployment. It does not automate microphone or speaker tests.

### Recommended evolution path

The application does not need an immediate rewrite. A gradual path is safer:

1. Split app.js into feature modules: tuner, maqam, rhythm, audio-engine, and shared instrument/scale data.
2. Add browser-based integration tests for navigation, tuner lifecycle, sample loading, playback cancellation, rhythm start/stop, and mobile layouts.
3. Add persistent settings with Local Storage first; use IndexedDB for larger user-created recordings, sample caches, or rhythm libraries.
4. Keep audio processing on the client. If pitch analysis becomes a performance bottleneck, move the DSP work away from the UI thread and profile it on lower-end mobile devices.
5. Load optional instrument samples lazily and consider a CDN or object storage if the sample library or traffic grows substantially.
6. Introduce a backend and database only when features genuinely need accounts, cloud synchronization, shared libraries, or server-managed data.
7. Add versioned data schemas and migration tests before introducing saved user-created tunings or rhythms.

**Scalability assessment:** the current static architecture is a sensible foundation for a free, browser-based tuner and practice tool. Static delivery can serve many visitors efficiently, but the current code organization is only moderately scalable: the data-driven presets are a strength, while the single JavaScript file, lack of persistence, and limited end-to-end coverage are the main constraints. Refactoring incrementally before adding account-based or collaborative features will reduce future migration risk.

## Privacy

Microphone audio is processed locally in the browser for pitch detection. The application does not upload microphone audio to an application backend. Microphone access is requested only when the user starts the tuner.

## Audio sample credits

Recorded instrument samples have separate source and license terms. See [assets/audio/ATTRIBUTION.md](assets/audio/ATTRIBUTION.md) before redistributing or reusing them.

The repository does not currently declare a project-wide software license. Do not assume that the source code or bundled audio assets are all released under the same license.

## Deployment

The main branch is deployed to GitHub Pages by GitHub Actions. The workflow runs:

1. node --check app.js
2. node tests/smoke.test.js
3. GitHub Pages artifact upload and deployment

GitHub Pages is a static hosting platform. If the application later requires server-side functionality, move those responsibilities to a dedicated backend or managed service rather than trying to run them on GitHub Pages.

## Roadmap

- [ ] Split the application into maintainable JavaScript modules.
- [ ] Add browser-based end-to-end tests.
- [ ] Add saved custom tunings and user-created rhythm patterns.
- [ ] Expand instrument sample coverage and add robust sample-loading fallbacks.
- [ ] Test microphone and audio behavior across desktop and mobile browsers.
- [ ] Consider optional accounts and cloud synchronization only when needed.
