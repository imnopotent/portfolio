/* =========================================================
   Desktop portfolio — behaviour
   All content comes from content.json (edited in /admin)
   ========================================================= */

let DATA = null;
let z = 100;
const openWins = new Map();

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if(c) n.className = c; if(h != null) n.innerHTML = h; return n; };
const touch = matchMedia('(pointer:coarse)').matches || innerWidth < 820;

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */

fetch('content.json')
  .then(r => r.json())
  .then(d => { DATA = d; start(); })
  .catch(() => {
    document.body.innerHTML =
      '<p style="font:14px system-ui;color:#333;padding:40px">' +
      'content.json could not be loaded. Run this through a web server, not by ' +
      'double-clicking the file.</p>';
  });

function start(){
  $('#mbName').textContent = DATA.name;
  document.title = DATA.name;
  if(DATA.wallpaper) $('#wall').style.backgroundImage = `url("${DATA.wallpaper}")`;

  tick(); setInterval(tick, 20000);

  buildDock();
  if(touch){ buildMobile(); } else { buildIcons(); buildNotes(); }
}

function tick(){
  $('#mbClock').textContent = new Intl.DateTimeFormat('en-GB', {
    weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false,
    timeZone:'Africa/Casablanca'
  }).format(new Date());
}

/* ---------------------------------------------------------
   Icon scatter
   Deterministic, so the layout is identical on every visit,
   but looks hand-strewn rather than gridded.
   --------------------------------------------------------- */

function scatter(n, i){
  /* golden-angle spiral, squashed to the viewport, with jitter */
  const g = 2.399963;
  const a = i * g;
  const r = Math.sqrt((i + 0.6) / n);
  const jx = Math.sin(i * 12.9898) * 0.5;
  const jy = Math.sin(i * 78.233) * 0.5;
  return {
    x: 50 + Math.cos(a) * r * 44 + jx * 4.0,
    y: 48 + Math.sin(a) * r * 40 + jy * 3.6
  };
}

/* push overlapping icons apart — deterministic, runs once at layout */
function relax(pts, W, H, minX, minY){
  for(let pass = 0; pass < 90; pass++){
    for(let i = 0; i < pts.length; i++){
      for(let j = i + 1; j < pts.length; j++){
        const a = pts[i], b = pts[j];
        const dx = b.px - a.px, dy = b.py - a.py;
        const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
        if(ox > 0 && oy > 0){
          /* separate along whichever axis needs least movement */
          if(ox / minX < oy / minY){
            const s = (dx >= 0 ? 1 : -1) * ox / 2;
            a.px -= s; b.px += s;
          } else {
            const s = (dy >= 0 ? 1 : -1) * oy / 2;
            a.py -= s; b.py += s;
          }
        }
      }
    }
    pts.forEach(p => {
      p.px = clamp(p.px, 8, W - minX * 0.85);
      p.py = clamp(p.py, 6, H - minY * 0.9);
    });
  }
  return pts;
}

function buildIcons(){
  const desk = $('#desktop');
  const n = DATA.projects.length;
  const H = desk.clientHeight;
  /* keep clear of the notes column on the right */
  const reserved = (DATA.notes || []).length && desk.clientWidth > 1000 ? 272 : 0;
  const W = desk.clientWidth - reserved;

  /* seed positions, then relax so nothing collides */
  const pts = DATA.projects.map((p, i) => {
    const s = (p.x != null && p.y != null) ? {x:+p.x, y:+p.y} : scatter(n, i);
    return { px: s.x / 100 * W, py: s.y / 100 * H, fixed: p.x != null };
  });
  relax(pts, W, H, 122, 104);

  DATA.projects.forEach((p, i) => {
    const pos = pts[i];

    const node = el('button', 'icon');
    node.style.left = (pos.px - 56) + 'px';
    node.style.top  = (pos.py - 44) + 'px';
    node.setAttribute('aria-label', `${p.title} — ${p.client}`);

    node.innerHTML =
      `<div class="icon__ph"></div>
       <span class="icon__label">${esc(p.title)}</span>`;

    if(p.thumb){
      const img = new Image();
      img.src = p.thumb;
      img.className = 'icon__thumb';
      img.alt = '';
      img.onload = () => node.replaceChild(img, node.firstChild);
    }

    /* select on single click, open on double */
    node.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.icon.is-sel').forEach(x => x.classList.remove('is-sel'));
      node.classList.add('is-sel');
    });
    node.addEventListener('dblclick', e => { e.stopPropagation(); openProject(p); });
    node.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openProject(p); }
    });

    dragify(node, desk);
    desk.appendChild(node);
  });

  document.addEventListener('click', () =>
    document.querySelectorAll('.icon.is-sel').forEach(x => x.classList.remove('is-sel')));
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------------------------------------------------------
   Dragging (icons and windows)
   --------------------------------------------------------- */

