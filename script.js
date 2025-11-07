// 时间管理小游戏 · 卡片问答/多人汇总
const STORAGE_KEY = 'surveyGame.v1';

let state = {
  // 题目卡
  cards: [], // {id, title, type: 'mcq'|'text', options?:string[]}
  // 玩家与答案
  players: [], // {id, name}
  currentPlayerId: null,
  responses: {}, // { [playerId]: { [cardId]: {type, answer, ts} } }
};
// 暴露到全局，供外部脚本（如自动保存）访问
window.state = state;

// 工具函数
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const todayStr = () => new Date().toISOString().slice(0, 10);
const formatMMSS = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
// 题目定义（可扩展/替换）
const QUESTIONS = [
  { id: 'q1', title: '你觉得世界上最公平的资源和机会是？', type: 'text', desc: '' },
  { id: 'q2', title: '毫无意识地被各种事情推着走，可支配时间越来越少', type: 'mcq', options: ['是我', '偶尔是', '不是我'], desc: '这种状态是你么' },
  { id: 'q3', title: '学过一些时间管理工具，但不顺手，用几天就坚持不下去了', type: 'mcq', options: ['是我', '偶尔是', '不是我'], desc: '这种状态是你么' },
  { id: 'q4', title: '好不容易想专心工作，但经常被打断，自己的事做不完，有一种无力感', type: 'mcq', options: ['是我', '偶尔是', '不是我'], desc: '这种状态是你么' },
  { id: 'q5', title: '过去几周，我的时间管理的怎么样？', type: 'text', desc: '请回顾一下过去几周，你是怎么安排自己的时间和日程的，有过感觉“时间 不够用or用不好”的时候吗?' },
  { id: 'q6', title: '你用过哪些时间管理的工具或方法？', type: 'text', desc: '有了解过哪些时间管理的工具/方法（GTD、清单工作法、番茄钟、晨间日记、PDCA等），你觉得有效果么？哪些好用？哪些不好用？为什么？背后有规律吗？' },
  { id: 'q7', title: '回顾一下你每一周的工作', type: 'text', desc: '你最重要最难的任务类型是什么？你什么时间状态最好？你会有意识匹配这些【重要任务】和【重要时间】的关系吗？' },
  { id: 'q8', title: '你觉得以下哪些是“时间管理”要探讨的问题？', type: 'text', desc: '请选择序号填写\n1. 要平衡好“工作和家庭”，多留时间给家庭，保证一个大后方稳定。\n2. 要做好“精力管理”，多锻炼，保持睡眠，保持健身节奏和习惯。\n3. 要多授权给别人，学习“授权”的基本功，用授权+辅导省时间。\n4. 要开始找到“人生使命”，有了使命以后，时间管理就会大幅提升。\n5. 要学习使用“项目管理”工具，敏捷/精益/关键假设，可以节大量时间。' },
  { id: 'q9', title: '你希望解决什么样的时间管理问题？', type: 'mcq', options: ['具体的时间管理问题（针对眼下的任务，持续迭代，提高自己时间的ROI）', '泛化的时间管理问题（包含人生长期目标、精力和战略的管理）', '虽然二选一，但我真的都想聊聊'], desc: '请选择' },
  { id: 'q10', title: '你更希望解决“纯个人”还是“涉及他人”的时间管理问题？', type: 'mcq', options: ['纯个人的时间管理（不包含协作、授权、培训等管理方法）', '涉及他人的时间管理（包含协作、授权、培训等管理方法）', '虽然二选一，但我真的都想聊聊'], desc: '请选择' },
  { id: 'q11', title: '你更希望解决“工作上”还是“生活上”的时间管理问题？', type: 'mcq', options: ['工作上的时间管理（主业工作、个人副业等）', '生活上的时间管理（家庭生活、旅行、做饭、育儿、谈恋爱等）', '虽然二选一，但我真的都想聊聊'], desc: '请选择' },
  { id: 'q12', title: '你相信哪个黄金法则？', type: 'mcq', options: ['最好一次住专注做一件事', '时间提效的精髓，在于多任务并行，大幅度提升时间复用', '虽然二选一，但我觉得都有道理'], desc: '两个说法可能互相矛盾，请选择' },
  { id: 'q13', title: '你相信哪个黄金法则？', type: 'mcq', options: ['要事第一，先在重要时间完成最重要的任务', '两分钟原则，如果一个任务很简单，只需要2min，就立刻去做', '虽然二选一，但我觉得都有道理'], desc: '两个说法可能互相矛盾，请选择' },
  { id: 'q14', title: '你相信哪个黄金法则？', type: 'mcq', options: ['大脑需要定期休息，可以用番茄工作法25+5循环的节奏', '心流工作，给自己独立大块的时间进入心流状态，不被打断', '虽然二选一，但我觉得都有道理'], desc: '两个说法可能互相矛盾，请选择' },
  { id: 'q15', title: '你的时间管理到哪个段位了？', type: 'mcq', options: ['L1：很忙且混乱（忙了一天，精疲力尽，还有很多事情没做完，效率很低）', 'L2：试着用工具（努力使用工具，如番茄钟/GTD，有改善，但还是会delay）', 'L3：开始入门了（开始记录自己的时间，安排任务，将时间/精力与事情匹配）', 'L4：精细化实验（很了解自己的高峰时刻，经过实验，时间匹配做事，效率高）'], desc: '请选择' },
  { id: 'q16', title: '你认为“时间管理”需要多次实验么？', type: 'mcq', options: ['需要，尝试定量，深刻理解任务、时间与匹配', '不需要，我有另外的理解'], desc: '请选择' },
  { id: 'q17', title: '时间管理对你来说是长期追求的事情么？', type: 'mcq', options: ['需要长期追求，时间管理对我很重要', '不需要，我有另外的理解'], desc: '请选择' },
  { id: 'q18', title: '用一句话总结，你认为到底什么才是科学的时间管理？', type: 'text', desc: '请填空' },
];

