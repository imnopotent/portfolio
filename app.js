/* =========================================================
   The street — behaviour
   ========================================================= */

let DATA = null;
let LEN  = 8200;

const $  = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if(c) n.className = c; if(h != null) n.innerHTML = h; return n; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const visible = l => (l || []).filter(x => !x.hidden);

const MOBILE_AT = 820;
const isMobile = () => innerWidth < MOBILE_AT || matchMedia('(pointer:coarse)').matches;

fetch('content.json').then(r => r.json()).then(d => { DATA = d; start(); })
  .catch(() => { document.body.innerHTML = '<p style="font:14px system-ui;padding:40px">content.json could not be loaded.</p>'; });

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */

function start(){
  LEN = DATA.streetLength || 8200;

  $('#tName').textContent = DATA.name || '';
  $('#tRole').textContent = DATA.role || '';
  $('#iLine1').textContent = DATA.intro?.line1 || DATA.name || '';
  $('#iLine2').textContent = DATA.intro?.line2 || DATA.role || '';
  $('#iHint').textContent  = DATA.intro?.hint  || 'Scroll to walk';
  document.title = DATA.name || 'Portfolio';

  if(DATA.sky) document.documentElement.style.setProperty('--sky', DATA.sky);

  buildIndex();
  wireChrome();
  layout();

  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 140); }, {passive:true});
}

let mode = null;

function layout(){
  const want = isMobile() ? 'mobile' : 'street';
  document.body.dataset.mode = want;
  if(want === 'mobile'){ mode = want; return; }

  mode = want;
  buildStreet();
  applyScene();
  onScroll();
}

/* ---------------------------------------------------------
   Scene art — falls back to drawn CSS when none supplied
   --------------------------------------------------------- */

function applyScene(){
  const s = DATA.scene || {};
  const set = (id, url, drawn) => {
    const n = $(id);
    if(url){ n.style.backgroundImage = `url("${url}")`; n.classList.remove('is-drawn'); }
    else   { n.style.backgroundImage = ''; n.classList.toggle('is-drawn', drawn); }
  };
  set('#lFar',  s.far,  true);
  set('#lMid',  s.mid,  true);
  set('#lNear', s.near, false);
}

/* ---------------------------------------------------------
   Build the street
   --------------------------------------------------------- */

