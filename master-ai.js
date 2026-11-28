(() => {
  'use strict';

  if (window.__masterAiUiLoaded) return;
  window.__masterAiUiLoaded = true;

  const state = { messages: [], busy: false, open: false };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

  const style = document.createElement('style');
  style.textContent = `
    #masterAiLauncher{position:fixed;right:20px;bottom:20px;z-index:1500;border:0;border-radius:999px;background:#176b58;color:#fff;padding:13px 18px;font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 8px 28px #102a4333;cursor:pointer}
    #masterAiPanel{position:fixed;right:20px;bottom:78px;z-index:1501;width:min(410px,calc(100vw - 24px));height:min(620px,calc(100dvh - 110px));background:#fff;border:1px solid #dce3eb;border-radius:18px;box-shadow:0 18px 60px #102a4333;display:none;flex-direction:column;overflow:hidden;color:#172333;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #masterAiPanel.open{display:flex}
    .mai-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:#142033;color:#fff}
    .mai-title{font-weight:800;font-size:15px}.mai-sub{font-size:11px;color:#c5d0df;margin-top:3px}
    .mai-close{border:0;background:transparent;color:#fff;font-size:23px;cursor:pointer;padding:2px 6px}
    .mai-note{padding:9px 12px;background:#fff8e7;color:#765313;font-size:11px;line-height:1.4;border-bottom:1px solid #f0e2bd}
    .mai-messages{flex:1;overflow:auto;padding:13px;background:#f5f7fa;display:flex;flex-direction:column;gap:9px}
    .mai-msg{max-width:90%;padding:10px 12px;border-radius:13px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}
    .mai-msg.user{align-self:flex-end;background:#e5edff;color:#173a7a;border-bottom-right-radius:4px}
    .mai-msg.assistant{align-self:flex-start;background:#fff;border:1px solid #e3e8ef;border-bottom-left-radius:4px}
    .mai-empty{color:#64748b;text-align:center;margin:auto;line-height:1.5;padding:18px}
    .mai-prompts{display:flex;gap:6px;flex-wrap:wrap;padding:9px 12px;border-top:1px solid #e6ebf1;background:#fff}
    .mai-prompt{border:1px solid #dce4ed;border-radius:20px;padding:6px 9px;background:#fff;color:#334155;font-size:11px;cursor:pointer}
    .mai-form{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #e6ebf1}
    .mai-input{min-width:0;flex:1;resize:none;border:1px solid #d6deea;border-radius:11px;padding:10px;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-height:100px}
    .mai-send{border:0;border-radius:11px;background:#176b58;color:#fff;font-weight:700;padding:0 14px;cursor:pointer}
    .mai-send:disabled{opacity:.5;cursor:wait}
    @media(max-width:600px){#masterAiLauncher{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:12px 15px}#masterAiPanel{right:6px;bottom:calc(65px + env(safe-area-inset-bottom));width:calc(100vw - 12px);height:calc(100dvh - 90px);max-height:720px}}
  `;
  document.head.appendChild(style);

  const launcher = document.createElement('button');
  launcher.id = 'masterAiLauncher';
  launcher.type = 'button';
  launcher.textContent = '✦ MASTER AI';
  launcher.setAttribute('aria-label', 'Открыть MASTER AI');

  const panel = document.createElement('section');
  panel.id = 'masterAiPanel';
  panel.setAttribute('aria-label', 'MASTER AI помощник');
  panel.innerHTML = `
    <header class="mai-head">
      <div><div class="mai-title">✦ MASTER AI</div><div class="mai-sub">Помощник мебельного производства</div></div>
      <button class="mai-close" type="button" aria-label="Закрыть">×</button>
    </header>
    <div class="mai-note">Первый этап: чат работает без чтения и изменения данных CRM. Подключение модулей будет выполняться отдельно после проверки прав доступа.</div>
    <div class="mai-messages" aria-live="polite"><div class="mai-empty">Здравствуйте! Я MASTER AI.<br>Могу помочь с мебельными проектами, материалами, фурнитурой, организацией производства и работой в CRM.</div></div>
    <div class="mai-prompts">
      <button class="mai-prompt" type="button">Проверить расчёт мебели</button>
      <button class="mai-prompt" type="button">Составить план производства</button>
      <button class="mai-prompt" type="button">Подобрать фурнитуру</button>
    </div>
    <form class="mai-form">
      <textarea class="mai-input" rows="1" maxlength="5000" placeholder="Напиши вопрос помощнику…" aria-label="Сообщение"></textarea>
      <button class="mai-send" type="submit">Отправить</button>
    </form>
  `;
  document.body.append(launcher, panel);

  const messagesBox = panel.querySelector('.mai-messages');
  const form = panel.querySelector('.mai-form');
  const input = panel.querySelector('.mai-input');
  const send = panel.querySelector('.mai-send');

  function setVisible(visible) {
    state.open = visible;
    panel.classList.toggle('open', visible);
    launcher.textContent = visible ? '✦ MASTER AI' : '✦ MASTER AI';
    if (visible) input.focus();
  }

  function addMessage(role, content) {
    const empty = messagesBox.querySelector('.mai-empty');
    if (empty) empty.remove();
    const node = document.createElement('div');
    node.className = 'mai-msg ' + (role === 'user' ? 'user' : 'assistant');
    node.textContent = content;
    messagesBox.appendChild(node);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function setBusy(busy) {
    state.busy = busy;
    send.disabled = busy;
    input.disabled = busy;
    send.textContent = busy ? '…' : 'Отправить';
  }

  async function submitMessage(raw) {
    const content = String(raw || '').trim();
    if (!content || state.busy) return;
    if (!window.__crmAuthenticated || !window.crmDb) {
      addMessage('assistant', 'Сначала войдите в CRM, затем откройте помощника.');
      return;
    }

    addMessage('user', content);
    state.messages.push({ role: 'user', content });
    input.value = '';
    setBusy(true);
    const pending = document.createElement('div');
    pending.className = 'mai-msg assistant';
    pending.textContent = 'Думаю…';
    messagesBox.appendChild(pending);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      const db = window.crmDb;
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      const token = data?.session?.access_token;
      if (!token) throw new Error('Сессия CRM истекла. Войдите заново.');

      const response = await fetch(db.supabaseUrl + '/functions/v1/master-ai', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': db.supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'chat', messages: state.messages.slice(-10) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Не удалось получить ответ AI.');
      if (typeof payload.reply !== 'string' || !payload.reply.trim()) throw new Error('AI вернул пустой ответ.');

      pending.remove();
      state.messages.push({ role: 'assistant', content: payload.reply });
      state.messages = state.messages.slice(-10);
      addMessage('assistant', payload.reply);
    } catch (error) {
      pending.remove();
      addMessage('assistant', error?.message || 'Не удалось связаться с AI. Попробуйте позже.');
      state.messages.pop();
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  launcher.addEventListener('click', () => setVisible(!state.open));
  panel.querySelector('.mai-close').addEventListener('click', () => setVisible(false));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  panel.querySelectorAll('.mai-prompt').forEach((button) => {
    button.addEventListener('click', () => submitMessage(button.textContent));
  });

  function updateAuthVisibility() {
    const authenticated = !!window.__crmAuthenticated;
    launcher.style.display = authenticated ? 'block' : 'none';
    if (!authenticated) setVisible(false);
  }
  window.addEventListener('crm:authenticated', updateAuthVisibility);
  window.addEventListener('load', updateAuthVisibility, { once: true });
  updateAuthVisibility();
})();