// 分享编码/解码（兼容中文）
function encodeStateToBase64(obj) {
  const json = JSON.stringify(obj);
  const uriSafe = encodeURIComponent(json);
  const bin = uriSafe.replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
  return btoa(bin);
}
function decodeStateFromBase64(b64) {
  const bin = atob(b64);
  const uriSafe = Array.from(bin).map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const json = decodeURIComponent(uriSafe);
  return JSON.parse(json);
}

// 读写存储
function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
// 暴露保存方法到全局
window.saveState = saveState;
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { state.cards = QUESTIONS; return; }
  try {
    const parsed = JSON.parse(raw);
    // 强制使用最新题目定义，忽略本地存储中的旧题目
    state.cards = QUESTIONS;
    state.players = Array.isArray(parsed.players) ? parsed.players : [];
    state.currentPlayerId = parsed.currentPlayerId || null;
    state.responses = parsed.responses || {};
  } catch {
    state.cards = QUESTIONS;
  }
}

// 同步题目定义：在保留已有作答的前提下，更新卡片的标题/描述/选项
function syncQuestions() {
  if (!Array.isArray(state.cards) || !state.cards.length) {
    state.cards = QUESTIONS;
    return;
  }
  const byId = {};
  state.cards.forEach(c => { if (c && c.id) byId[c.id] = c; });
  const merged = QUESTIONS.map(q => {
    const existing = byId[q.id];
    if (!existing) return q;
    return {
      ...existing,
      // 以最新题库为准更新标题、描述、题型与选项
      title: q.title,
      desc: q.desc,
      type: q.type || existing.type,
      options: q.options || existing.options
    };
  });
  state.cards = merged;
}

// DOM
const elBigClock = document.getElementById('big-clock');
const elAnalogClock = document.getElementById('analog-clock');
const elClockFace = elAnalogClock ? elAnalogClock.querySelector('.clock-face') : null;
const elPlayerName = document.getElementById('player-name');
const elStartGame = document.getElementById('start-game');
const elDoGrab = document.getElementById('do-grab');
const elClaw = document.querySelector('.claw');
// 多玩偶容器（在场景中动态生成）
const elToy = document.querySelector('.toy'); // 旧单玩偶兼容（将不再使用）
const elToyLabel = document.getElementById('toy-label'); // 旧标签兼容（将不再使用）
const elTimeBox1 = document.getElementById('time-box-1');
const elTimeBox2 = document.getElementById('time-box-2');
const elTimeBox = document.getElementById('time-box');
const elNightSky = document.getElementById('night-sky');
const elCurrentPlayer = document.getElementById('current-player');
const elCurrentPlayerCard = document.getElementById('current-player-card');
const elCardList = document.getElementById('card-list');
const elViewHome = document.getElementById('view-home');
const elViewGame = document.getElementById('view-game');
const elViewCard = document.getElementById('view-card');
const elViewSummary = document.getElementById('view-summary');
const elCardTitle = document.getElementById('card-title');
const elCardForm = document.getElementById('card-form');
const elSubmitAnswer = document.getElementById('submit-answer');
const elBackToGame = document.getElementById('back-to-game');
const elPrevCard = document.getElementById('prev-card');
const elCardDesc = document.getElementById('card-desc');
const elSummaryHead = document.getElementById('summary-head');
const elSummaryBody = document.getElementById('summary-body');
const elSummaryCharts = document.getElementById('summary-charts');
const elSummaryText = document.getElementById('summary-text');
const elSummaryItems = document.getElementById('summary-items');
const elExportCSV = document.getElementById('export-csv');
// 统计显示元素
const elTotalCards = document.getElementById('total-cards');
const elEstTimeGame = document.getElementById('est-time-game');
const elTotalCardsCard = document.getElementById('total-cards-card');
const elEstTimeCard = document.getElementById('est-time-card');
// 蒙版提示元素（存在即用，不存在则安全跳过）
const elOverlay = document.getElementById('overlay');
const elOverlayContent = document.getElementById('overlay-content');

let clockTick = null;

// 渲染
function render() {
  // 渲染卡片列表
  elCurrentPlayer.textContent = currentPlayerName() || '未设置';
  updateStats();
  elCardList.innerHTML = '';
  const playerId = state.currentPlayerId;
  const playerResp = playerId ? (state.responses[playerId] || {}) : {};
  state.cards.forEach((q) => {
    const li = document.createElement('li');
    li.className = 'card-item';
    const left = document.createElement('div');
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';
    const status = document.createElement('span');
    const answered = !!playerResp[q.id];
    status.className = 'status-icon' + (answered ? ' answered' : '');
    status.textContent = answered ? '✓' : '';
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = q.title;
    titleRow.appendChild(status);
    titleRow.appendChild(title);
    const preview = document.createElement('div');
    preview.className = 'card-preview';
    // 列表页选择题预览：仅显示括号外内容，去掉每个选项中的括号补充
    const stripParen = (s) => String(s)
      .replace(/\s*（[^）]*）/g, '')  // 全角中文括号
      .replace(/\s*\([^)]*\)/g, '') // 半角英文括号
      .trim();
    const previewText = q.type === 'mcq'
      ? `选择题（${(q.options || []).map(stripParen).join(' / ')}）`
      : '填空题';
    preview.textContent = previewText;
    left.appendChild(titleRow);
    left.appendChild(preview);
    const btn = document.createElement('button');
    btn.textContent = '开始答题';
    btn.addEventListener('click', () => openCard(q.id));
    li.appendChild(left);
    li.appendChild(btn);
    elCardList.appendChild(li);
  });
  renderSummaryTable();
}