function buildStreet(){
  const stage = $('#stage');
  const street = $('#street');
  stage.innerHTML = '';

  /* the strip is as long as the content says, scaled to viewport height */
  const H = innerHeight;
  const W = Math.max(LEN, innerWidth + 400);
  stage.style.width = W + 'px';
  $('#lFar').style.width  = W + 'px';
  $('#lMid').style.width  = W + 'px';
  $('#lNear').style.width = W + 'px';
  $('#ground').style.width = W + 'px';
  street.style.setProperty('--len', W + 'px');

  /* a spacer keeps the scroll container the right length */
  const spacer = el('div');
  spacer.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:1px;`;
  stage.appendChild(spacer);

  visible(DATA.projects).forEach((p, i) => {
    const slot = el('button', `slot slot--${p.surface || 'poster'}`);
    slot.style.left = p.x + 'px';
    slot.style.top  = (p.y / 100 * H) + 'px';
    slot.style.width  = (p.w / 100 * H) * 1.6 + 'px';
    slot.style.height = (p.h / 100 * H) + 'px';
    slot.style.setProperty('--tilt', ((i % 2 ? -1 : 1) * (0.6 + (i % 3) * 0.7)) + 'deg');
    slot.setAttribute('aria-label', `${p.title} — ${p.client}`);

    slot.innerHTML =
      `<div class="slot__art"></div>
       <span class="slot__cap">${esc(p.title)} · ${esc(p.client)}</span>`;

    if(p.thumb){
      const img = new Image();
      img.src = p.thumb; img.alt = '';
      img.onload = () => slot.querySelector('.slot__art').appendChild(img);
    }

    slot.addEventListener('click', () => openSheet(p.slug));
    stage.appendChild(slot);
  });

  (DATA.signs || []).forEach(s => {
    const n = el('div', 'sign', `<b>${esc(s.title)}</b><p>${esc(s.text)}</p>`);
    n.style.left = s.x + 'px';
    n.style.top  = (s.y / 100 * H) + 'px';
    stage.appendChild(n);
  });
}

/* ---------------------------------------------------------
   Walking
   --------------------------------------------------------- */

function onScroll(){
  const street = $('#street');
  const x = street.scrollLeft;
  const max = street.scrollWidth - street.clientWidth;

  $('#lFar').style.transform  = `translateX(${x * 0.82}px)`;
  $('#lMid').style.transform  = `translateX(${x * 0.55}px)`;
  $('#lNear').style.transform = `translateX(${x * 0.18}px)`;

  $('#progressBar').style.width = (max ? (x / max) * 100 : 0) + '%';
  $('#intro').classList.toggle('is-gone', x > 90);
}

function wireChrome(){
  const street = $('#street');

  street.addEventListener('scroll', onScroll, {passive:true});

  /* vertical wheel walks the street */
  street.addEventListener('wheel', e => {
    if(Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    street.scrollLeft += e.deltaY;
  }, {passive:false});

  addEventListener('keydown', e => {
    if($('#sheet').classList.contains('is-open') || $('#index').classList.contains('is-open')){
      if(e.key === 'Escape'){ closeSheet(); closeIndex(); }
      return;
    }
    const step = innerWidth * 0.7;
    if(e.key === 'ArrowRight') street.scrollBy({left: step, behavior:'smooth'});
    if(e.key === 'ArrowLeft')  street.scrollBy({left:-step, behavior:'smooth'});
    if(e.key === 'Escape') closeIndex();
  });

  $('#tIndex').addEventListener('click', openIndex);
  $('#indexClose').addEventListener('click', closeIndex);
  $('#sheetClose').addEventListener('click', closeSheet);

  addEventListener('popstate', () => {
    const slug = location.hash.slice(1);
    if(slug) openSheet(slug, true); else closeSheet(true);
  });

  if(location.hash) openSheet(location.hash.slice(1), true);
}

/* ---------------------------------------------------------
   Index
   --------------------------------------------------------- */

function buildIndex(){
  $('#idxServices').innerHTML = (DATA.services || []).map(s =>
    `<div><h3>${esc(s.heading)}</h3><ul>${
      (s.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');

  const list = $('#idxList');
  list.innerHTML = '';
  visible(DATA.projects).forEach((p, i) => {
    const li = el('li', '', `
      <button data-slug="${esc(p.slug)}">
        <span class="n">${String(i + 1).padStart(2,'0')}</span>
        <span class="t">${esc(p.title)}</span>
        <span class="c">${esc(p.client)} · ${esc(p.year)}</span>
      </button>`);
    li.querySelector('button').addEventListener('click', () => { closeIndex(); openSheet(p.slug); });
    list.appendChild(li);
  });

  $('#idxLinks').innerHTML = (DATA.links || []).map(l =>
    `<a href="${l.url}"${l.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('');
}

function openIndex(){
  $('#index').classList.add('is-open');
  $('#index').setAttribute('aria-hidden','false');
}
function closeIndex(){
  $('#index').classList.remove('is-open');
  $('#index').setAttribute('aria-hidden','true');
}

/* ---------------------------------------------------------
   Project sheet
   --------------------------------------------------------- */

function mediaHTML(src, i){
  if(/\.(mp4|webm|mov)$/i.test(src)) return `<video src="${src}" autoplay muted loop playsinline></video>`;
  return `<div class="ph" data-slot="${i}">${esc(src.split('/').pop())}</div>`;
}

function openSheet(slug, silent){
  const list = visible(DATA.projects);
  const i = list.findIndex(p => p.slug === slug);
  if(i < 0) return;
  const p = list[i];
  const next = list[(i + 1) % list.length];

  const meta = [p.client, p.year, p.field, p.label].filter(Boolean)
    .map(m => `<span>${esc(m)}</span>`).join('');

  $('#sheetScroll').innerHTML = `
    <div class="sheet__inner">
      <span class="sheet__eyebrow">${esc(p.client)}</span>
      <h2 class="sheet__title">${esc(p.title)}</h2>
      <div class="sheet__meta">${meta}</div>
      ${p.text ? `<p class="sheet__text">${esc(p.text)}</p>` : ''}
      <div class="sheet__media">${(p.images || []).map((s, n) => mediaHTML(s, n)).join('')}</div>
      ${(p.credits || []).length ? `<div class="sheet__credits">
        <h4>Credits</h4>
        <dl>${p.credits.map(c => `<div class="credit"><dt>${esc(c.role)}</dt><dd>${esc(c.names)}</dd></div>`).join('')}</dl>
      </div>` : ''}
      <button class="sheet__next" data-next="${esc(next.slug)}">
        <small>Next</small><b>${esc(next.title)}</b>
      </button>
    </div>`;

  (p.images || []).forEach((src, n) => {
    if(/\.(mp4|webm|mov)$/i.test(src)) return;
    const img = new Image();
    img.src = src; img.alt = `${p.client} — ${p.title}`;
    img.onload = () => { const s = $(`[data-slot="${n}"]`); if(s) s.replaceWith(img); };
  });

  $('#sheetScroll').querySelector('[data-next]')
    .addEventListener('click', e => openSheet(e.currentTarget.dataset.next));

  $('#sheet').classList.add('is-open');
  $('#sheet').setAttribute('aria-hidden','false');
  $('#sheetScroll').scrollTop = 0;
  if(!silent) history.pushState({slug}, '', '#' + slug);
  document.title = `${p.title} — ${DATA.name}`;
}

function closeSheet(silent){
  $('#sheet').classList.remove('is-open');
  $('#sheet').setAttribute('aria-hidden','true');
  document.title = DATA.name;
  if(!silent && location.hash) history.pushState({}, '', location.pathname);
}
