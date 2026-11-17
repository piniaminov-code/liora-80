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
const videonote = document.getElementById('videonote');
const sectionEl = document.getElementById('karaoke-section');
const lineEl = document.getElementById('karaoke-line');
const lyricsEl = document.getElementById('lyrics');

// Build the full lyrics with per-word spans, preserving approved sectioning.
const verseEls = [];
let cursor = 0;
parts.forEach(([name, text]) => {
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
      p.appendChild(span);
      if (i < arr.length - 1) p.appendChild(document.createTextNode(' '));
      spans.push(span);
    });
    section.appendChild(p);
  });
  lyricsEl.appendChild(section);
  verseEls.push(spans);
});
const allSpans = verseEls.flat();

let activeWord = -1;
let liveLine = null;
let liveSpans = [];

function render() {
  const t = video.currentTime;
  const idx = timing.findIndex((w, i) =>
    t >= w.start && t < (i === timing.length - 1 ? w.end : timing[i + 1].start)
  );
  if (idx === activeWord) return;
  if (activeWord >= 0 && allSpans[activeWord]) allSpans[activeWord].classList.remove('singing');
  liveSpans.forEach(s => s.classList.remove('singing'));
  activeWord = idx;
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

function tick() {
  if (!video.paused) render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

video.addEventListener('play', () => { spoken.pause(); });
video.addEventListener('seeked', () => { activeWord = -2; liveLine = undefined; render(); });
spoken.addEventListener('play', () => { video.pause(); });

video.addEventListener('canplay', () => videonote.classList.add('hidden'));
video.addEventListener('play', () => videonote.classList.add('hidden'));
video.addEventListener('error', () => {
  videonote.textContent = 'טעינת הסרטון לא הצליחה. אפשר לרענן ולנסות שוב.';
  videonote.classList.add('error');
  videonote.classList.remove('hidden');
});
const source = video.querySelector('source');
if (source) source.addEventListener('error', () => {
  videonote.textContent = 'טעינת הסרטון לא הצליחה. אפשר לרענן ולנסות שוב.';
  videonote.classList.add('error');
  videonote.classList.remove('hidden');
});