// 逻辑
// 玩家
function currentPlayerName() {
  return state.players.find(p => p.id === state.currentPlayerId)?.name || null;
}
function ensurePlayer(name) {
  const nm = (name || '').trim();
  if (!nm) return null;
  let player = state.players.find(p => p.name === nm);
  if (!player) {
    player = { id: uid(), name: nm };
    state.players.push(player);
  }
  state.currentPlayerId = player.id;
  state.responses[player.id] = state.responses[player.id] || {};
  saveState();
  return player;
}

// 路由
function showView(which) {
  [elViewHome, elViewGame, elViewCard, elViewSummary].forEach(v => v.classList.add('hidden'));
  if (which === 'home') elViewHome.classList.remove('hidden');
  if (which === 'game') elViewGame.classList.remove('hidden');
  if (which === 'card') elViewCard.classList.remove('hidden');
  if (which === 'summary') elViewSummary.classList.remove('hidden');
}

function startGame() {
  const name = elPlayerName.value;
  const p = ensurePlayer(name);
  if (!p) { alert('请先输入你的昵称'); return; }
  render();
  updateStats();
  showView('game');
  location.hash = '#game';
}

function openCard(cardId) {
  const q = state.cards.find(c => c.id === cardId);
  if (!q) return;
  elCurrentPlayerCard.textContent = currentPlayerName() || '未设置';
  updateStats();
  elCardTitle.textContent = q.title;
  if (elCardDesc) { elCardDesc.textContent = q.desc || ''; }
  elCardForm.innerHTML = '';
  elCardForm.dataset.cardId = cardId;
  // 读出当前玩家的已保存答案，用于预填
  const playerId = state.currentPlayerId;
  const playerResp = playerId ? (state.responses[playerId] || {}) : {};
  const existing = playerResp[cardId];
  if (q.type === 'mcq') {
    q.options.forEach((opt, i) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'answer';
      radio.value = opt;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + opt));
      elCardForm.appendChild(label);
    });
    // 预填选择题答案
    if (existing && existing.type === 'mcq') {
      const inputs = elCardForm.querySelectorAll('input[name="answer"]');
      inputs.forEach(inp => { if (String(inp.value) === String(existing.answer)) inp.checked = true; });
    }
  } else {
    const input = document.createElement('textarea');
    input.name = 'answer';
    input.rows = 10;
    input.placeholder = '请输入你的答案';
    elCardForm.appendChild(input);
    // 预填文本题答案
    if (existing && existing.type === 'text') {
      input.value = String(existing.answer || '');
    }
  }
  showView('card');
  location.hash = `#card-${cardId}`;
  updateNavActive();
}

function submitAnswer() {
  const playerId = state.currentPlayerId;
  if (!playerId) { alert('请先在首页输入昵称并开始游戏'); return; }
  const cardId = elCardForm.dataset.cardId;
  const q = state.cards.find(c => c.id === cardId);
  if (!q) return;
  let answer = null;
  if (q.type === 'mcq') {
    const checked = elCardForm.querySelector('input[name="answer"]:checked');
    if (!checked) { showOverlay('请选择一个选项'); return; }
    answer = checked.value;
  } else {
    const input = elCardForm.querySelector('textarea[name="answer"]');
    answer = (input?.value || '').trim();
    if (!answer) { showOverlay('请输入答案'); return; }
  }
  state.responses[playerId] = state.responses[playerId] || {};
  state.responses[playerId][cardId] = { type: q.type, answer, ts: Date.now() };
  saveState();
  // 自动进入下一张卡片；若为最后一张则提示并返回列表
  const idx = state.cards.findIndex(c => c.id === cardId);
  const isLast = idx >= 0 && idx === state.cards.length - 1;
  if (!isLast) {
    const nextId = state.cards[idx + 1]?.id;
    if (nextId) openCard(nextId);
    else { showView('game'); location.hash = '#game'; render(); }
  } else {
    showOverlay('恭喜你！完成了卡片问答！');
    setTimeout(() => { showView('game'); location.hash = '#game'; render(); }, 3000);
  }
}

function renderSummaryTable() {
  // 动态表头：玩家 | 已答卡数 | 完成率 | 卡片1问题 | 卡片2问题 | ...
  if (elSummaryHead) {
    elSummaryHead.innerHTML = '';
    const trHead = document.createElement('tr');
    const headCells = [
      { text: '玩家', cls: 'col-5ch' },
      { text: '已答卡数', cls: 'col-5ch' },
      { text: '完成率', cls: 'col-5ch' }
    ];
    headCells.forEach(({ text, cls }) => {
      const th = document.createElement('th');
      th.textContent = text;
      if (cls) th.classList.add(cls);
      trHead.appendChild(th);
    });
    state.cards.forEach((c, idx) => {
      const th = document.createElement('th');
      th.textContent = `卡片${idx + 1}：${c.title}`;
      trHead.appendChild(th);
    });
    elSummaryHead.appendChild(trHead);
  }

  // 表体：每位玩家一行，依次填入答案
  elSummaryBody.innerHTML = '';
  const totalCards = state.cards.length;
  state.players.forEach((p) => {
    const resp = state.responses[p.id] || {};
    const answered = Object.keys(resp).length;
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = p.name; tdName.classList.add('col-5ch');
    const tdCount = document.createElement('td'); tdCount.textContent = String(answered); tdCount.classList.add('col-5ch');
    const tdRate = document.createElement('td'); tdRate.textContent = `${Math.round((answered/totalCards)*100)}%`; tdRate.classList.add('col-5ch');
    tr.appendChild(tdName); tr.appendChild(tdCount); tr.appendChild(tdRate);
    // 题目答案按列填充
    state.cards.forEach((c) => {
      const tdAns = document.createElement('td');
      const r = resp[c.id];
      const val = r ? String(r.answer) : '';
      tdAns.textContent = val.replace(/\n/g, ' ');
      tr.appendChild(tdAns);
    });
    elSummaryBody.appendChild(tr);
  });

  // 改为按题目顺序依次渲染
  renderSummaryItems();
}

