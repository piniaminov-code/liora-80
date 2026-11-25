// "Fullscreen" and "Add to home screen" controls, plus service worker registration.
// Honest about platform support: buttons only appear where they can actually work.
(() => {
  const tools = document.getElementById('app-tools');
  const fsButton = document.getElementById('fs-button');
  const fsLabel = fsButton.querySelector('.tool-label');
  const installButton = document.getElementById('install-button');
  const sheet = document.getElementById('install-sheet');
  const iosHelp = document.getElementById('install-ios');
  const otherHelp = document.getElementById('install-other');

  // Note: Chrome also reports display-mode "fullscreen" while a normal tab uses the
  // Fullscreen API, so that case is only treated as installed when no element is fullscreen.
  const standaloneQuery = window.matchMedia('(display-mode: standalone), (display-mode: minimal-ui)');
  const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  const isStandalone = () => standaloneQuery.matches ||
    (fullscreenQuery.matches && !fsElement()) ||
    window.navigator.standalone === true;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const root = document.documentElement;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
    !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  let deferredPrompt = null;

  function update() {
    const standalone = isStandalone();
    fsButton.hidden = standalone || !fsSupported;
    installButton.hidden = standalone;
    tools.hidden = fsButton.hidden && installButton.hidden;
    const on = !!fsElement();
    fsLabel.textContent = on ? 'יציאה ממסך מלא' : 'מסך מלא';
    fsButton.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  fsButton.addEventListener('click', () => {
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      const result = request.call(root);
      if (result && result.catch) result.catch(() => {});
    }
  });
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installButton.hidden = true;
    tools.hidden = fsButton.hidden;
  });

  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      prompt.prompt();
      try { await prompt.userChoice; } catch (e) { /* ignored */ }
      return;
    }
    iosHelp.hidden = !isIOS;
    otherHelp.hidden = isIOS;
    sheet.showModal();
  });
  sheet.querySelector('.sheet-close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
  sheet.addEventListener('close', () => installButton.focus({ preventScroll: true }));

  [standaloneQuery, fullscreenQuery].forEach(q => q.addEventListener && q.addEventListener('change', update));
  update();

  // Offline support for the page shell only (see sw.js). Needs https or localhost.
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
