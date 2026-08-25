/* =========================================================
   Desktop portfolio — behaviour
   Content comes from content.json (edited at /admin)
   ========================================================= */

let DATA = null;
let z = 100;
const openWins = new Map();

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (t, c, h) => { const n = document.createElement(t); if(c) n.className = c; if(h != null) n.innerHTML = h; return n; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const br  = s => esc(s).replace(/\n/g, '<br>');

const MOBILE_AT = 860;
const isMobile = () => innerWidth < MOBILE_AT || matchMedia('(pointer:coarse)').matches;

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */

fetch('content.json')
  .then(r => r.json())
  .then(d => { DATA = d; start(); })
  .catch(() => {
    document.body.innerHTML =
      '<p style="font:14px system-ui;color:#333;padding:40px">content.json could not be loaded.</p>';
  });

function start(){
  $('#mbName').textContent = DATA.name || '';
  document.title = DATA.name || 'Portfolio';
  if(DATA.wallpaper) $('#wall').style.backgroundImage = `url("${DATA.wallpaper}")`;

  tick(); setInterval(tick, 20000);

  buildDock();
  layout();

  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 140); }, {passive:true});
}

function tick(){
  $('#mbClock').textContent = new Intl.DateTimeFormat('en-GB', {
    weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false,
    timeZone: DATA.timezone || 'Africa/Casablanca'
  }).format(new Date());
}

/* ---------------------------------------------------------
   Layout — recomputed on every resize
   --------------------------------------------------------- */

let mode = null;

function layout(){
  const want = isMobile() ? 'mobile' : 'desktop';

  if(want !== mode){
    mode = want;
    document.body.dataset.mode = mode;
    $('#desktop').innerHTML = '';
    $('#mlist').innerHTML = '';
    if(mode === 'mobile'){ closeAll(); buildMobile(); return; }
    buildIcons(); buildNotes();
    return;
  }

  if(mode === 'desktop'){
    $('#desktop').innerHTML = '';
    buildIcons(); buildNotes();
    reflowWindows();
  }
}

function reflowWindows(){
  const b = $('#windows').getBoundingClientRect();
  openWins.forEach(w => {
    const r = w.getBoundingClientRect();
    const width  = Math.min(r.width,  b.width  - 24);
    const height = Math.min(r.height, b.height - 24);
    w.style.width  = width + 'px';
    w.style.height = height + 'px';
    w.style.left = clamp(r.left - b.left, 8, Math.max(8, b.width  - width  - 8)) + 'px';
    w.style.top  = clamp(r.top  - b.top,  8, Math.max(8, b.height - height - 8)) + 'px';
  });
}

/* ---------------------------------------------------------
   Icons
   --------------------------------------------------------- */

function scatter(n, i){
  const a = i * 2.399963;
  const r = Math.sqrt((i + 0.6) / n);
  const jx = Math.sin(i * 12.9898) * 0.5;
  const jy = Math.sin(i * 78.233) * 0.5;
  return { x: 50 + Math.cos(a) * r * 44 + jx * 4, y: 48 + Math.sin(a) * r * 40 + jy * 3.6 };
}

function relax(pts, W, H, minX, minY){
  for(let pass = 0; pass < 80; pass++){
    for(let i = 0; i < pts.length; i++){
      for(let j = i + 1; j < pts.length; j++){
        const a = pts[i], b = pts[j];
        const dx = b.px - a.px, dy = b.py - a.py;
        const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
        if(ox > 0 && oy > 0){
          if(ox / minX < oy / minY){
            const s = (dx >= 0 ? 1 : -1) * ox / 2; a.px -= s; b.px += s;
          } else {
            const s = (dy >= 0 ? 1 : -1) * oy / 2; a.py -= s; b.py += s;
          }
        }
      }
    }
    pts.forEach(p => {
      p.px = clamp(p.px, minX * 0.55, W - minX * 0.55);
      p.py = clamp(p.py, minY * 0.5,  H - minY * 0.55);
    });
  }
  return pts;
}