// 颜色方案（循环使用）
const PIE_COLORS = ['#60a5fa','#f472b6','#34d399','#fbbf24','#a78bfa','#f87171','#22d3ee','#c4b5fd'];
const COLOR_UNANSWERED = '#6b7280';

// 兼容性：检测是否支持 conic-gradient（部分微信/旧内核可能不支持）
function supportsConicGradient() {
  try {
    if (typeof CSS === 'undefined' || !CSS.supports) return false;
    return (
      CSS.supports('background-image', 'conic-gradient(from 0deg, #000 0%, #fff 100%)') ||
      CSS.supports('background', 'conic-gradient(#000 0%, #fff 100%)')
    );
  } catch (_) {
    return false;
  }
}

// 使用 conic-gradient 渲染饼图背景
function renderPieConicGradient(pieEl, counts, unanswered, total) {
  let acc = 0;
  const segments = [];
  counts.forEach((c, i) => {
    const pct = c / total * 100;
    const start = acc; const end = acc + pct; acc = end;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    segments.push(`${color} ${start}% ${end}%`);
  });
  if (unanswered > 0) {
    const pct = unanswered / total * 100; const start = acc; const end = acc + pct; acc = end;
    segments.push(`${COLOR_UNANSWERED} ${start}% ${end}%`);
  }
  pieEl.style.background = `conic-gradient(${segments.join(', ')})`;
}

// 不支持 conic-gradient 时，使用 SVG 甜甜圈作为等效渲染（外观一致）
function renderPieSVG(pieEl, counts, unanswered, total) {
  // 清空背景，避免默认径向渐变干扰
  pieEl.style.background = 'transparent';
  pieEl.innerHTML = '';

  const size = 160;          // 与 .pie 的尺寸一致
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;         // 圆环半径
  const stroke = 40;         // 圆环厚度（视觉接近 conic）
  const circumference = 2 * Math.PI * radius;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // 背景环（淡色边框效果，与 .pie 的内阴影近似）
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', String(cx));
  bg.setAttribute('cy', String(cy));
  bg.setAttribute('r', String(radius));
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'rgba(255,255,255,0.12)');
  bg.setAttribute('stroke-width', String(stroke));
  bg.setAttribute('stroke-linecap', 'butt');
  svg.appendChild(bg);

  // 累积偏移（起始位置为 0% 顶部）
  let accPct = 0;
  const addSegment = (pct, color) => {
    if (pct <= 0) return;
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    seg.setAttribute('cx', String(cx));
    seg.setAttribute('cy', String(cy));
    seg.setAttribute('r', String(radius));
    seg.setAttribute('fill', 'none');
    seg.setAttribute('stroke', color);
    seg.setAttribute('stroke-width', String(stroke));
    seg.setAttribute('stroke-linecap', 'butt');

    const segLen = circumference * (pct / 100);
    const offset = circumference * (1 - accPct / 100);
    seg.setAttribute('stroke-dasharray', `${segLen} ${circumference}`);
    seg.setAttribute('stroke-dashoffset', String(offset));
    svg.appendChild(seg);
    accPct += pct;
  };

  counts.forEach((c, i) => {
    const pct = c / total * 100;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    addSegment(pct, color);
  });
  if (unanswered > 0) {
    const pct = unanswered / total * 100;
    addSegment(pct, COLOR_UNANSWERED);
  }

  pieEl.appendChild(svg);
}

function renderSummaryCharts() {
  if (!elSummaryCharts) return;
  elSummaryCharts.innerHTML = '';
  // 按题目原始顺序渲染所有选择题图表
  state.cards.forEach((q) => {
    if (q.type !== 'mcq') return;
    const counts = (q.options || []).map(() => 0);
    let unanswered = 0;
    state.players.forEach((p) => {
      const r = (state.responses[p.id] || {})[q.id];
      if (!r || r.type !== 'mcq') { unanswered++; return; }
      const idx = (q.options || []).findIndex(opt => String(opt) === String(r.answer));
      if (idx >= 0) counts[idx]++;
      else unanswered++;
    });
    const total = counts.reduce((a,b)=>a+b,0) + unanswered;
    // 构建图卡
    const card = document.createElement('div'); card.className = 'chart-card';
    const title = document.createElement('div'); title.className = 'chart-title'; title.textContent = q.title; card.appendChild(title);
    const pie = document.createElement('div'); pie.className = 'pie';
    if (total > 0) {
      if (supportsConicGradient()) {
        renderPieConicGradient(pie, counts, unanswered, total);
      } else {
        renderPieSVG(pie, counts, unanswered, total);
      }
    } else {
      pie.style.background = 'radial-gradient(circle, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
    }
    card.appendChild(pie);
    const legend = document.createElement('div'); legend.className = 'legend';
    (q.options || []).forEach((opt, i) => {
      const item = document.createElement('div'); item.className = 'legend-item';
      const sw = document.createElement('span'); sw.className = 'legend-swatch'; sw.style.background = PIE_COLORS[i % PIE_COLORS.length];
      const label = document.createElement('span'); label.textContent = String(opt);
      const cnt = document.createElement('span'); cnt.className = 'legend-count'; cnt.textContent = String(counts[i]);
      item.appendChild(sw); item.appendChild(label); item.appendChild(cnt);
      legend.appendChild(item);
    });
    if (unanswered > 0) {
      const item = document.createElement('div'); item.className = 'legend-item';
      const sw = document.createElement('span'); sw.className = 'legend-swatch'; sw.style.background = COLOR_UNANSWERED;
      const label = document.createElement('span'); label.textContent = '未作答';
      const cnt = document.createElement('span'); cnt.className = 'legend-count'; cnt.textContent = String(unanswered);
      item.appendChild(sw); item.appendChild(label); item.appendChild(cnt);
      legend.appendChild(item);
    }
    card.appendChild(legend);
    elSummaryCharts.appendChild(card);
  });
}

