(function () {
  const history = [];

  const toggle = document.createElement('button');
  toggle.className = 'chat-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', '打開客服小助手');
  toggle.textContent = '💬';

  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.innerHTML =
    '<div class="chat-head">✨ 昱柔SPA 客服小助手</div>' +
    '<div class="chat-body" id="chat-body"></div>' +
    '<form class="chat-input-row" id="chat-form">' +
    '<input type="text" id="chat-input" placeholder="想問什麼呢？" maxlength="500" autocomplete="off">' +
    '<button type="submit" aria-label="送出">➤</button>' +
    '</form>';

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const body = panel.querySelector('#chat-body');
  const form = panel.querySelector('#chat-form');
  const input = panel.querySelector('#chat-input');

  function appendMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  let greeted = false;
  toggle.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !greeted) {
      greeted = true;
      appendMessage('bot', '你好！我是昱柔SPA的客服小助手,想了解服務項目、地址或預約方式都可以問我喔 🌿');
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';
    input.disabled = true;

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, history: history }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error(r.data.error || 'AI 客服暫時無法回應');
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: r.data.reply });
        appendMessage('bot', r.data.reply);
      })
      .catch(function (err) {
        appendMessage('bot', err.message || 'AI 客服暫時無法回應,請稍後再試。');
      })
      .finally(function () {
        input.disabled = false;
        input.focus();
      });
  });
})();
