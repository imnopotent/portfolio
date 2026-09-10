/* =========================================================
   Categories as panels — behaviour
   ========================================================= */

let DATA = null;
let OPEN = null;

const $  = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if(c) n.className = c; if(h != null) n.innerHTML = h; return n; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const visible = l => (l || []).filter(x => !x.hidden);

fetch('content.json').then(r => r.json()).then(d => { DATA = d; start(); })
  .catch(() => { document.body.innerHTML = '<p style="font:14px system-ui;padding:40px;color:#fff">content.json could not be loaded.</p>'; });

function start(){
  document.title = DATA.name || 'Portfolio';
  $('#mHome').textContent = DATA.name || '';
  $('#mRole').textContent = DATA.role || '';
  $('#hName').textContent = DATA.name || '';
  $('#hAbout').textContent = firstPara(DATA.about);
  $('#aName').textContent = DATA.name || '';
  $('#aText').textContent = DATA.about || '';

  $('#aServices').innerHTML = visible(DATA.categories).map(c =>
    `<div><h3>${esc(c.label)}</h3><p>${esc(c.blurb)}</p></div>`).join('');

  $('#aLinks').innerHTML = (DATA.links || []).map(l =>
    `<a href="${l.url}"${l.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`).join('');

  buildPanels();
  wire();

  const hash = location.hash.slice(1);
  if(hash){
    if(DATA.projects.some(p => p.slug === hash)) openSheet(hash, true);
    else openPanel(hash, true);
  }
}

function firstPara(t){
  return String(t || '').split('\n\n')[0];
}

/* ---------------------------------------------------------
   Panels
   --------------------------------------------------------- */

function buildPanels(){
  const wrap = $('#panels');
  wrap.innerHTML = '';

  visible(DATA.categories).forEach((c, i) => {
    const works = visible(DATA.projects).filter(p => p.category === c.key);

    const panel = el('section', 'panel');
    panel.dataset.key = c.key;
    panel.style.setProperty('--c', c.color || '#333');

    panel.innerHTML = `
      <span class="panel__n">${String(i + 1).padStart(2,'0')}</span>
      <span class="panel__label">${esc(c.label)}</span>
      <span class="panel__count">${works.length}</span>
      <div class="work">
        <div class="work__head">
          <h2>${esc(c.label)}</h2>
          <p>${esc(c.blurb)}</p>
        </div>
        <div class="work__grid"></div>
      </div>`;

    const grid = panel.querySelector('.work__grid');
    works.forEach(p => {
      const card = el('button', 'card', `
        <span class="card__img"><span class="card__ph">${esc((p.thumb || '').split('/').pop())}</span></span>
        <b>${esc(p.title)}</b>
        <small>${esc(p.client)} · ${esc(p.year)}</small>`);
      if(p.thumb){
        const img = new Image();
        img.src = p.thumb; img.alt = '';
        img.onload = () => {
          const box = card.querySelector('.card__img');
          box.innerHTML = '';
          box.appendChild(img);
        };
      }
      card.addEventListener('click', e => { e.stopPropagation(); openSheet(p.slug); });
      grid.appendChild(card);
    });

    panel.addEventListener('click', () => {
      if(panel.classList.contains('is-open')) return;
      openPanel(c.key);
    });

    wrap.appendChild(panel);
  });
}

function openPanel(key, silent){
  const wrap = $('#panels');
  const panel = wrap.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if(!panel) return;

  wrap.querySelectorAll('.panel').forEach(p => p.classList.remove('is-open'));
  panel.classList.add('is-open');
  wrap.classList.add('has-open');
  $('#hero').classList.add('is-gone');
  OPEN = key;

  if(!silent){
    history.pushState({key}, '', '#' + key);
    if(matchMedia('(max-width:900px)').matches){
      setTimeout(() => panel.scrollIntoView({behavior:'smooth', block:'start'}), 80);
    }
  }
  const cat = DATA.categories.find(c => c.key === key);
  document.title = `${cat ? cat.label : ''} — ${DATA.name}`;
}