function buildIcons(){
  const desk = $('#desktop');
  const projects = DATA.projects || [];
  const n = projects.length;
  if(!n) return;

  const H = desk.clientHeight;
  const wide = desk.clientWidth > 1080;
  const reserved = (DATA.notes || []).length && wide ? 268 : 0;
  const W = desk.clientWidth - reserved;

  const scale = clamp(desk.clientWidth / 1440, 0.76, 1);
  desk.style.setProperty('--icon-scale', scale);
  const cellX = 122 * scale, cellY = 106 * scale;

  const pts = projects.map((p, i) => {
    const s = (p.x != null && p.y != null) ? {x:+p.x, y:+p.y} : scatter(n, i);
    return { px: s.x / 100 * W, py: s.y / 100 * H };
  });
  relax(pts, W, H, cellX, cellY);

  projects.forEach((p, i) => {
    const node = el('button', 'icon');
    node.style.left = (pts[i].px - 53 * scale) + 'px';
    node.style.top  = (pts[i].py - 42 * scale) + 'px';
    node.setAttribute('aria-label', `${p.title} — ${p.client || ''}`);
    node.innerHTML = `<div class="icon__ph"></div><span class="icon__label">${esc(p.title)}</span>`;

    if(p.thumb){
      const img = new Image();
      img.src = p.thumb; img.className = 'icon__thumb'; img.alt = '';
      img.onload = () => node.replaceChild(img, node.firstChild);
    }

    node.addEventListener('click', e => {
      e.stopPropagation();
      $$('.icon.is-sel').forEach(x => x.classList.remove('is-sel'));
      node.classList.add('is-sel');
    });
    node.addEventListener('dblclick', e => { e.stopPropagation(); openProject(p); });
    node.addEventListener('keydown', e => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openProject(p); }
    });

    dragify(node, desk);
    desk.appendChild(node);
  });
}

document.addEventListener('click', e => {
  if(!e.target.closest('.icon')) $$('.icon.is-sel').forEach(x => x.classList.remove('is-sel'));
});

/* ---------------------------------------------------------
   Sticky notes — stacked by measured height, never overlapping
   --------------------------------------------------------- */

function buildNotes(){
  const desk = $('#desktop');
  const notes = DATA.notes || [];
  if(!notes.length) return;

  const W = desk.clientWidth, H = desk.clientHeight;
  const wide = W > 1080;
  const made = [];

  notes.forEach((nt, i) => {
    const n = el('div', 'note');
    n.style.background = nt.color || '#FCF07A';
    n.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)) + 'deg');
    n.innerHTML = `<b class="note__title">${esc(nt.title)}</b><div class="note__text">${br(nt.text)}</div>`;
    desk.appendChild(n);
    made.push({node:n, nt});
  });

  let cursor = 26;
  made.forEach(({node, nt}) => {
    const h = node.offsetHeight;

    if(nt.x != null && nt.y != null){
      node.style.left = clamp(+nt.x / 100 * W, 8, W - node.offsetWidth - 8) + 'px';
      node.style.top  = clamp(+nt.y / 100 * H, 6, Math.max(6, H - h - 6)) + 'px';
      dragify(node, desk);
      return;
    }

    if(!wide || cursor + h > H - 18){ node.remove(); return; }

    node.style.left = (W - node.offsetWidth - 26) + 'px';
    node.style.top  = cursor + 'px';
    cursor += h + 16;
    dragify(node, desk);
  });
}

/* ---------------------------------------------------------
   Dragging
   --------------------------------------------------------- */

function dragify(node, bounds, handle){
  const grip = handle || node;
  let sx, sy, ox, oy, moved = false;

  grip.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    if(e.target.closest('[data-nodrag]')) return;
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
      node.style.left = clamp(ox + dx, -20, b.width  - 60) + 'px';
      node.style.top  = clamp(oy + dy, 0,   b.height - 40) + 'px';
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

  node.addEventListener('click', e => {
    if(node.dataset.moved){ e.stopImmediatePropagation(); delete node.dataset.moved; }
  }, true);
}

/* ---------------------------------------------------------
   Windows
   --------------------------------------------------------- */

function openWindow(key, title, bodyHTML, opts = {}){
  if(openWins.has(key)){
    const w = openWins.get(key);
    w.style.zIndex = ++z;
    return w;
  }

  const w = el('div', 'win' + (opts.wide ? ' win--wide' : ''));
  const b = $('#windows').getBoundingClientRect();
  const count = openWins.size;

  w.innerHTML =
    `<div class="win__bar">
       <button class="dot dot--r" data-close data-nodrag aria-label="Close"></button>
       <span class="dot dot--y"></span>
       <span class="dot dot--g"></span>
       <span class="win__title">${esc(title)}</span>
     </div>
     <div class="win__body">${bodyHTML}</div>
     ${['nw','n','ne','e','se','s','sw','w'].map(d => `<span class="rz rz--${d}" data-rz="${d}"></span>`).join('')}`;

  w.style.zIndex = ++z;
  $('#windows').appendChild(w);

  const r = w.getBoundingClientRect();
  const width  = Math.min(r.width, b.width - 24);
  const height = clamp(w.querySelector('.win__body').scrollHeight + 38, 190, b.height * 0.82);
  w.style.width = width + 'px';
  w.style.height = height + 'px';
  w.style.maxHeight = 'none';
  w.style.left = clamp((b.width - width) / 2 + count * 24, 8, Math.max(8, b.width - width - 8)) + 'px';
  w.style.top  = clamp(48 + count * 24, 8, Math.max(8, b.height - height - 8)) + 'px';

  w.addEventListener('pointerdown', () => { w.style.zIndex = ++z; });
  w.querySelector('[data-close]').addEventListener('click', e => {
    e.stopPropagation(); w.remove(); openWins.delete(key);
  });

  dragify(w, $('#windows'), w.querySelector('.win__bar'));
  resizify(w);
  openWins.set(key, w);
  return w;
}

