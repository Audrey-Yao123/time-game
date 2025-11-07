// 自动保存文本题答案（每分钟），不提示、不跳转，仅写入汇总数据
(function(){
  let autosaveTimer = null;
  const ctx = { textarea: null, cardId: null, playerId: null };
  function stopAutoSave(){ if (autosaveTimer) { clearInterval(autosaveTimer); autosaveTimer = null; } }
  function saveSnapshot(){
    const textarea = ctx.textarea;
    const cardId = ctx.cardId;
    const playerId = ctx.playerId;
    if (!textarea || !cardId || !playerId) return;
    const val = (textarea.value || '').trim();
    if (!val) return;
    try {
      window.state.responses[playerId] = window.state.responses[playerId] || {};
      window.state.responses[playerId][cardId] = { type: 'text', answer: val, ts: Date.now() };
      if (typeof window.saveState === 'function') window.saveState();
    } catch {}
  }

  function setupAutoSaveIfText(){
    const cardForm = document.getElementById('card-form');
    const viewCard = document.getElementById('view-card');
    if (!cardForm || !viewCard || viewCard.classList.contains('hidden')) { return; }
    const textarea = cardForm.querySelector('textarea[name="answer"]');
    const radios = cardForm.querySelectorAll('input[name="answer"][type="radio"]');
    const cardId = cardForm.dataset.cardId;
    const playerId = (window.state && window.state.currentPlayerId) || null;
    if (!cardId || !playerId) return;
    ctx.textarea = textarea;
    ctx.cardId = cardId;
    ctx.playerId = playerId;
    // 预填已保存文本答案（保留用户之前提交/自动提交的内容）
    try {
      const respByPlayer = window.state.responses[playerId] || {};
      const existing = respByPlayer[cardId];
      if (existing) {
        if (existing.type === 'text' && textarea && !textarea.value) {
          textarea.value = String(existing.answer || '');
        }
        if (existing.type === 'mcq' && radios && radios.length) {
          radios.forEach(r => { if (String(r.value) === String(existing.answer)) r.checked = true; });
        }
      }
    } catch {}
    // 在用户开始输入后，启动每分钟后台自动保存
    const onInput = () => {
      if (autosaveTimer) return; // 已启动
      autosaveTimer = setInterval(() => {
        const val = (textarea && (textarea.value || '').trim()) || '';
        if (!val) return; // 空值不保存
        try {
          window.state.responses[playerId] = window.state.responses[playerId] || {};
          window.state.responses[playerId][cardId] = { type: 'text', answer: val, ts: Date.now() };
          if (typeof window.saveState === 'function') window.saveState();
        } catch {}
      }, 60_000);
    };
    if (textarea) textarea.addEventListener('input', onInput, { once: false });
  }

  // 监听视图与表单变化：进入卡片视图或卡片内容变化时重新挂载自动保存
  function observeCardView(){
    const viewCard = document.getElementById('view-card');
    if (!viewCard) return;
    const mo = new MutationObserver(() => { setupAutoSaveIfText(); });
    mo.observe(viewCard, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // 路由变化时停止自动保存，避免在非卡片视图继续运行
  window.addEventListener('hashchange', () => { saveSnapshot(); stopAutoSave(); setTimeout(setupAutoSaveIfText, 50); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveSnapshot(); });
  // 首次加载后初始化观察与尝试挂载
  window.addEventListener('DOMContentLoaded', () => { observeCardView(); setupAutoSaveIfText(); });
})();