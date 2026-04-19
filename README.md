# Test-animate

A single-page scroll-animation proof of concept, inspired by sites like
animejs.com and apple.com's product pages. Built as a static site with no
build step — open `index.html` directly or serve the folder.

Live preview: deployed to GitHub Pages from `main` at
`https://borisui.github.io/test-animate/`.

## What's in the page

The page is a vertical stack of sections. Each section demonstrates one
animation technique:

1. **Hero** — Eyebrow, headline (split into word/letter spans), lede, and a
   row of shapes all animate in on page load via an anime.js timeline. The
   hero shapes are clickable (spin + pulse) and there's a "Replay intro"
   button that re-runs the timeline.
2. **Scroll to play** — A row of shapes that translate, rotate, and fade in
   tied directly to the section's viewport progress. Scroll up and the
   animation reverses.
3. **Word-by-word reveal** — A paragraph where each word's color and Y
   offset interpolate from dim to bright as the section scrolls past.
4. **Beat. (pinned)** — An SVG heart that pulses in a lub-dub rhythm
   scrubbed against scroll. The section pins to the viewport for its
   duration.
5. **Video scrub (pinned)** — Full-viewport video whose `currentTime` is
   driven by scroll progress across a 200%-viewport pin.
6. **Phyllotaxis dot sequence (pinned)** — Image-sequence scrub: 80 SVG
   frames of a sunflower-seed dot pattern that grows and rotates.
7. **Camera lens (pinned)** — Image-sequence scrub: 80 SVG frames of a
   stylised lens with rotating tick ring, counter-rotating focus-distance
   scale, and a seven-blade aperture opening/closing.

## Tech stack

Three animation systems coexist in the page, each used where it's the
best fit:

- **anime.js v3.2.2** (CDN) — Time-based intro timeline for the hero.
  Also powers the shape click-pokes.
- **Hand-rolled scroll handler** (~25 lines) — Drives the non-pinned
  scroll-linked sections (2 and 3). Each animation is created with
  `autoplay: false`; a single `requestAnimationFrame`-throttled scroll
  listener calls `anim.seek(progress * anim.duration)` per section, with
  `sectionProgress()` computing 0→1 from `getBoundingClientRect()`.
- **GSAP 3.12.5 + ScrollTrigger** (CDN) — Pinned scrub sections (4–7).
  Pinning while scroll distance accumulates is ScrollTrigger's core
  feature; doing it by hand is painful.

No build tooling, no bundler, no package.json. Everything ships as
static files served from the repo root.

## File layout

```
index.html              # the entire page (HTML + CSS + JS inline)
scrub-video.mp4         # 5.3MB MP4 used by the video-scrub section
frames/                 # 80 SVG frames for the phyllotaxis section
lens-frames/            # 80 SVG frames for the camera-lens section
generate-frames.js      # Node script that regenerates frames/
generate-lens-frames.js # Node script that regenerates lens-frames/
```

No subfolders for JS/CSS — it's a single-file page on purpose (POC).

## Branch and deployment

- **Develop on `main`.** The user explicitly moved development to `main`
  so GitHub Pages picks it up automatically.
- Do not push to other branches without explicit user permission.
- Commit with descriptive messages, push with `git push -u origin main`;
  retry up to 4× with exponential backoff (2s/4s/8s/16s) on network
  failures only.
- Pages serves the repo root; changes go live ~30–60 seconds after push.

## Adding a new pinned image-sequence section

The image-sequence scrub is factored into a helper in `index.html`:

```js
createImageSequence({
  triggerId: "lensSeq",       // id of the <section>
  canvasId: "lensCanvas",     // id of the <canvas> inside it
  dir: "lens-frames",         // folder with frame_000.svg … frame_NNN.svg
  frames: 80,                 // how many frames
});
```

So adding a new sequence is three steps:

1. Write a generator script like `generate-lens-frames.js` that emits
   `your-dir/frame_000.svg` through `frame_079.svg` (zero-padded to 3
   digits).
2. Add a matching `<section class="image-seq" id="yourSeq">` with a
   `<canvas>` inside (800×800 internal bitmap is the convention here).
3. Call `createImageSequence({...})` in the script block.

Each frame is a full-document SVG with `viewBox="0 0 400 400"` and the
same dark `#0f1020` background as the page. Frames are preloaded as
`Image` objects and drawn into the canvas on every scroll tick.

## Why a canvas for the image sequence?

- **No flicker on src swaps.** Setting `<img src>` on every scroll tick
  can briefly show a blank while the next frame decodes. A canvas holds
  the last-drawn pixels until you `clearRect`.
- **One DOM element** instead of N stacked images with display toggling.
- **Compositing / overlays** can be drawn on top without DOM work.
- **Retina handling**: internal bitmap (800×800) is independent of CSS
  display size (~600×600), so it stays crisp on phones.
- Tradeoff: canvas isn't accessible — add an `aria-label` on the canvas
  if the sequence carries meaning.

## Scroll-scrubbed video notes

- The video is hosted inside the repo (`scrub-video.mp4`) because
  every third-party CDN URL tried (Google sample bucket, test-videos.co.uk,
  MDN) either failed due to network/CORS or returned errors from this
  environment's allowlist. Relative path → same origin → no variables.
- The `<video>` has `muted`, `playsinline`, `preload="auto"` so iOS Safari
  will seek without requiring a user gesture. We also call
  `video.play().then(() => video.pause())` on `loadeddata` which nudges
  iOS into allowing smooth scrubbing.
- `ScrollTrigger` is set up unconditionally (not gated on
  `loadedmetadata`) so the section always pins even if the video is
  slow/failed to load. `onUpdate` guards with `isFinite(duration)`.
- Scrub smoothness depends on the video's keyframe density. This file
  wasn't re-encoded with dense keyframes, so scrubbing can stutter,
  especially on mobile. To fix, re-encode with `ffmpeg -g 1 -c:v libx264
  -crf 22` (keyframe every frame). ffmpeg isn't installed in this
  environment, so this is a manual step for the user.

## Hand-rolled scroll helper (non-pinned sections)

For sections 2 and 3, each animation is created with `autoplay: false`
and listed in a `linked` array. A single scroll handler runs through
`linked`, computes `sectionProgress(el)` using `getBoundingClientRect`,
and calls `anim.seek(progress * anim.duration)`. Progress maps 0→1 from
the moment the section's top enters the viewport bottom to the moment
its bottom leaves the viewport top — i.e. the section's entire travel
across the screen.

This is intentionally not using a library. For anything more complex
(pinning, snapping, horizontal scroll, multi-phase timelines) switch to
GSAP ScrollTrigger.

## Regenerating the frame sequences

```
node generate-frames.js       # → frames/frame_000.svg … frame_079.svg
node generate-lens-frames.js  # → lens-frames/frame_000.svg … frame_079.svg
```

Both scripts are deterministic. Tweak the constants at the top of each
(frame count, geometry, colors, rotations) and rerun.

## Known quirks and things that have bitten us

- **Third-party video URLs are unreliable** from this sandbox and from
  GitHub Pages — prefer hosting assets locally in the repo.
- **Don't gate ScrollTrigger setup on a media `loadedmetadata` event**
  that might never fire on mobile. Create the trigger immediately and
  handle missing data inside `onUpdate`.
- **Video scrub stutters with sparse keyframes.** If smoothness matters
  more than file size, re-encode for scrubbing.
- **No build step** — keep everything inline in `index.html` unless the
  file genuinely becomes unmanageable.

## Local development

Any static server works:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly via `file://` mostly works, but some
browsers block cross-origin frame loads from `file://`, so a local
server is the safer bet when adding new sequences.
