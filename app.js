
const STORE_KEY = 'rustlab-viewed-v1';
const POS_KEY = 'rustlab-last-nav-v1';
const $ = (id) => document.getElementById(id);

let course = [];
let filter = 'all';
let idx = 0;

function loadViewed() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
  catch { return {}; }
}
function isViewed(id) { return !!loadViewed()[id]; }
function markViewed(id) {
  const m = loadViewed();
  m[id] = { at: new Date().toISOString() };
  localStorage.setItem(STORE_KEY, JSON.stringify(m));
}
function savePos(i) { localStorage.setItem(POS_KEY, String(i)); }
function loadPos() {
  const n = Number(localStorage.getItem(POS_KEY) || '0');
  return Number.isFinite(n) ? Math.max(0, Math.min(course.length - 1, n)) : 0;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

function filtered() {
  return course.filter(it => {
    if (filter === 'unread') return !isViewed(it.id);
    if (filter === 'video') return !!it.video;
    return true;
  });
}

function renderHome() {
  const resumeIdx = (() => {
    const unread = course.findIndex(it => !isViewed(it.id));
    return unread >= 0 ? unread : loadPos();
  })();
  const resume = course[resumeIdx];
  $('resumeTitle').textContent = resume ? resume.title : '강의 없음';
  $('resumeBtn').dataset.idx = String(resumeIdx);

  const list = $('list');
  const items = filtered();
  if (!items.length) {
    list.innerHTML = '<li class="empty">표시할 강의가 없어요.</li>';
    return;
  }
  list.innerHTML = items.map((it, visualPos) => {
    const done = isViewed(it.id);
    const n = String(it.nav_index + 1).padStart(2, '0');
    const pill = it.video
      ? '<span class="pill video">VIDEO</span>'
      : '<span class="pill text">TEXT</span>';
    return `<li>
      <button type="button" class="lesson${done ? ' done' : ''}" data-idx="${it.nav_index}">
        <div class="lesson-idx">
          <div class="n">${done ? '✓' : n}</div>
          <div class="spine"></div>
        </div>
        <div class="lesson-card">
          <div class="top">${pill}<span class="seen">${done ? '봤음' : '안 봄'}</span></div>
          <h3>${esc(it.title)}</h3>
          <p>${esc(it.phase)} · #${it.index}</p>
        </div>
      </button>
    </li>`;
  }).join('');

  list.querySelectorAll('.lesson').forEach(btn => {
    btn.addEventListener('click', () => openWatch(Number(btn.dataset.idx)));
  });
}

function openWatch(i) {
  if (!course.length) return;
  i = Math.max(0, Math.min(course.length - 1, Number(i) || 0));
  idx = i;
  const it = course[i];
  markViewed(it.id);
  savePos(i);

  $('home').classList.add('hidden');
  $('watch').classList.remove('hidden');

  const pct = ((i + 1) / course.length) * 100;
  $('barFill').style.width = pct + '%';
  $('watchCount').textContent = `${i + 1} / ${course.length}`;
  $('watchKicker').textContent = `${it.phase} · Lesson ${it.index}`;
  $('watchTitle').textContent = it.title || '';

  const cinema = $('cinema');
  if (it.video) {
    cinema.innerHTML = `<video id="v" controls playsinline preload="metadata" src="videos/${encodeURIComponent(it.video)}"></video>
      <a class="dl" href="videos/${encodeURIComponent(it.video)}" download>영상 저장</a>`;
  } else {
    cinema.innerHTML = `<div class="placeholder">텍스트 강의입니다.<br/>아래에서 바로 읽어 보세요.</div>`;
  }
  $('watchBody').innerHTML = it.html || '';

  $('prevBtn').disabled = i <= 0;
  $('nextBtn').disabled = i >= course.length - 1;

  window.scrollTo(0, 0);
  history.replaceState(null, '', '#' + encodeURIComponent(it.id));
  renderHome();
}

function closeWatch() {
  $('watch').classList.add('hidden');
  $('home').classList.remove('hidden');
  history.replaceState(null, '', '#');
  renderHome();
}

function on(el, fn) {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (el.disabled) return;
    fn(e);
  });
}

function bind() {
  on($('prevBtn'), () => openWatch(idx - 1));
  on($('nextBtn'), () => openWatch(idx + 1));
  on($('backHome'), closeWatch);
  on($('resumeBtn'), () => openWatch(Number($('resumeBtn').dataset.idx || 0)));

  document.querySelectorAll('.seg-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderHome();
    });
  });

  document.addEventListener('keydown', (e) => {
    if ($('watch').classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') openWatch(idx - 1);
    if (e.key === 'ArrowRight') openWatch(idx + 1);
    if (e.key === 'Escape') closeWatch();
  });
}

async function boot() {
  const data = await (await fetch('data.json', { cache: 'no-store' })).json();
  course = (data.items || []).filter(x => x.kind === 'lesson');
  course.forEach((it, i) => { it.nav_index = i; it.nav_total = course.length; });
  $('metaLine').textContent = `총 ${course.length}강 · 커리큘럼 순서 · 읽음은 이 기기에만 저장`;
  bind();
  renderHome();
  const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (hash) {
    const i = course.findIndex(x => x.id === hash);
    if (i >= 0) openWatch(i);
  }
}
boot();
