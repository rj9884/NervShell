const output = document.getElementById('output');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const newChatBtn = document.getElementById('new-chat-btn');

showWelcome();
sendBtn.addEventListener('click', sendMessage);

input.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    await sendMessage();
  }
});

newChatBtn.addEventListener('click', async () => {
  try {
    await fetch('/clear', { method: 'POST' });
    output.innerHTML = '';
    showWelcome();
    input.focus();
  } catch (err) {
    addMessage('error', `Failed to clear history: ${err.message}`);
  }
});

clearBtn.addEventListener('click', async () => {
  try {
    await fetch('/clear', { method: 'POST' });
    output.innerHTML = '';
    showWelcome();
  } catch (err) {
    addMessage('error', `Failed to clear history: ${err.message}`);
  }
});

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  input.value = '';

  const welcome = output.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  addMessage('user', message);

  const loadingId = showLoading();

  try {
    const response = await fetch('/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    removeLoading(loadingId);

    if (!response.ok) {
      const error = await response.json();
      addMessage('error', `${error.error || 'Unknown error'}${error.details ? '\n' + error.details : ''}`);
      return;
    }

    const data = await response.json();

    displayResponse(data.response);

  } catch (err) {
    removeLoading(loadingId);
    addMessage('error', `Network error: ${err.message}`);
  }
}

function showWelcome() {
  output.innerHTML = `
    <div class="welcome-message">
      <h2>Welcome to NervShell</h2>
      <p>Your AI-powered shell assistant. Ask me to run commands, analyze files, or help with any task.</p>
    </div>
  `;
}

function addMessage(type, content) {
  const div = document.createElement('div');
  div.className = `message message-${type}`;

  const header = document.createElement('div');
  header.className = 'message-header';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';

  const author = document.createElement('span');
  author.className = 'message-author';

  switch (type) {
    case 'user':
      avatar.textContent = 'You';
      author.textContent = 'You';
      break;
    case 'ai':
      avatar.textContent = 'AI';
      author.textContent = 'NervShell';
      break;
    case 'tool':
      avatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
      author.textContent = 'Tool';
      break;
    case 'error':
      avatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
      author.textContent = 'Error';
      break;
  }

  header.appendChild(avatar);
  header.appendChild(author);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;

  div.appendChild(header);
  div.appendChild(contentDiv);
  output.appendChild(div);

  scrollToBottom();
}

function displayResponse(response) {
  if (response.includes('[Tool:')) {
    const parts = response.split(/(\[Tool: [^\]]+\] [A-Z]+)/);

    let currentText = '';

    for (const part of parts) {
      if (part.startsWith('[Tool:')) {
        if (currentText.trim()) {
          addMessage('ai', currentText.trim());
          currentText = '';
        }

        const toolMatch = part.match(/\[Tool: ([^\]]+)\] ([A-Z]+)/);
        if (toolMatch) {
          const toolName = toolMatch[1];
          const status = toolMatch[2];
          addMessage('tool', `${toolName} ${status}`);
        }
      } else {
        currentText += part;
      }
    }

    if (currentText.trim()) {
      addMessage('ai', currentText.trim());
    }
  } else {
    addMessage('ai', response);
  }
}

function showLoading() {
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'message loading-message';
  div.innerHTML = `
    <div class="loading-spinner"></div>
    <span>NervShell is thinking...</span>
  `;
  output.appendChild(div);
  scrollToBottom();
  return id;
}

function removeLoading(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  output.scrollTop = output.scrollHeight;
}

input.focus();
output.addEventListener('click', (e) => {
  if (e.target === output) {
    input.focus();
  }
});