function closePanels(silent){
  const wrap = $('#panels');
  wrap.querySelectorAll('.panel').forEach(p => p.classList.remove('is-open'));
  wrap.classList.remove('has-open');
  $('#hero').classList.remove('is-gone');
  OPEN = null;
  document.title = DATA.name;
  if(!silent && location.hash) history.pushState({}, '', location.pathname);
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

  /* next within the same category, so browsing stays on topic */
  const sameCat = list.filter(x => x.category === p.category);
  const next = sameCat[(sameCat.indexOf(p) + 1) % sameCat.length];
  const cat = DATA.categories.find(c => c.key === p.category);

  const meta = [p.client, p.year, cat ? cat.label : ''].filter(Boolean)
    .map(m => `<span>${esc(m)}</span>`).join('');

  $('#sheetScroll').innerHTML = `
    <div class="sheet__inner">
      <span class="sheet__eyebrow">${esc(p.client)}</span>
      <h2 class="sheet__title">${esc(p.title)}</h2>
      <div class="sheet__meta">${meta}</div>
      ${p.text ? `<p class="sheet__text">${esc(p.text)}</p>` : ''}
      <div class="sheet__media">${(p.images || []).map((s, n) => mediaHTML(s, n)).join('')}</div>
      ${(p.credits || []).length ? `<div class="sheet__credits"><h4>Credits</h4><dl>${
        p.credits.map(c => `<div class="credit"><dt>${esc(c.role)}</dt><dd>${esc(c.names)}</dd></div>`).join('')
      }</dl></div>` : ''}
      ${next && next !== p ? `<button class="sheet__next" data-next="${esc(next.slug)}">
        <small>Next in ${esc(cat ? cat.label : '')}</small><b>${esc(next.title)}</b></button>` : ''}
    </div>`;

  (p.images || []).forEach((src, n) => {
    if(/\.(mp4|webm|mov)$/i.test(src)) return;
    const img = new Image();
    img.src = src; img.alt = `${p.client} — ${p.title}`;
    img.onload = () => { const s = $(`[data-slot="${n}"]`); if(s) s.replaceWith(img); };
  });

  const nx = $('#sheetScroll').querySelector('[data-next]');
  if(nx) nx.addEventListener('click', e => openSheet(e.currentTarget.dataset.next));

  if(!OPEN) openPanel(p.category, true);

  $('#sheet').classList.add('is-open');
  $('#sheet').setAttribute('aria-hidden','false');
  $('#sheetScroll').scrollTop = 0;
  if(!silent) history.pushState({slug}, '', '#' + slug);
  document.title = `${p.title} — ${DATA.name}`;
}

function closeSheet(silent){
  $('#sheet').classList.remove('is-open');
  $('#sheet').setAttribute('aria-hidden','true');
  if(!silent && location.hash) history.pushState({}, '', OPEN ? '#' + OPEN : location.pathname);
}

/* ---------------------------------------------------------
   Wiring
   --------------------------------------------------------- */

function wire(){
  $('#mHome').addEventListener('click', () => { closeSheet(true); closeAbout(); closePanels(); scrollTo({top:0, behavior:'smooth'}); });
  $('#mAbout').addEventListener('click', openAbout);
  $('#aboutClose').addEventListener('click', closeAbout);
  $('#sheetClose').addEventListener('click', () => closeSheet());

  addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    if($('#sheet').classList.contains('is-open')) return closeSheet();
    if($('#aboutPanel').classList.contains('is-open')) return closeAbout();
    if(OPEN) closePanels();
  });

  addEventListener('popstate', () => {
    const h = location.hash.slice(1);
    if(!h){ closeSheet(true); closePanels(true); return; }
    if(DATA.projects.some(p => p.slug === h)) openSheet(h, true);
    else { closeSheet(true); openPanel(h, true); }
  });
}

function openAbout(){
  $('#aboutPanel').classList.add('is-open');
  $('#aboutPanel').setAttribute('aria-hidden','false');
}
function closeAbout(){
  $('#aboutPanel').classList.remove('is-open');
  $('#aboutPanel').setAttribute('aria-hidden','true');
}
