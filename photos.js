// Full-screen photo viewer (moved out of index.html).
(() => {
  const entries = Array.from(document.querySelectorAll('.photo-strip img'));
  const dialog = document.getElementById('photo-viewer');
  const image = document.getElementById('viewer-image');
  const count = document.getElementById('photo-count');
  let selected = 0;
  let opener;
  function show(index) {
    selected = (index + entries.length) % entries.length;
    image.src = entries[selected].currentSrc || entries[selected].src;
    image.alt = entries[selected].alt;
    count.textContent = `${selected + 1} מתוך ${entries.length}`;
  }
  document.querySelectorAll('.photo-open').forEach(button => button.addEventListener('click', () => {
    opener = button;
    show(Number(button.dataset.photo));
    dialog.showModal();
    document.body.classList.add('photo-viewing');
  }));
  document.querySelector('.photo-close').addEventListener('click', () => dialog.close());
  document.getElementById('photo-next').addEventListener('click', () => show(selected + 1));
  document.getElementById('photo-prev').addEventListener('click', () => show(selected - 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(selected + 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(selected - 1); }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('photo-viewing');
    opener?.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  let startX;
  image.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; }, {passive:true});
  image.addEventListener('touchend', event => {
    if (startX == null) return;
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 45) show(selected + (delta > 0 ? 1 : -1));
    startX = null;
  }, {passive:true});
})();