function renderSummaryTextTables() {
  if (!elSummaryText) return;
  elSummaryText.innerHTML = '';
  const textCards = state.cards.filter(c => c.type === 'text');
  textCards.forEach((q) => {
    const card = document.createElement('div'); card.className = 'text-card';
    const title = document.createElement('div'); title.className = 'text-title'; title.textContent = q.title; card.appendChild(title);
    const table = document.createElement('table'); table.className = 'text-table';
    const thead = document.createElement('thead'); const thr = document.createElement('tr');
    const th1 = document.createElement('th'); th1.textContent = '玩家'; th1.classList.add('col-5ch');
    const th2 = document.createElement('th'); th2.textContent = '答案';
    thr.appendChild(th1); thr.appendChild(th2); thead.appendChild(thr); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    let filled = 0;
    state.players.forEach((p) => {
      const r = (state.responses[p.id] || {})[q.id];
      if (r && r.type === 'text') {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = p.name;
        const td2 = document.createElement('td'); td2.textContent = String(r.answer || '');
        tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
        filled++;
      }
    });
    if (filled === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 2; td.textContent = '暂无答案'; td.style.color = 'var(--muted)';
      tr.appendChild(td); tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    card.appendChild(table);
    elSummaryText.appendChild(card);
  });
}

// 按题目顺序依次渲染（Q1-Q18）：选择题为饼图、填空题为表格
function renderSummaryItems() {
  if (!elSummaryItems) return;
  elSummaryItems.innerHTML = '';
  state.cards.forEach((q) => {
    if (q.type === 'mcq') {
      const counts = (q.options || []).map(() => 0);
      let unanswered = 0;
      state.players.forEach((p) => {
        const r = (state.responses[p.id] || {})[q.id];
        if (!r || r.type !== 'mcq') { unanswered++; return; }
        const idx = (q.options || []).findIndex(opt => String(opt) === String(r.answer));
        if (idx >= 0) counts[idx]++; else unanswered++;
      });
      const total = counts.reduce((a,b)=>a+b,0) + unanswered;
      const card = document.createElement('div'); card.className = 'chart-card';
      const title = document.createElement('div'); title.className = 'chart-title'; title.textContent = q.title; card.appendChild(title);
      const pie = document.createElement('div'); pie.className = 'pie';
      if (total > 0) {
        let acc = 0; const segments = [];
        counts.forEach((c, i) => {
          const pct = c / total * 100; const start = acc; const end = acc + pct; acc = end;
          const color = PIE_COLORS[i % PIE_COLORS.length]; segments.push(`${color} ${start}% ${end}%`);
        });
        if (unanswered > 0) { const pct = unanswered / total * 100; const start = acc; const end = acc + pct; acc = end; segments.push(`${COLOR_UNANSWERED} ${start}% ${end}%`); }
        pie.style.background = `conic-gradient(${segments.join(', ')})`;
      } else {
        pie.style.background = 'radial-gradient(circle, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
      }
      card.appendChild(pie);
      const legend = document.createElement('div'); legend.className = 'legend';
      (q.options || []).forEach((opt, i) => {
        const item = document.createElement('div'); item.className = 'legend-item';
        const sw = document.createElement('span'); sw.className = 'legend-swatch'; sw.style.background = PIE_COLORS[i % PIE_COLORS.length];
        const label = document.createElement('span'); label.textContent = String(opt);
        const cnt = document.createElement('span'); cnt.className = 'legend-count'; cnt.textContent = String(counts[i]);
        item.appendChild(sw); item.appendChild(label); item.appendChild(cnt); legend.appendChild(item);
      });
      if (unanswered > 0) {
        const item = document.createElement('div'); item.className = 'legend-item';
        const sw = document.createElement('span'); sw.className = 'legend-swatch'; sw.style.background = COLOR_UNANSWERED;
        const label = document.createElement('span'); label.textContent = '未作答';
        const cnt = document.createElement('span'); cnt.className = 'legend-count'; cnt.textContent = String(unanswered);
        item.appendChild(sw); item.appendChild(label); item.appendChild(cnt); legend.appendChild(item);
      }
      card.appendChild(legend);
      elSummaryItems.appendChild(card);
    } else if (q.type === 'text') {
      const card = document.createElement('div'); card.className = 'text-card';
      const title = document.createElement('div'); title.className = 'text-title'; title.textContent = q.title; card.appendChild(title);
      const table = document.createElement('table'); table.className = 'text-table';
      const thead = document.createElement('thead'); const thr = document.createElement('tr');
      const th1 = document.createElement('th'); th1.textContent = '玩家'; th1.classList.add('col-5ch');
      const th2 = document.createElement('th'); th2.textContent = '答案';
      thr.appendChild(th1); thr.appendChild(th2); thead.appendChild(thr); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      let filled = 0;
      state.players.forEach((p) => {
        const r = (state.responses[p.id] || {})[q.id];
        if (r && r.type === 'text') {
          const tr = document.createElement('tr');
          const td1 = document.createElement('td'); td1.textContent = p.name; td1.classList.add('col-5ch');
          const td2 = document.createElement('td'); td2.textContent = String(r.answer || '');
          tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr); filled++;
        }
      });
      if (filled === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td'); td.colSpan = 2; td.textContent = '暂无答案'; td.style.color = 'var(--muted)';
        tr.appendChild(td); tbody.appendChild(tr);
      }
    table.appendChild(tbody);
    const wrap = document.createElement('div'); wrap.className = 'table-scroll';
    wrap.appendChild(table);
    card.appendChild(wrap);
    elSummaryItems.appendChild(card);
    }
  });
}

