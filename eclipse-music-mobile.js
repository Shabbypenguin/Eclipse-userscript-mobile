// ==UserScript==
// @name         Eclipse Mobile Layout
// @description  Turns the Eclipse web player's fixed sidebar into a slide-out drawer on narrow screens.
// @version      0.9.0
// @match        https://eclipsemusic.app/*
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // mobile layout: any tiny window, or a touch screen up to tablet-portrait width.
  // Desktop windows and tablets held sideways keep the app's own layout.
  const SMALL_ANY = 700;      // px, any device
  const SMALL_TOUCH = 1100;   // px, touch-first devices (phones, tablets upright)
  const MQ = `(max-width: ${SMALL_ANY - 1}px), (pointer: coarse) and (max-width: ${SMALL_TOUCH - 1}px)`;
  const NAV_LABELS = ['Addon Store', 'Discover', 'Replay', 'Library'];
  const ATTR = 'data-ecm';
  const FIX_ATTRS = ['data-ecm-ml', 'data-ecm-pl', 'data-ecm-pr', 'data-ecm-mr', 'data-ecm-bleed', 'data-ecm-l', 'data-ecm-tx', 'data-ecm-grid', 'data-ecm-w', 'data-ecm-player', 'data-ecm-hide', 'data-ecm-shrink', 'data-ecm-ctrl', 'data-ecm-progress', 'data-ecm-scroll', 'data-ecm-pgrid', 'data-ecm-keepw', 'data-ecm-hdr', 'data-ecm-hdrtitle', 'data-ecm-pills', 'data-ecm-art', 'data-ecm-ctrlcol', 'data-ecm-heart', 'data-ecm-setwrap', 'data-ecm-setnav', 'data-ecm-setlist', 'data-ecm-setmain', 'data-ecm-srow', 'data-ecm-stext', 'data-ecm-sctl', 'data-ecm-lift'];

  const mql = window.matchMedia(MQ);
  const narrow = () => mql.matches;
  const vwidth = () => document.documentElement.clientWidth;

  // ---- viewport ----
  function fixViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    // maximum-scale stops iOS auto-zooming into small text fields; user pinch-zoom still works on iOS 10+
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';
  }

  // ---- styles (stylesheet !important beats the app's inline styles) ----
  function injectCSS() {
    if (document.getElementById('ecm-style')) return;
    const s = document.createElement('style');
    s.id = 'ecm-style';
    s.textContent = `
      @media ${MQ} {
        html, body { overflow-x: hidden !important; max-width: 100vw !important; }

        [${ATTR}="layout"] { display: block !important; grid-template-columns: 1fr !important; }

        [${ATTR}="sidebar"] {
          position: fixed !important;
          top: 0 !important; left: 0 !important; bottom: 0 !important;
          width: min(82vw, 320px) !important; max-width: none !important;
          height: 100dvh !important; margin: 0 !important;
          padding-top: env(safe-area-inset-top) !important;
          overflow-y: auto !important;
          z-index: 99998 !important;
          transform: translateX(-105%) !important;
          transition: transform .22s ease !important;
        }
        body.ecm-open [${ATTR}="sidebar"] { transform: translateX(0) !important; }
        /* menu open: its button goes away; tap outside or pick an item to close */
        body.ecm-open #ecm-toggle { display: none !important; }

        [${ATTR}="content"] {
          width: 100% !important; max-width: 100vw !important; min-width: 0 !important;
          margin-left: 0 !important; flex: 1 1 auto !important;
          padding-top: calc(env(safe-area-inset-top) + 52px) !important;
          box-sizing: border-box !important;
        }

        /* mini player: span the screen with a small gutter, above the home indicator */
        [data-ecm-player] {
          left: 8px !important; right: 8px !important;
          width: auto !important; max-width: none !important;
          margin-left: 0 !important; margin-right: 0 !important;
          bottom: calc(env(safe-area-inset-bottom) + 8px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        [data-ecm-hide]   { display: none !important; }
        [data-ecm-shrink] { min-width: 0 !important; flex-shrink: 1 !important; }
        [data-ecm-ctrl]   { gap: 6px !important; flex-shrink: 0 !important; transform: translateY(-5px) !important; }
        /* controls hug the right edge instead of centring in a wider column */
        [data-ecm-ctrlcol] { align-items: flex-end !important; justify-self: end !important; margin-right: -6px !important; }
        /* full now-playing screen: nudge its header so the menu button doesn't touch it */
        body.ecm-np [data-ecm-npshift] { padding-left: 8px !important; }
        [data-ecm-heart] { padding: 6px !important; flex-shrink: 0 !important; }
        /* title/artist (and heart) sit a bit higher, centred above the seek bar like the controls */
        [data-ecm-lift] { transform: translateY(-5px) !important; }
        [data-ecm-heart] svg { width: 20px !important; height: 20px !important; }
        [data-ecm-art] { width: 44px !important; height: 44px !important; flex: 0 0 44px !important; }
        /* seek bar runs under the title + controls only, not under the artwork */
        [data-ecm-progress] {
          position: absolute !important;
          left: 72px !important; right: 16px !important; bottom: 7px !important;
          width: auto !important; margin: 0 !important; padding: 0 !important;
        }
        [data-ecm-progress] *:not(input) { max-width: 100% !important; }

        /* room at the end of the page so the last rows can scroll above the player */
        [data-ecm-scroll], body.ecm-docscroll {
          padding-bottom: calc(var(--ecm-ph, 80px) + 24px + env(safe-area-inset-bottom)) !important;
        }

        /* generic un-offset fixes applied to the main content's ancestor chain */
        [data-ecm-ml]   { margin-left: 0 !important; }
        [data-ecm-pl]   { padding-left: 12px !important; }
        [data-ecm-pr]   { padding-right: 12px !important; }
        [data-ecm-mr]   { margin-right: 0 !important; }
        [data-ecm-l]    { left: 0 !important; }
        [data-ecm-tx]   { transform: none !important; }
        [data-ecm-grid] { grid-template-columns: 1fr !important; }
        [data-ecm-w]:not([data-ecm-bleed]) { width: 100% !important; max-width: 100% !important;
                          min-width: 0 !important; box-sizing: border-box !important; }
        /* horizontal rows run edge to edge; first card still lines up with the gutter */
        [data-ecm-bleed][data-ecm-bleed] {
          width: calc(100% + 2 * var(--ecm-bleed, 12px)) !important; max-width: none !important;
          margin-left: calc(-1 * var(--ecm-bleed, 12px)) !important;
          margin-right: calc(-1 * var(--ecm-bleed, 12px)) !important;
          padding-left: var(--ecm-bleed, 12px) !important;
          padding-right: var(--ecm-bleed, 12px) !important;
          scroll-padding-left: var(--ecm-bleed, 12px) !important;
          box-sizing: border-box !important;
        }
        /* section header with pill tabs: title on its own line, tabs as a swipeable edge-to-edge row */
        [data-ecm-hdr]      { flex-wrap: wrap !important; row-gap: 10px !important; }
        [data-ecm-hdrtitle] { flex: 1 1 100% !important; }
        [data-ecm-pills] {
          flex: 0 0 calc(100% + 24px) !important; max-width: none !important;
          display: flex !important; flex-wrap: nowrap !important; justify-content: flex-start !important;
          overflow-x: auto !important; margin: 0 -12px !important; padding: 0 12px !important;
          box-sizing: border-box !important; scrollbar-width: none !important;
        }
        [data-ecm-pills]::-webkit-scrollbar { display: none !important; }
        [data-ecm-pills] > * { flex-shrink: 0 !important; }
        /* settings: icon rail on top as a swipeable strip, settings full width below */
        [data-ecm-setwrap] { flex-direction: column !important; gap: 14px !important; }
        [data-ecm-setnav] {
          width: auto !important; max-width: none !important; height: auto !important;
          position: static !important; overflow-x: auto !important; overflow-y: hidden !important;
          margin: 0 -12px !important; padding: 0 12px !important; scrollbar-width: none !important;
          flex: 0 0 auto !important;
        }
        [data-ecm-setnav]::-webkit-scrollbar { display: none !important; }
        [data-ecm-setlist] {
          display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important;
          gap: 6px !important; height: auto !important;
        }
        [data-ecm-setlist] > * { flex-shrink: 0 !important; }
        [data-ecm-setmain] { width: 100% !important; max-width: none !important; }
        /* setting rows: text keeps a readable width; wide controls drop to their own line */
        [data-ecm-srow]  { flex-wrap: wrap !important; row-gap: 10px !important; }
        [data-ecm-stext] { flex: 1 1 170px !important; min-width: 0 !important; }
        [data-ecm-sctl]  { margin-left: auto !important; max-width: 100% !important; flex: 0 1 auto !important; }
        /* player: art+title column flexes, controls column keeps its natural width */
        [data-ecm-pgrid] { grid-template-columns: minmax(0, 1fr) auto !important; column-gap: 12px !important; }
        [data-ecm-keepw] { min-width: max-content !important; flex-shrink: 0 !important; }

        #ecm-toggle {
          display: flex !important;
          position: fixed; z-index: 99999;
          top: calc(env(safe-area-inset-top) + 8px); left: 8px;
          width: 34px; height: 34px; border-radius: 10px; padding: 0;
          align-items: center; justify-content: center;
          background: rgba(20, 28, 48, .85); color: #fff;
          border: 1px solid rgba(255,255,255,.12);
          line-height: 0;
          -webkit-user-select: none; user-select: none;
          -webkit-touch-callout: none;
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
        }
        #ecm-toggle svg { display: block; width: 16px; height: 16px; }
        #ecm-backdrop {
          position: fixed; inset: 0; z-index: 99997;
          background: rgba(0,0,0,.45);
          opacity: 0; pointer-events: none; transition: opacity .22s ease;
        }
        body.ecm-open #ecm-backdrop { opacity: 1; pointer-events: auto; }
      }
      #ecm-toast {
        position: fixed; z-index: 100000; left: 50%; bottom: 20px;
        transform: translateX(-50%);
        background: #b42318; color: #fff; padding: 8px 12px; border-radius: 8px;
        font: 13px/1.3 system-ui, sans-serif;
      }
      #ecm-debug {
        position: fixed; z-index: 100001; inset: 12px;
        display: flex; flex-direction: column; gap: 8px;
        background: #111; color: #eee; border: 1px solid #444; border-radius: 10px;
        padding: 10px; font: 13px system-ui, sans-serif;
      }
      #ecm-debug textarea {
        flex: 1; width: 100%; box-sizing: border-box;
        background: #000; color: #9f9; border: 1px solid #333;
        font: 10px/1.35 ui-monospace, Menlo, monospace; white-space: pre;
      }
      #ecm-debug .row { display: flex; gap: 8px; }
      #ecm-debug button {
        flex: 1; padding: 10px; border-radius: 8px; border: 0;
        background: #2b6cb0; color: #fff; font: 15px system-ui, sans-serif;
      }
    `;
    document.head.appendChild(s);
  }

  // ---- controls ----
  function close() { document.body.classList.remove('ecm-open'); }

  function injectControls() {
    if (!document.getElementById('ecm-toggle')) {
      const b = document.createElement('button');
      b.id = 'ecm-toggle';
      b.type = 'button';
      b.setAttribute('aria-label', 'Menu');
      b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
      b.style.display = 'none';

      // tap = toggle drawer; long-press (0.7s) = debug panel
      let pressTimer = null, longFired = false;
      b.addEventListener('touchstart', () => {
        longFired = false;
        pressTimer = setTimeout(() => { longFired = true; openDebug(); }, 700);
      }, { passive: true });
      const cancel = () => clearTimeout(pressTimer);
      b.addEventListener('touchend', cancel);
      b.addEventListener('touchmove', cancel, { passive: true });
      b.addEventListener('click', e => {
        if (longFired) { e.preventDefault(); longFired = false; return; }
        document.body.classList.toggle('ecm-open');
      });
      document.body.appendChild(b);
    }
    if (!document.getElementById('ecm-backdrop')) {
      const d = document.createElement('div');
      d.id = 'ecm-backdrop';
      d.addEventListener('click', close);
      document.body.appendChild(d);
    }
  }

  // ---- sidebar detection (by visible nav text, not class names) ----
  function findLabel() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const wanted = new Set(NAV_LABELS);
    let n;
    while ((n = walker.nextNode())) {
      if (wanted.has(n.nodeValue.trim())) return n.parentElement;
    }
    return null;
  }

  // the app can swap out the page or player under a surviving sidebar: re-mark each pass
  function markSiblings(el, layout) {
    if (!layout || layout === document.body) return;
    if (layout.getAttribute(ATTR) !== 'layout') layout.setAttribute(ATTR, 'layout');
    for (const sib of layout.children) {
      if (sib === el || sib.id.startsWith('ecm-') || sib.hasAttribute(ATTR)) continue;
      // overlays (mini player etc.) are siblings too; don't treat them as page content
      const pos = getComputedStyle(sib).position;
      sib.setAttribute(ATTR, (pos === 'fixed' || pos === 'absolute') ? 'overlay' : 'content');
    }
  }

  function detectSidebar() {
    const existing = document.querySelector(`[${ATTR}="sidebar"]`);
    if (existing && existing.isConnected) {
      markSiblings(existing, existing.parentElement);
      return existing;
    }

    const label = findLabel();
    if (!label) return null;

    const vw = vwidth();
    let el = label;
    while (
      el.parentElement &&
      el.parentElement !== document.body &&
      el.parentElement.getBoundingClientRect().width < vw * 0.9
    ) {
      el = el.parentElement;
    }
    const layout = el.parentElement;
    if (!layout || layout === document.body) return null;
    if (el.getBoundingClientRect().height < window.innerHeight * 0.4) return null;

    document.querySelectorAll(`[${ATTR}]`).forEach(x => x.removeAttribute(ATTR));
    el.setAttribute(ATTR, 'sidebar');
    markSiblings(el, layout);

    if (!el.dataset.ecmBound) {
      el.dataset.ecmBound = '1';
      el.addEventListener('click', e => {
        if (e.target.closest('input, textarea, select')) return;
        setTimeout(close, 120);
      });
    }
    return el;
  }

  // ---- generic content fix: probe points in the content area, strip left offsets up the chain ----
  function probeElements() {
    const vw = vwidth(), vh = window.innerHeight;
    const pts = [[vw - 8, vh * 0.35], [vw - 8, vh * 0.6], [vw * 0.6, vh * 0.3], [vw * 0.6, vh * 0.7]];
    const out = [];
    for (const [x, y] of pts) {
      const el = document.elementFromPoint(x, y);
      if (el && !el.closest('[id^="ecm-"]')) out.push(el);
    }
    return out;
  }

  function fixContent(sb) {
    if (!narrow() || document.body.classList.contains('ecm-open')) return;
    const vw = vwidth();
    for (const start of probeElements()) {
      let el = start;
      while (el && el !== document.documentElement) {
        if (sb && sb.contains(el)) break;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const holdsSidebar = !!(sb && el.contains(sb));

        if (r.width >= vw * 0.4) {
          if (parseFloat(cs.marginLeft) > 40) el.setAttribute('data-ecm-ml', '');
          if (parseFloat(cs.paddingLeft) > 40) el.setAttribute('data-ecm-pl', '');
          // desktop gutters on the right squeeze/clip rows on a phone
          if (r.width >= vw * 0.85 && parseFloat(cs.paddingRight) > 16) el.setAttribute('data-ecm-pr', '');
          if (r.width >= vw * 0.85 && parseFloat(cs.marginRight) > 16) el.setAttribute('data-ecm-mr', '');
          if ((cs.position === 'absolute' || cs.position === 'fixed') && parseFloat(cs.left) > 40) {
            el.setAttribute('data-ecm-l', '');
          }
          if (cs.transform && cs.transform !== 'none') {
            try { if (new DOMMatrix(cs.transform).m41 > 40) el.setAttribute('data-ecm-tx', ''); } catch (_) {}
          }
          if (holdsSidebar && cs.display.includes('grid') &&
              cs.gridTemplateColumns.trim().split(/\s+/).length > 1) {
            el.setAttribute('data-ecm-grid', '');
          }
          const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
          const isItem = pcs && (/grid/.test(pcs.display) ||
            (/flex/.test(pcs.display) && pcs.flexDirection.startsWith('row')));
          if (!holdsSidebar && !isItem && /^(block|flex|grid)$/.test(cs.display) && r.right > vw + 2) {
            el.setAttribute('data-ecm-w', '');
          }
        }
        el = el.parentElement;
      }
    }
  }

  // ---- section headers: heading + 3 or more text pills side by side ----
  function fixHeaders(sb) {
    if (!narrow()) return;
    const root = document.querySelector(`[${ATTR}="content"]`) || document.body;
    for (const h of root.querySelectorAll('h1, h2, h3')) {
      if (sb && sb.contains(h)) continue;
      // climb to a horizontal flex row that holds the heading plus something else
      let row = null, titleKid = null;
      for (let k = 0, a = h; k < 3 && a.parentElement && a.parentElement !== root; k++, a = a.parentElement) {
        const cs = getComputedStyle(a.parentElement);
        if (/flex/.test(cs.display) && cs.flexDirection.startsWith('row') && a.parentElement.children.length >= 2) {
          row = a.parentElement; titleKid = a; break;
        }
      }
      if (!row || row.hasAttribute('data-ecm-hdr')) continue;
      const pills = [...row.children].find(c => c !== titleKid &&
        [...c.querySelectorAll('button, [role="tab"], a')].filter(b => b.textContent.trim()).length >= 3);
      if (!pills) continue;
      row.setAttribute('data-ecm-hdr', '');
      titleKid.setAttribute('data-ecm-hdrtitle', '');
      pills.setAttribute('data-ecm-pills', '');
    }
  }

  // ---- settings pages: side icon rail + rows of [icon | text | control] ----
  const controlSel = 'select, input, button, [role="switch"], [role="combobox"], a';

  function fixSettings(sb) {
    if (!narrow()) return;
    const rows = document.querySelectorAll('.sk-setting-row');
    if (!rows.length) return;

    // wrapper = nearest horizontal flex ancestor whose other child holds the nav (3+ links/buttons)
    if (!document.querySelector('[data-ecm-setwrap]')) {
      for (let a = rows[0]; a && a.parentElement && a.parentElement !== document.body; a = a.parentElement) {
        const p = a.parentElement;
        const cs = getComputedStyle(p);
        if (!/flex/.test(cs.display) || !cs.flexDirection.startsWith('row')) continue;
        const nav = [...p.children].find(c => c !== a && c.querySelectorAll('a, button').length >= 3);
        if (!nav) continue;
        p.setAttribute('data-ecm-setwrap', '');
        a.setAttribute('data-ecm-setmain', '');
        nav.setAttribute('data-ecm-setnav', '');
        // the element that directly holds the nav items becomes a horizontal row
        let list = nav, best = 0;
        for (const e of [nav, ...nav.querySelectorAll('*')]) {
          const n = [...e.children].filter(c => c.matches('a, button') || c.querySelector('a, button')).length;
          if (n > best) { best = n; list = e; }
        }
        list.setAttribute('data-ecm-setlist', '');
        break;
      }
    }

    for (const row of rows) {
      if (row.hasAttribute('data-ecm-srow')) continue;
      const kids = [...row.children];
      if (kids.length < 2) continue;
      // text block = child with the most text; control = last other child holding a control
      let text = null, len = -1;
      for (const k of kids) {
        const t = k.textContent.trim().length;
        if (!k.matches(controlSel) && t > len) { len = t; text = k; }
      }
      const ctl = [...kids].reverse().find(k => k !== text && (k.matches(controlSel) || k.querySelector(controlSel)));
      if (!text || !ctl) continue;
      row.setAttribute('data-ecm-srow', '');
      text.setAttribute('data-ecm-stext', '');
      ctl.setAttribute('data-ecm-sctl', '');
    }
  }

  // ---- carousels: horizontally overflowing rows extend to the right screen edge ----
  function fixCarousels(sb) {
    if (!narrow()) return;
    const vw = vwidth();
    const root = document.querySelector(`[${ATTR}="content"]`) || document.body;
    for (const el of root.querySelectorAll('*')) {
      if (el.hasAttribute('data-ecm-bleed') || el.closest('[data-ecm-player]') || (sb && sb.contains(el))) continue;
      if (el.children.length < 2) continue;
      if (el.scrollWidth <= el.clientWidth + 4) continue;           // cheap check before computing styles
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.6 || r.height < 60) continue;
      const gap = vw - r.right;                                      // distance to the screen edge
      if (gap < 2 || gap > 40) continue;
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'visible') continue;
      // the row's clipping box stops at the gutter: pull its right edge out to the screen edge
      el.style.setProperty('--ecm-bleed', Math.round(gap) + 'px');
      el.setAttribute('data-ecm-bleed', '');
    }
  }

  // ---- mini player: any fixed/absolute box hugging the bottom of the screen ----
  function fixPlayer(sb) {
    if (!narrow()) return;
    const vh = window.innerHeight, vw = vwidth();
    const seen = new Set();
    // sample points along the bottom strip, then climb to the outermost fixed/absolute ancestor
    for (let x = vw * 0.15; x < vw; x += vw * 0.17) {
      for (const y of [vh - 30, vh - 60, vh - 90]) {
        let el = document.elementFromPoint(x, y);
        if (!el || el.closest('[id^="ecm-"]') || (sb && sb.contains(el))) continue;
        let box = null;
        for (let a = el; a && a !== document.body; a = a.parentElement) {
          const pos = getComputedStyle(a).position;
          if (pos === 'fixed' || pos === 'absolute') box = a;
        }
        if (!box || seen.has(box)) continue;
        seen.add(box);
        const r = box.getBoundingClientRect();
        // must sit near the bottom and be bar-sized, not a full-page layer
        if (r.top > vh * 0.55 && r.height < vh * 0.35 && r.width > 120) {
          box.setAttribute('data-ecm-player', '');
        }
      }
    }
    // also mark direct overlay siblings found during sidebar detection
    document.querySelectorAll(`[${ATTR}="overlay"]`).forEach(o => {
      const r = o.getBoundingClientRect();
      if (r.top > vh * 0.55 && r.height < vh * 0.35) o.setAttribute('data-ecm-player', '');
    });

    const player = document.querySelector('[data-ecm-player]');
    if (player) {
      fixPlayerInner(player);
      fixScrollPad(sb);
    }
  }

  // ---- mini player internals: keep art/title/heart + prev/play/next, tuck progress along the bottom ----
  const btnLabel = b => (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();

  function findPlayButton(player) {
    const btns = [...player.querySelectorAll('button, [role="button"]')]
      .filter(b => b.getBoundingClientRect().width > 0);
    const byLabel = btns.find(b => /\b(play|pause)\b/.test(btnLabel(b)));
    if (byLabel) return byLabel;
    // fallback: largest roughly-square button that isn't the artwork
    let best = null, area = 0;
    for (const b of btns) {
      if (b.querySelector('img')) continue;
      const r = b.getBoundingClientRect();
      if (r.width > 90 || Math.abs(r.width - r.height) > r.width * 0.25) continue;
      if (r.width * r.height > area) { area = r.width * r.height; best = b; }
    }
    return best;
  }

  function fixPlayerInner(player) {
    const vw = vwidth();
    document.documentElement.style.setProperty('--ecm-ph', Math.round(player.getBoundingClientRect().height) + 'px');

    const play = findPlayButton(player);
    const keep = new Set();

    if (play) {
      keep.add(play);
      // controls row = nearest ancestor holding 3+ buttons
      let ctrl = play.parentElement;
      while (ctrl && ctrl !== player && ctrl.querySelectorAll('button, [role="button"]').length < 3) {
        ctrl = ctrl.parentElement;
      }
      if (ctrl && ctrl !== player) {
        ctrl.setAttribute('data-ecm-ctrl', '');
        if (ctrl.parentElement && ctrl.parentElement !== player &&
            !/grid/.test(getComputedStyle(ctrl.parentElement).display)) {
          ctrl.parentElement.setAttribute('data-ecm-ctrlcol', '');
        }
        const kids = [...ctrl.children];
        const i = kids.findIndex(k => k.contains(play));
        if (kids.length > 3 && i >= 0) {
          kids.forEach((k, j) => {
            if (Math.abs(j - i) <= 1) keep.add(k);
            else k.setAttribute('data-ecm-hide', '');   // repeat / shuffle
          });
        } else {
          kids.forEach(k => keep.add(k));
        }
      }
      for (let a = play.parentElement; a && a !== player; a = a.parentElement) {
        if (/grid/.test(getComputedStyle(a).display)) { a.removeAttribute('data-ecm-keepw'); break; }
        a.removeAttribute('data-ecm-shrink');
        a.setAttribute('data-ecm-keepw', '');
      }
    }

    // let the title block shrink so it ellipsizes instead of pushing controls off-screen
    const art = player.querySelector('img');
    let openBtn = player.querySelector('button[aria-label*="now playing" i]');
    if (art) {
      const box = art.closest('button') || art.parentElement;
      if (box && box !== player) {
        box.setAttribute('data-ecm-art', '');
        // everything beside the artwork in its row = title block + heart
        if (box.parentElement && box.parentElement !== player) {
          for (const sib of box.parentElement.children) if (sib !== box) sib.setAttribute('data-ecm-lift', '');
        }
      }
      if (!openBtn && box && box.tagName === 'BUTTON') openBtn = box;
    }

    // favourite button: keep it, but make it a comfortable tap target
    player.querySelectorAll('button').forEach(b => {
      const al = b.getAttribute('aria-label') || '';
      if (/favou?rite|like/i.test(al) || b.querySelector('svg[class*="red"]')) {
        b.removeAttribute('data-ecm-hide');
        b.setAttribute('data-ecm-heart', '');
      }
    });

    // tap anywhere on the mini player (except its controls / seek bar) = open now playing
    if (openBtn && !player.dataset.ecmTap) {
      player.dataset.ecmTap = '1';
      player.addEventListener('click', e => {
        if (!narrow()) return;
        if (e.target.closest('button, input, a, [role="slider"], [data-ecm-progress]')) return;
        const btn = player.querySelector('button[aria-label*="now playing" i]') || openBtn;
        if (btn && btn.isConnected) btn.click();
      });
    }
    if (art) for (let a = art.parentElement; a && a !== player; a = a.parentElement) {
      if (!play || !a.contains(play)) a.setAttribute('data-ecm-shrink', '');
    }

    // time labels: find the progress row first, then hide the labels
    const times = [];
    const w = document.createTreeWalker(player, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (/^-?\d{1,2}:\d{2}$/.test(n.nodeValue.trim())) times.push(n.parentElement);
    if (times.length) {
      let row = times[0].parentElement;
      if (!row || row === player || (play && row.contains(play))) row = null;
      if (row) {
        row.setAttribute('data-ecm-progress', '');
        row.removeAttribute('data-ecm-keepw');
      }
      times.forEach(t => t.setAttribute('data-ecm-hide', ''));
    }

    // anything still entirely off the right edge (volume, queue, etc.) goes
    player.querySelectorAll('button, [role="button"], input, [role="slider"]').forEach(e => {
      if ([...keep].some(k => k.contains(e))) return;
      if (e.closest('[data-ecm-progress]')) return;
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.left >= vw - 2) e.setAttribute('data-ecm-hide', '');
    });

    // a column whose controls are all hidden still reserves grid space: drop it
    const grid = [...player.querySelectorAll('*')].find(e => /grid/.test(getComputedStyle(e).display));
    if (grid) {
      for (const col of grid.children) {
        const ctl = col.querySelectorAll('button, [role="button"], input');
        if (ctl.length && [...ctl].every(c => c.closest('[data-ecm-hide]'))) col.setAttribute('data-ecm-hide', '');
      }
      const visible = [...grid.children].filter(c => !c.hasAttribute('data-ecm-hide'));
      if (visible.length === 2) grid.setAttribute('data-ecm-pgrid', '');
      grid.removeAttribute('data-ecm-shrink');
      grid.removeAttribute('data-ecm-keepw');
    }
  }

  // ---- bottom padding on whatever actually scrolls ----
  function fixScrollPad(sb) {
    for (const start of probeElements()) {
      for (let el = start; el && el !== document.documentElement; el = el.parentElement) {
        if (sb && sb.contains(el)) break;
        if (el.hasAttribute('data-ecm-player')) break;
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
          el.setAttribute('data-ecm-scroll', '');
          return;
        }
      }
    }
    document.body.classList.add('ecm-docscroll');
  }

  // ---- debug panel: long-press ☰, or load the page with #ecm-debug ----
  function describe(el) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const cls = el.classList.length ? '.' + [...el.classList].slice(0, 4).join('.') : '';
    const marks = [...el.attributes].filter(a => a.name.startsWith('data-ecm'))
      .map(a => a.value ? `${a.name}=${a.value}` : a.name).join(' ');
    const tf = cs.transform === 'none' ? '-' : cs.transform;
    const gtc = cs.gridTemplateColumns === 'none' ? '-' : cs.gridTemplateColumns;
    const inline = (el.getAttribute('style') || '').replace(/\s+/g, ' ').slice(0, 90);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls} | d:${cs.display} fd:${cs.flexDirection} p:${cs.position} ` +
      `x:${r.left | 0} w:${r.width | 0} ml:${cs.marginLeft} pl:${cs.paddingLeft} l:${cs.left} tf:${tf} gtc:${gtc}` +
      `${inline ? ' st:{' + inline + '}' : ''}${marks ? ' [' + marks + ']' : ''}`;
  }

  function chain(el) {
    const out = [];
    while (el && el !== document.documentElement) { out.push(describe(el)); el = el.parentElement; }
    return out.join('\n');
  }

  function subtree(el, depth, out) {
    if (out.length >= 160) return out;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const cls = el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '';
    const txt = [...el.childNodes].filter(c => c.nodeType === 3).map(c => c.nodeValue.trim()).join(' ').slice(0, 30);
    const aria = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    const marks = [...el.attributes].filter(a => a.name.startsWith('data-ecm')).map(a => a.name.slice(9)).join(',');
    out.push(`${'  '.repeat(depth)}${el.tagName.toLowerCase()}${cls} d:${cs.display} x:${r.left | 0} w:${r.width | 0} h:${r.height | 0}` +
      `${aria ? ' aria:' + aria : ''}${txt ? ' "' + txt + '"' : ''}${marks ? ' [' + marks + ']' : ''}`);
    if (depth < 10) for (const c of el.children) subtree(c, depth + 1, out);
    return out;
  }

  function buildReport() {
    const sb = document.querySelector(`[${ATTR}="sidebar"]`);
    const parts = [
      `ecm 0.9.0 | inner:${window.innerWidth}x${window.innerHeight} client:${vwidth()} dpr:${devicePixelRatio} ` +
      `touch:${matchMedia('(pointer: coarse)').matches} mobile:${narrow()}`,
      `ua: ${navigator.userAgent}`,
      `url: ${location.pathname}${location.hash}`,
      '',
      '== SIDEBAR CHAIN ==',
      sb ? chain(sb) : '(sidebar not detected)',
    ];
    probeElements().forEach((el, i) => parts.push('', `== PROBE ${i + 1} ==`, chain(el)));
    document.querySelectorAll('[data-ecm-player]').forEach((el, i) => parts.push('', `== PLAYER ${i + 1} ==`, chain(el), '-- tree --', subtree(el, 0, []).join('\n')));
    return parts.join('\n');
  }

  function openDebug() {
    const old = document.getElementById('ecm-debug');
    if (old) old.remove();
    close();
    const p = document.createElement('div');
    p.id = 'ecm-debug';
    p.innerHTML = '<div>Eclipse Mobile debug, tap Copy and paste it to Claude</div>' +
      '<textarea readonly></textarea><div class="row"><button data-a="copy">Copy</button>' +
      '<button data-a="close">Close</button></div>';
    const ta = p.querySelector('textarea');
    ta.value = buildReport();
    p.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'close') p.remove();
      if (a === 'copy') {
        const done = () => { e.target.textContent = 'Copied'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).then(done, () => {
            ta.focus(); ta.select(); document.execCommand('copy'); done();
          });
        } else { ta.focus(); ta.select(); document.execCommand('copy'); done(); }
      }
    });
    document.body.appendChild(p);
  }

  // ---- is the full now-playing screen open? ----
  function updateNowPlaying() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n, open = false;
    while ((n = w.nextNode())) {
      if (/^playing from$/i.test(n.nodeValue.trim())) {
        const r = n.parentElement.getBoundingClientRect();
        if (r.width > 0 && r.bottom > 0 && r.top < window.innerHeight) {
          open = true;
          const blk = n.parentElement.parentElement;
          if (blk && !blk.hasAttribute('data-ecm-npshift')) blk.setAttribute('data-ecm-npshift', '');
          break;
        }
      }
    }
    document.body.classList.toggle('ecm-np', open);
  }

  // ---- boot + keep up with SPA re-renders ----
  let tries = 0, timer = null, debugShown = false;
  function run() {
    injectCSS();
    injectControls();
    updateNowPlaying();
    const sb = detectSidebar();
    if (sb) {
      const t = document.getElementById('ecm-toast');
      if (t) t.remove();
      fixContent(sb);
      fixHeaders(sb);
      fixSettings(sb);
      fixCarousels(sb);
      fixPlayer(sb);
      if (!debugShown && location.hash.includes('ecm-debug')) {
        debugShown = true;
        setTimeout(openDebug, 800);
      }
      return;
    }
    if (++tries === 20 && !document.getElementById('ecm-toast')) {
      const t = document.createElement('div');
      t.id = 'ecm-toast';
      t.textContent = 'Eclipse Mobile: sidebar not found';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 6000);
    }
  }

  fixViewport();
  run();
  new MutationObserver(muts => {
    if (muts.every(m => [...m.addedNodes, ...m.removedNodes]
      .every(n => n.nodeType === 1 && n.id && n.id.startsWith('ecm-')))) return;
    clearTimeout(timer);
    timer = setTimeout(run, 250);
  }).observe(document.body, { childList: true, subtree: true });
  mql.addEventListener && mql.addEventListener('change', () => window.dispatchEvent(new Event('resize')));
  window.addEventListener('resize', () => {
    if (!narrow()) FIX_ATTRS.forEach(a => document.querySelectorAll(`[${a}]`).forEach(x => x.removeAttribute(a)));
    clearTimeout(timer);
    timer = setTimeout(run, 250);
  });
})();