function dragify(node, bounds, handle){
  const grip = handle || node;
  let sx, sy, ox, oy, moved = false;

  grip.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    if(e.target.closest('[data-nodrag]')) return;   /* buttons stay clickable */
    const r = node.getBoundingClientRect();
    const b = bounds.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY;
    ox = r.left - b.left; oy = r.top - b.top;
    moved = false;
    grip.setPointerCapture(e.pointerId);
    node.style.zIndex = ++z;

    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if(Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      node.style.left = clamp(ox + dx, -20, b.width - 60) + 'px';
      node.style.top  = clamp(oy + dy, 0, b.height - 40) + 'px';
    };
    const up = ev => {
      grip.releasePointerCapture(ev.pointerId);
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      if(moved) node.dataset.moved = '1';
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });

  /* suppress the click that follows a drag */
  node.addEventListener('click', e => {
    if(node.dataset.moved){ e.stopImmediatePropagation(); delete node.dataset.moved; }
  }, true);
}

/* ---------------------------------------------------------
   Windows
   --------------------------------------------------------- */

function openWindow(key, title, bodyHTML){
  if(openWins.has(key)){
    const w = openWins.get(key);
    w.style.zIndex = ++z;
    return w;
  }

  const w = el('div', 'win');
  const count = openWins.size;
  w.style.left = `calc(50% - min(380px, 44vw) + ${count * 26}px)`;
  w.style.top  = `${74 + count * 26}px`;
  w.style.zIndex = ++z;

  w.innerHTML =
    `<div class="win__bar">
       <button class="dot dot--r" data-close data-nodrag aria-label="Close"></button>
       <span class="dot dot--y"></span>
       <span class="dot dot--g"></span>
       <span class="win__title">${esc(title)}</span>
     </div>
     <div class="win__body">${bodyHTML}</div>
     ${['nw','n','ne','e','se','s','sw','w']
        .map(d => `<span class="rz rz--${d}" data-rz="${d}"></span>`).join('')}`;

  w.addEventListener('pointerdown', () => { w.style.zIndex = ++z; });
  w.querySelector('[data-close]').addEventListener('click', e => {
    e.stopPropagation();
    w.remove();
    openWins.delete(key);
  });

  $('#windows').appendChild(w);

  /* lock in the natural size, then let it be resized freely */
  const r = w.getBoundingClientRect();
  const body = w.querySelector('.win__body');
  const natural = body.scrollHeight + 36;          /* + title bar */
  w.style.width  = r.width + 'px';
  w.style.height = clamp(natural, 170, innerHeight * 0.78) + 'px';
  w.style.maxHeight = 'none';

  dragify(w, $('#windows'), w.querySelector('.win__bar'));
  resizify(w);
  openWins.set(key, w);
  return w;
}

/* ---------------------------------------------------------
   Resizing — drag any edge or corner
   --------------------------------------------------------- */

function resizify(w){
  const MIN_W = 300, MIN_H = 180;

  w.querySelectorAll('[data-rz]').forEach(h => {
    h.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      const dir = h.dataset.rz;
      const r = w.getBoundingClientRect();
      const b = $('#windows').getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      const x0 = r.left - b.left, y0 = r.top - b.top;
      const w0 = r.width, h0 = r.height;
      h.setPointerCapture(e.pointerId);
      w.style.zIndex = ++z;

      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;

        if(dir.includes('e')) w.style.width = Math.max(MIN_W, w0 + dx) + 'px';
        if(dir.includes('s')) w.style.height = Math.max(MIN_H, h0 + dy) + 'px';

        if(dir.includes('w')){
          const nw = Math.max(MIN_W, w0 - dx);
          w.style.width = nw + 'px';
          w.style.left  = (x0 + (w0 - nw)) + 'px';
        }
        if(dir.includes('n')){
          const nh = Math.max(MIN_H, h0 - dy);
          w.style.height = nh + 'px';
          w.style.top    = (y0 + (h0 - nh)) + 'px';
        }
      };
      const up = ev => {
        h.releasePointerCapture(ev.pointerId);
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
    });
  });
}