// 预计用时（分钟）：按题型分配权重（填空题3分钟，选择题1分钟）
const EST_MIN_TEXT = 3;
const EST_MIN_MCQ = 1;
function computeEstimatedMinutes(cards) {
  if (!Array.isArray(cards) || !cards.length) return 0;
  return cards.reduce((sum, c) => {
    if (c.type === 'text') return sum + EST_MIN_TEXT;
    if (c.type === 'mcq') return sum + EST_MIN_MCQ;
    return sum + EST_MIN_TEXT; // 未知类型按填空题估算
  }, 0);
}
function updateStats() {
  const total = state.cards.length || 0;
  const est = computeEstimatedMinutes(state.cards);
  if (elTotalCards) elTotalCards.textContent = String(total);
  if (elEstTimeGame) elEstTimeGame.textContent = String(est);
  if (elTotalCardsCard) elTotalCardsCard.textContent = String(total);
  if (elEstTimeCard) elEstTimeCard.textContent = String(est);
}

// 导出/导入
function exportCSV() {
  const rows = [['player','cardId','question','type','answer','timestamp']];
  state.players.forEach((p) => {
    const resp = state.responses[p.id] || {};
    Object.keys(resp).forEach((cid) => {
      const r = resp[cid];
      const q = state.cards.find(c => c.id === cid);
      rows.push([p.name, cid, q?.title || '', r.type, String(r.answer).replace(/\n/g,' '), new Date(r.ts).toISOString()]);
    });
  });
  const csv = rows.map(row => row.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\n');
  downloadText(csv, 'results.csv', 'text/csv');
}


function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
// UI：全屏蒙版提示（3秒自动消失）
let overlayTimer = null;
function showOverlay(message) {
  const overlay = elOverlay || document.getElementById('overlay');
  const content = elOverlayContent || document.getElementById('overlay-content');
  if (!overlay || !content) return;
  content.textContent = message || '';
  overlay.classList.remove('hidden');
  if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }
  overlayTimer = setTimeout(() => { overlay.classList.add('hidden'); }, 3000);
}

// 首页时钟：驱动指针式钟表
function startClock() {
  if (clockTick) return;
  const handHour = document.getElementById('hand-hour');
  const handMinute = document.getElementById('hand-minute');
  const handSecond = document.getElementById('hand-second');
  if (!handHour || !handMinute || !handSecond) return; // 安全防护

  const update = () => {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    const ms = d.getMilliseconds();
    // 指针基准改为顶部：统一 +270° 偏移，使 12 在上方
    const hourDeg = ((h % 12) * 30 + m * 0.5 + 270) % 360; // 360/12 + 0.5/min
    const minuteDeg = (m * 6 + s * 0.1 + 270) % 360;       // 360/60 + 0.1/sec
    const secondDeg = (s * 6 + ms * 0.006 + 270) % 360;    // 360/60 + 0.006/ms
    handHour.style.transform = `rotate(${hourDeg}deg)`;
    handMinute.style.transform = `rotate(${minuteDeg}deg)`;
    handSecond.style.transform = `rotate(${secondDeg}deg)`;
  };
  update();
  clockTick = setInterval(update, 33);
}

// 构建表盘刻度与数字
function buildClockFace() {
  if (!elClockFace) return;
  // 数字（1-12）
  for (let i = 1; i <= 12; i++) {
    const el = document.createElement('div');
    el.className = 'clock-number';
    // 将 12 放在顶部，使用 +270° 偏移
    const angle = ((i % 12) * 30 + 270) % 360;
    el.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(90px) rotate(${-angle}deg)`;
    const span = document.createElement('span');
    span.textContent = String(i);
    el.appendChild(span);
    elClockFace.appendChild(el);
  }
  // 刻度（60）
  for (let i = 0; i < 60; i++) {
    const t = document.createElement('div');
    t.className = 'tick' + (i % 5 === 0 ? ' hour' : '');
    const angle = (i * 6 + 270) % 360;
    t.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translate(110px)`;
    elClockFace.appendChild(t);
  }
}

// 主题切换逻辑移除，统一夜间主题