function closeAll(){ openWins.forEach(w => w.remove()); openWins.clear(); }

function resizify(w){
  const MIN_W = 300, MIN_H = 180;
  w.querySelectorAll('[data-rz]').forEach(h => {
    h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
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
        if(dir.includes('e')) w.style.width  = Math.max(MIN_W, w0 + dx) + 'px';
        if(dir.includes('s')) w.style.height = Math.max(MIN_H, h0 + dy) + 'px';
        if(dir.includes('w')){ const nw = Math.max(MIN_W, w0 - dx); w.style.width = nw + 'px'; w.style.left = (x0 + (w0 - nw)) + 'px'; }
        if(dir.includes('n')){ const nh = Math.max(MIN_H, h0 - dy); w.style.height = nh + 'px'; w.style.top = (y0 + (h0 - nh)) + 'px'; }
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

/* ---------------------------------------------------------
   Media — images, gifs and video handled alike
   --------------------------------------------------------- */

function mediaHTML(src, i){
  if(/\.(mp4|webm|mov)$/i.test(src)){
    return `<video src="${src}" autoplay muted loop playsinline preload="metadata"></video>`;
  }
  return `<div class="ph" data-slot="${i}">${esc(src.split('/').pop())}</div>`;
}

function swapMedia(scope, images, alt){
  (images || []).forEach((src, i) => {
    if(/\.(mp4|webm|mov)$/i.test(src)) return;
    const img = new Image();
    img.src = src; img.alt = alt;
    img.onload = () => {
      const slot = scope.querySelector(`[data-slot="${i}"]`);
      if(slot) slot.replaceWith(img);
    };
  });
}

/* ---------------------------------------------------------
   Project window
   --------------------------------------------------------- */

function openProject(p){
  const credits = (p.credits || [])
    .map(c => `<div class="credit"><dt>${esc(c.role)}</dt><dd>${br(c.names)}</dd></div>`).join('');

  const details = p.type || [p.field, p.year].filter(Boolean).join(' › ');

  const body = `
    <header class="proj__head">
      <div class="proj__chip">${p.thumb ? `<img src="${p.thumb}" alt="">` : ''}</div>
      <div class="proj__id">
        <b>${esc(p.title)}</b>
        <span>${esc(p.client)}</span>
      </div>
    </header>

    ${p.text ? `<div class="proj__text">${br(p.text)}</div>` : ''}

    ${details ? `<section class="proj__block">
        <h4>Details</h4>
        <p class="proj__meta">${esc(details)}</p>
      </section>` : ''}

    ${(p.images || []).length ? `<section class="proj__block">
        <h4>Preview</h4>
        <div class="proj__media">${p.images.map((s, i) => mediaHTML(s, i)).join('')}</div>
      </section>` : ''}

    ${credits ? `<section class="proj__block">
        <h4>Credits</h4>
        <dl class="proj__credits">${credits}</dl>
      </section>` : ''}`;

  const w = openWindow('p:' + p.slug, `Information about: ${p.title}`, body, {wide:true});
  swapMedia(w, p.images, `${p.client} — ${p.title}`);
}

/* ---------------------------------------------------------
   Info window — tabbed
   --------------------------------------------------------- */

function panelHTML(blocks){
  return (blocks || []).map(b => {
    if(b.type === 'checklist'){
      return `${b.heading ? `<h4>${esc(b.heading)}</h4>` : ''}
        <ul class="ticks${b.hollow ? ' ticks--hollow' : ''}">${
          (b.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    }
    return `${b.heading ? `<h4>${esc(b.heading)}</h4>` : ''}<p class="info__p">${br(b.text)}</p>`;
  }).join('');
}

function openInfo(){
  const tabs = DATA.info || [];
  if(!tabs.length){
    openWindow('info', 'About', `<p class="info__p">${br(DATA.cv || '')}</p>`);
    return;
  }

  const body = `
    <div class="info">
      <nav class="info__tabs">
        ${tabs.map((t, i) =>
          `<button data-tab="${i}" class="${i ? '' : 'is-on'}">
             <span>${esc(t.label)}</span><em>${esc(t.count || '')}</em></button>`).join('')}
      </nav>
      <div class="info__panes">
        ${tabs.map((t, i) =>
          `<div class="info__pane${i ? '' : ' is-on'}" data-pane="${i}">${panelHTML(t.blocks)}</div>`).join('')}
      </div>
    </div>`;

  const w = openWindow('info', `Information about: ${DATA.name}`, body, {wide:true});
  w.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => {
      w.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('is-on'));
      w.querySelectorAll('[data-pane]').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      w.querySelector(`[data-pane="${b.dataset.tab}"]`).classList.add('is-on');
    });
  });
}

/* ---------------------------------------------------------
   Dock
   --------------------------------------------------------- */

function buildDock(){
  const dock = $('#dock');
  dock.innerHTML = '';

  (DATA.dock || []).forEach((d, i) => {
    if(d.action === 'trash' && i > 0) dock.appendChild(el('div', 'dock__sep'));

    const b = el('button', 'dockitem');
    if(d.icon){
      b.classList.add('dockitem--img');
      b.innerHTML = `<img src="${d.icon}" alt="">`;
    } else {
      b.style.background = d.color || '#6B7280';
      b.textContent = d.text || (d.label || '').slice(0,2);
    }
    b.appendChild(el('span', 'dockitem__tip', esc(d.label)));
    b.setAttribute('aria-label', d.label);

    b.addEventListener('click', () => {
      if(d.action === 'cv')    openInfo();
      if(d.action === 'mail')  location.href = 'mailto:' + DATA.email;
      if(d.action === 'link' && d.url && d.url !== '#') open(d.url, '_blank', 'noopener');
      if(d.action === 'trash') openWindow('trash', 'Trash',
        `<p class="info__p">Empty. Everything worth keeping is on the desktop.</p>`);
    });

    dock.appendChild(b);
  });
}

/* ---------------------------------------------------------
   Mobile — no metaphor, just the work
   --------------------------------------------------------- */

function buildMobile(){
  const m = $('#mlist');

  const first = (DATA.info || [])[0];
  const intro = (first && first.blocks || []).find(b => b.type !== 'checklist');
  const text  = intro ? intro.text : (DATA.cv || '');
  if(text) m.appendChild(el('p', 'mlist__intro', br(text)));

  (DATA.notes || []).forEach(nt => {
    const n = el('div', 'note note--flat',
      `<b class="note__title">${esc(nt.title)}</b><div class="note__text">${br(nt.text)}</div>`);
    n.style.background = nt.color || '#FCF07A';
    m.appendChild(n);
  });

  (DATA.projects || []).forEach(p => {
    const row = el('button', 'mrow',
      `<div class="ph"></div>
       <span><b>${esc(p.title)}</b><small>${esc(p.client)} · ${esc(p.year)}</small></span>`);
    if(p.thumb){
      const img = new Image();
      img.src = p.thumb; img.alt = '';
      img.onload = () => row.replaceChild(img, row.firstChild);
    }
    row.addEventListener('click', () => {
      const next = row.nextElementSibling;
      if(next && next.classList.contains('mopen')){ next.remove(); row.classList.remove('is-open'); return; }
      row.classList.add('is-open');
      const box = el('div', 'mopen', `
        ${p.text ? `<p class="proj__text">${br(p.text)}</p>` : ''}
        <div class="proj__media">${(p.images || []).map((s, i) => mediaHTML(s, i)).join('')}</div>
        ${(p.credits || []).length ? `<dl class="proj__credits">${
          p.credits.map(c => `<div class="credit"><dt>${esc(c.role)}</dt><dd>${br(c.names)}</dd></div>`).join('')
        }</dl>` : ''}`);
      row.after(box);
      swapMedia(box, p.images, p.title);
    });
    m.appendChild(row);
  });

  m.appendChild(el('div', 'mlinks',
    `<a href="mailto:${DATA.email}">${esc(DATA.email)}</a>` +
    (DATA.dock || []).filter(d => d.action === 'link' && d.url && d.url !== '#')
      .map(d => `<a href="${d.url}" target="_blank" rel="noopener">${esc(d.label)}</a>`).join('')));
}