function openProject(p){
  const meta = [p.client, p.year, p.field].filter(Boolean)
    .map(m => `<span>${esc(m)}</span>`).join('');

  /* render sized placeholders first so the window knows its height
     immediately, then swap in each image as it arrives */
  const media = (p.images || []).map((src, i) =>
    `<div class="ph" data-slot="${i}">${esc(src.split('/').pop())}</div>`).join('');

  const w = openWindow('p:' + p.slug, p.title,
    `<div class="win__meta">${meta}</div>
     ${p.text ? `<p class="win__text">${esc(p.text)}</p>` : ''}
     <div class="win__media">${media}</div>`);

  (p.images || []).forEach((src, i) => {
    const img = new Image();
    img.src = src;
    img.alt = `${p.client} — ${p.title}`;
    img.onload = () => {
      const slot = w.querySelector(`[data-slot="${i}"]`);
      if(slot) slot.replaceWith(img);
    };
  });
}

/* ---------------------------------------------------------
   Sticky notes
   --------------------------------------------------------- */

function buildNotes(){
  const desk = $('#desktop');
  const notes = DATA.notes || [];
  const W = desk.clientWidth, H = desk.clientHeight;

  notes.forEach((nt, i) => {
    const n = el('div', 'note');
    n.style.background = nt.color || '#FCF07A';
    n.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.7 + (i % 3) * 0.5)) + 'deg');

    /* default: down the right-hand side, clear of the icon field */
    const x = nt.x != null ? +nt.x / 100 * W : W - (W > 1000 ? 244 : 232);
    const y = nt.y != null ? +nt.y / 100 * H : 34 + i * 174;

    n.style.left = clamp(x, 8, Math.max(8, W - 220)) + 'px';
    n.style.top  = clamp(y, 4, Math.max(4, H - 150)) + 'px';

    n.innerHTML =
      `<b class="note__title">${esc(nt.title || '')}</b>
       <div class="note__text">${esc(nt.text || '')}</div>`;

    dragify(n, desk);
    desk.appendChild(n);
  });
}

/* ---------------------------------------------------------
   Dock
   --------------------------------------------------------- */

function buildDock(){
  const dock = $('#dock');

  (DATA.dock || []).forEach((d, i) => {
    if(d.action === 'trash' && i > 0) dock.appendChild(el('div', 'dock__sep'));

    const b = el('button', 'dockitem');
    b.style.background = d.color || '#555';
    b.innerHTML = d.icon
      ? `<img src="${d.icon}" alt="">`
      : esc(d.text || d.label.slice(0,2));
    b.appendChild(el('span', 'dockitem__tip', esc(d.label)));
    b.setAttribute('aria-label', d.label);

    b.addEventListener('click', () => {
      if(d.action === 'cv')   openWindow('cv', 'About', `<p class="win__text">${esc(DATA.cv || '')}</p>`);
      if(d.action === 'mail') location.href = 'mailto:' + DATA.email;
      if(d.action === 'link' && d.url && d.url !== '#') open(d.url, '_blank', 'noopener');
      if(d.action === 'trash')
        openWindow('trash', 'Trash', `<p class="win__text">Empty. Everything worth keeping is on the desktop.</p>`);
    });

    dock.appendChild(b);
  });
}

/* ---------------------------------------------------------
   Mobile fallback — a plain list, no metaphor
   --------------------------------------------------------- */

function buildMobile(){
  const m = $('#mlist');
  m.appendChild(el('p', 'mlist__intro', esc(DATA.cv || '')));

  (DATA.notes || []).forEach(nt => {
    const n = el('div', 'note note--flat',
      `<b class="note__title">${esc(nt.title||'')}</b>
       <div class="note__text">${esc(nt.text||'')}</div>`);
    n.style.background = nt.color || '#FCF07A';
    m.appendChild(n);
  });

  DATA.projects.forEach(p => {
    const row = el('button', 'mrow',
      `<div class="ph"></div>
       <span><b>${esc(p.title)}</b><small>${esc(p.client)} · ${esc(p.year)}</small></span>`);
    if(p.thumb){
      const img = new Image();
      img.src = p.thumb; img.alt = '';
      img.onload = () => row.replaceChild(img, row.firstChild);
    }
    row.addEventListener('click', () => {
      const open = row.nextElementSibling?.classList.contains('mopen');
      if(open){ row.nextElementSibling.remove(); return; }
      const box = el('div', 'mopen',
        `${p.text ? `<p class="win__text">${esc(p.text)}</p>` : ''}
         <div class="win__media">${(p.images||[]).map(s =>
           `<img src="${s}" alt="" onerror="this.remove()">`).join('')}</div>`);
      box.style.padding = '4px 0 16px';
      row.after(box);
    });
    m.appendChild(row);
  });

  const links = el('div', 'mlinks',
    `<a href="mailto:${DATA.email}">${DATA.email}</a>` +
    (DATA.dock || []).filter(d => d.action === 'link' && d.url && d.url !== '#')
      .map(d => `<a href="${d.url}" target="_blank" rel="noopener">${esc(d.label)}</a>`).join(''));
  m.appendChild(links);
}