// 抓娃娃交互
// 多玩偶与抓取逻辑（偶数成功、奇数失败）
let clawAttempts = 0; // 点击次数（奇数失败、偶数成功）
let clawBusy = false;
let toys = [];
// 统一抓取下降距离（像素）
const DROP_DISTANCE = 80;
function spawnToys(n = 2) {
  const scene = elClaw?.parentElement;
  if (!scene) return;
  // 清理旧玩偶
  scene.querySelectorAll('.toy').forEach(t => t.remove());
  toys = [];
  const palette = [
    'radial-gradient(circle at 14px 14px, #fde68a, #f59e0b)',
    'radial-gradient(circle at 14px 14px, #a7f3d0, #10b981)'
  ];
  // 两个玩偶靠近场景中线左右对称排布（相对中线偏移）
  const offsets = [-30, 30];
  for (let i = 0; i < n; i++) {
    const t = document.createElement('div');
    t.className = 'toy';
    const label = document.createElement('span');
    label.className = 'toy-label';
    label.textContent = `事项${i+1}`;
    t.appendChild(label);
    // 水平围绕中线偏移，保持底部与盒子底边对齐（使用默认 .toy 样式 bottom: 24px）
    if (i === 0) {
      t.style.left = 'calc(50% - 30px)';
    } else {
      t.style.left = 'calc(50% + 30px)';
    }
    // 不设置 top/bottom/transform，保留 CSS 中的 bottom 与弹跳动画
    t.style.background = palette[i % palette.length];
    scene.appendChild(t);
    toys.push(t);
  }
}
function setupClawInteraction() {
  if (!elDoGrab || !elClaw || !elTimeBox1 || !elTimeBox2) return;
  const scene = elClaw.parentElement;
  elDoGrab.addEventListener('click', async () => {
    if (clawBusy) return;
    clawBusy = true;
    // 停止闲置动画
    elClaw.style.animation = 'none';
    // 启用过渡，仅在交互移动时使用，避免与闲置动画冲突
    elClaw.classList.add('moving');
    clawAttempts++;
    // 结果顺序：第1次失败，第2次成功（事项1→右盒），第3次成功（事项2→左盒），之后失败
    const isSuccess = (clawAttempts === 2 || clawAttempts === 3);
    if (!isSuccess) {
      // 奇数次：尝试但抓不上（水平后竖直，返回亦分段）
      const attemptX = 120;
      const attemptY = 80;
      const preDropYFail = Math.max(0, attemptY - DROP_DISTANCE);
      // 统一失败下降段：先到预降高度，再以固定距离下落
      await animateClawToHV({ x: attemptX, y: preDropYFail });
      await animateClawTo({ x: attemptX, y: attemptY });
      await animateClawUpSideDown({ x: 8, y: 0, upY: 0 });
      elClaw.style.animation = '';
      elClaw.classList.remove('moving');
      clawBusy = false;
      return;
    }
    // 偶数次：如果还有未被抓的玩偶，抓取一个
    const target = toys.find(t => t && !t.dataset.captured);
    if (!target) {
      // 无可抓玩偶，直接复位
      await animateClawTo({ x: 8, y: 0 });
      elClaw.style.animation = '';
      elClaw.classList.remove('moving');
      clawBusy = false;
      return;
    }
    const toyPos = calcToyPos(target);
    // 统一下降距离：先到目标上方 DROP_DISTANCE 的预降高度，再进行固定距离的下降
    const targetY = toyPos.y - 36;
    const preDropY = Math.max(0, targetY - DROP_DISTANCE);
    await animateClawToHV({ x: toyPos.x - 26, y: preDropY });
    await animateClawTo({ x: toyPos.x - 26, y: targetY });
    elClaw.classList.add('grab');
    attachToyToClaw(target);
    // 回到顶部起点：先竖直提升，再水平至起点，再竖直（到 0 不变）
    await animateClawUpSideDown({ x: 8, y: 0, upY: 0 });
    // 移动到盒子右下角
    const boxEl = pickBoxForToy(target);
    const boxPos = calcBoxPos(boxEl);
    // 停在盒子上方的安全高度，避免伸入盒子
    const safeY = Math.max(0, boxPos.y - 42);
    // 送盒：先竖直提升，再水平到盒子上方，再竖直下降到安全高度
    await animateClawUpSideDown({ x: boxPos.x - 26, y: safeY, upY: 0 });
    // 放入盒子并标记不再出现
    placeToyInBox(target, boxEl);
    target.dataset.captured = '1';
    // 复位与闲置动画恢复（竖直→水平→竖直）
    await animateClawUpSideDown({ x: 8, y: 0, upY: 0 });
    elClaw.classList.remove('grab');
    elClaw.style.animation = '';
    elClaw.classList.remove('moving');
    clawBusy = false;
  });
}
function calcBoxPos(box) {
  const rectScene = elClaw.parentElement.getBoundingClientRect();
  const rectBox = box.getBoundingClientRect();
  return { x: rectBox.left - rectScene.left + rectBox.width/2, y: rectBox.top - rectScene.top };
}
function calcToyPos(el) {
  const rectScene = elClaw.parentElement.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - rectScene.left + r.width/2, y: r.top - rectScene.top };
}
function animateClawTo({x,y}) {
  return new Promise((resolve) => {
    const scene = elClaw.parentElement;
    const w = scene?.clientWidth || 240;
    const h = scene?.clientHeight || 240;
    const clawW = 60; // 与 CSS .claw 宽度一致
    const clawH = 120; // 与 CSS .claw 高度一致
    const xClamped = clamp(x, 0, Math.max(0, w - clawW));
    const yClamped = clamp(y, 0, Math.max(0, h - clawH));
    elClaw.style.transform = `translateX(${xClamped}px) translateY(${yClamped}px)`;
    // 过渡时间与 CSS transition 对齐
    setTimeout(resolve, 850);
  });
}
// 水平+竖直分段移动（无斜线）
function animateClawToHV({x,y}) {
  const current = getClawXY();
  return new Promise(async (resolve) => {
    await animateClawTo({ x, y: current.y });
    await animateClawTo({ x, y });
    resolve();
  });
}
// 竖直提升 → 水平移动 → 竖直下降（用于回退或送盒）
function animateClawUpSideDown({x,y, upY=0}) {
  const current = getClawXY();
  return new Promise(async (resolve) => {
    await animateClawTo({ x: current.x, y: upY });
    await animateClawTo({ x, y: upY });
    await animateClawTo({ x, y });
    resolve();
  });
}
function getClawXY() {
  const m = /translateX\(([-0-9.]+)px\) translateY\(([-0-9.]+)px\)/.exec(elClaw.style.transform || 'translateX(0px) translateY(0px)');
  return { x: m ? parseFloat(m[1]) : 0, y: m ? parseFloat(m[2]) : 0 };
}
function attachToyToClaw(toy) {
  toy.style.animation = 'none';
  toy.style.left = '50%';
  toy.style.top = '56px';
  toy.style.bottom = 'auto';
  toy.style.transform = 'translateX(-50%)';
  toy.classList.add('picked');
  elClaw.appendChild(toy);
}
function placeToyInBox(toy, boxEl) {
  boxEl.appendChild(toy);
  toy.style.animation = 'none';
  toy.style.position = 'absolute';
  toy.style.left = '50%';
  toy.style.transform = 'translateX(-50%)';
  toy.style.top = 'auto';
  toy.style.bottom = '6px';
}
function pickBoxForToy(toy) {
  const idx = toys.indexOf(toy); // 0-based
  // 1号到第一个盒子，2号到第二个盒子
  if (idx === 0) return elTimeBox1;
  return elTimeBox2;
}

