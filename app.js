// Karaoke and player logic - ported verbatim from the approved version.
// parts and timing come from data.js (approved lyrics and 154-word timings).

const lyricLines = parts.flatMap(([section, text]) =>
  text.split('\n').map(line => ({ section, words: line.split(/\s+/) }))
);
let wordNumber = 0;
const indexedLines = lyricLines.map(line => ({
  ...line,
  indices: line.words.map(() => wordNumber++)
}));

const video = document.getElementById('song');
const spoken = document.getElementById('spoken');
const spokenNote = document.getElementById('spoken-note');
const videonote = document.getElementById('videonote');
const bigplay = document.getElementById('bigplay');
const bigplayLabel = bigplay.querySelector('.bigplay-label');
const progressBar = document.getElementById('progress-bar');
const sectionEl = document.getElementById('karaoke-section');
const lineEl = document.getElementById('karaoke-line');
const lyricsEl = document.getElementById('lyrics');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Build the full lyrics with per-word spans, preserving approved sectioning.
const verseEls = [];
const verseSections = [];
const wordVerse = [];
parts.forEach(([name, text], verseIndex) => {
  const section = document.createElement('section');
  section.className = 'verse';
  const h2 = document.createElement('h2');
  h2.textContent = name;
  section.appendChild(h2);
  const spans = [];
  text.split('\n').forEach(line => {
    const p = document.createElement('p');
    line.split(/\s+/).forEach((word, i, arr) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.dataset.word = wordVerse.length;
      wordVerse.push(verseIndex);
      p.appendChild(span);
      if (i < arr.length - 1) p.appendChild(document.createTextNode(' '));
      spans.push(span);
    });
    section.appendChild(p);
  });
  lyricsEl.appendChild(section);
  verseEls.push(spans);
  verseSections.push(section);
});
const allSpans = verseEls.flat();

let activeWord = -1;
let liveLine = null;
let liveSpans = [];
let liveVerse = -1;

function render() {
  const t = video.currentTime;
  if (video.duration) progressBar.style.width = `${Math.min(100, (t / video.duration) * 100)}%`;
  const idx = timing.findIndex((w, i) =>
    t >= w.start && t < (i === timing.length - 1 ? w.end : timing[i + 1].start)
  );
  if (idx === activeWord) return;
  if (activeWord >= 0 && allSpans[activeWord]) allSpans[activeWord].classList.remove('singing');
  liveSpans.forEach(s => s.classList.remove('singing'));
  activeWord = idx;
  const verse = idx >= 0 ? wordVerse[idx] : -1;
  if (verse !== liveVerse) {
    if (verseSections[liveVerse]) verseSections[liveVerse].classList.remove('live');
    if (verseSections[verse]) verseSections[verse].classList.add('live');
    liveVerse = verse;
  }
  const line = indexedLines.find(l => l.indices.includes(idx));
  if (line !== liveLine) {
    liveLine = line;
    liveSpans = [];
    if (line) {
      sectionEl.textContent = line.section;
      lineEl.textContent = '';
      line.words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        lineEl.appendChild(span);
        if (i < line.words.length - 1) lineEl.appendChild(document.createTextNode(' '));
        liveSpans.push(span);
      });
      if (!reduceMotion) {
        lineEl.classList.remove('enter');
        void lineEl.offsetWidth;
        lineEl.classList.add('enter');
      }
    } else {
      sectionEl.textContent = 'המילים יופיעו כאן בזמן השירה';
      lineEl.textContent = '♪';
    }
  }
  if (idx >= 0) {
    if (allSpans[idx]) allSpans[idx].classList.add('singing');
    if (line) {
      const pos = line.indices.indexOf(idx);
      if (pos >= 0 && liveSpans[pos]) liveSpans[pos].classList.add('singing');
    }
  }
}

// Animation loop runs only while the song plays (saves battery on phones).
let rafId = 0;
function tick() {
  render();
  rafId = video.paused || video.ended ? 0 : requestAnimationFrame(tick);
}
function startLoop() { if (!rafId) rafId = requestAnimationFrame(tick); }
video.addEventListener('playing', startLoop);
video.addEventListener('play', startLoop);
// Fallback for when rAF is throttled (e.g. picture-in-picture or background tab).
video.addEventListener('timeupdate', render);

video.addEventListener('play', () => { spoken.pause(); });
video.addEventListener('seeked', () => { activeWord = -2; liveLine = undefined; render(); });
spoken.addEventListener('play', () => { video.pause(); });

// Tap a word in the lyrics to hear the song from that spot.
lyricsEl.addEventListener('click', event => {
  const span = event.target.closest('.word');
  if (!span || !timing[span.dataset.word]) return;
  video.currentTime = Math.max(0, timing[span.dataset.word].start - 0.15);
  playVideo();
  document.getElementById('stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
});

// Big play button, loading and error states.
const failText = 'טעינת הסרטון לא הצליחה. אפשר לרענן ולנסות שוב.';
let failed = false;
let waitTimer;
function showNote(text, isError) {
  videonote.textContent = text;
  videonote.classList.toggle('error', !!isError);
  videonote.classList.remove('hidden');
}
function hideNote() {
  clearTimeout(waitTimer);
  if (!failed) videonote.classList.add('hidden');
}
function fail() {
  failed = true;
  clearTimeout(waitTimer);
  bigplay.hidden = true;
  showNote(failText, true);
}
function playVideo() {
  if (failed) return;
  const attempt = video.play();
  if (attempt && attempt.catch) attempt.catch(err => {
    if (err && err.name === 'NotAllowedError') return; // user can press play in the controls
    if (video.error) fail();
  });
}

bigplay.addEventListener('click', () => {
  if (video.ended) video.currentTime = 0;
  playVideo();
});
video.addEventListener('play', () => { bigplay.hidden = true; document.body.classList.add('song-started'); });
video.addEventListener('waiting', () => {
  clearTimeout(waitTimer);
  waitTimer = setTimeout(() => { if (!video.paused) showNote('טוען את השיר…'); }, 700);
});
video.addEventListener('playing', hideNote);
video.addEventListener('pause', hideNote);
video.addEventListener('ended', () => {
  bigplayLabel.textContent = 'לשמוע שוב';
  bigplay.hidden = false;
  celebrate();
});
video.addEventListener('error', fail);
const source = video.querySelector('source');
if (source) source.addEventListener('error', fail);
if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();

function spokenFailed() {
  spokenNote.textContent = 'טעינת ההקראה לא הצליחה. אפשר לרענן ולנסות שוב.';
  spokenNote.hidden = false;
}
spoken.addEventListener('error', spokenFailed);
if (spoken.error) spokenFailed();

// A small burst of confetti when the song ends.
function celebrate() {
  if (reduceMotion) return;
  const frame = document.querySelector('.frame');
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#c98a2b', '#7a3b4f', '#f3d9a8', '#4a6b4f', '#e6a3b4'];
  for (let i = 0; i < 46; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--d', `${(Math.random() * 0.8).toFixed(2)}s`);
    piece.style.setProperty('--r', `${Math.round(Math.random() * 720 - 360)}deg`);
    piece.style.background = colors[i % colors.length];
    layer.appendChild(piece);
  }
  frame.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);
}