// 事件绑定
elStartGame.addEventListener('click', () => {
  const name = (elPlayerName?.value || '').trim();
  if (!name) { showOverlay('请输入你的昵称'); return; }
  startGame();
});
elSubmitAnswer.addEventListener('click', (e)=>{ e.preventDefault(); submitAnswer(); });
elBackToGame.addEventListener('click', ()=>{ showView('game'); location.hash='#game'; });
if (elPrevCard) {
  elPrevCard.addEventListener('click', () => {
    const currId = elCardForm?.dataset?.cardId;
    if (!currId) return;
    const idx = state.cards.findIndex(c => c.id === currId);
    if (idx <= 0) { showOverlay('已经是第一张卡片'); return; }
    const prevId = state.cards[idx - 1]?.id;
    if (!prevId) { showOverlay('已经是第一张卡片'); return; }
    openCard(prevId);
  });
}
elExportCSV && elExportCSV.addEventListener('click', exportCSV);
// 主题切换事件移除

// 开始游戏按钮自适应换行（若按钮不足以容纳4字符，则在“开始/游戏”处换行）
function adjustStartButtonWrap() {
  if (!elStartGame) return;
  elStartGame.innerHTML = '<span class="btn-line">开始</span><span class="btn-line">游戏</span>';
  elStartGame.style.lineHeight = '1.3';
}

window.addEventListener('hashchange', () => {
  const h = location.hash;
  // 进入卡片/游戏前需先输入昵称
  const hasPlayer = !!currentPlayerName();
  if (h === '#game') {
    if (!hasPlayer) { showOverlay('请输入你的昵称'); showView('home'); location.hash = '#home'; }
    else { showView('game'); }
  }
  else if (h.startsWith('#card-')) {
    if (!hasPlayer) { showOverlay('请输入你的昵称'); showView('home'); location.hash = '#home'; }
    else { const id = h.slice(6); openCard(id); }
  }
  else if (h === '#summary') { showView('summary'); renderSummaryTable(); }
  else { showView('home'); }
  updateNavActive();
});

// 初始化
loadState();
if (!state.cards || !state.cards.length) state.cards = QUESTIONS;
// 保留历史数据的同时，更新到最新题目内容
syncQuestions();
// 将最新题目写回本地存储，以后加载直接使用
try { saveState(); } catch {}
// 初始化时也进行路由守卫：未输入昵称不可进入卡片/游戏
(() => {
  const h = location.hash;
  const hasPlayer = !!currentPlayerName();
  if (h === '#game') {
    if (!hasPlayer) { showOverlay('请输入你的昵称'); showView('home'); location.hash = '#home'; }
    else { showView('game'); }
  } else if (h.startsWith('#card-')) {
    if (!hasPlayer) { showOverlay('请输入你的昵称'); showView('home'); location.hash = '#home'; }
    else { const id = h.slice(6); openCard(id); }
  } else if (h === '#summary') {
    showView('summary');
    renderSummaryTable();
  } else {
    showView('home');
  }
})();
render();
buildClockFace();
spawnToys(2);
setupClawInteraction();
generateStars(140);
startClock();
adjustStartButtonWrap();
updateNavActive();
window.addEventListener('resize', adjustStartButtonWrap);

// 生成动态星空
function generateStars(n=120) {
  if (!elNightSky) return;
  for (let i = 0; i < n; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    const x = Math.random() * 100; // %
    const y = Math.random() * 100; // %
    const size = 1 + Math.random() * 2;
    const dur = 2 + Math.random() * 3;
    const delay = Math.random() * 3;
    star.style.left = x + '%';
    star.style.top = y + '%';
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.animationDuration = dur + 's';
    star.style.animationDelay = delay + 's';
    elNightSky.appendChild(star);
  }
}

// 已移除每日目标相关旧函数（新架构不再使用）

// 分享与导入改为使用汇总页的 JSON/CSV（旧逻辑移除）

// 事件（新架构已在上文绑定，旧代码清理）

// 初始化
// 旧版初始化移除（新初始化已在上文）
// 根据当前哈希更新导航选中态
function updateNavActive() {
  const links = document.querySelectorAll('.nav a');
  const h = location.hash || '#home';
  links.forEach(a => {
    const target = a.getAttribute('href');
    const isActive = (h === '#home' && target === '#home')
      || (h === '#game' && target === '#game')
      || (h === '#summary' && target === '#summary')
      || (h.startsWith('#card-') && target === '#game');
    a.classList.toggle('active', !!isActive);
  });
}