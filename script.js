// ─── STATE ───────────────────────────────────────────────
const AVATAR_COLORS = ['#e85d2f','#2f6be8','#8b2fe8','#22c55e','#f59e0b','#ec4899','#06b6d4','#ef4444'];
 
let state = {
  currentPage: 'landing',
  currentUser: null,
  currentContact: null,
  messages: {},   // { contactId: [{...}] }
  contacts: [],   // active conversations
  activeTab: 'all',
  profilePanelOpen: false,
};
 
// Seed database in localStorage
function initDB() {
  if (!localStorage.getItem('cw_users')) {
    const seed = [
      { id: 'u1', first: 'Alice', last: 'Martin', username: 'alice', email: 'alice@example.com', password: 'alice123', color: '#2f6be8', bio: 'Designer & coffee lover ☕', status: 'online' },
      { id: 'u2', first: 'Bob', last: 'Chen', username: 'bobchen', email: 'bob@example.com', password: 'bob123', color: '#8b2fe8', bio: 'Frontend dev & gamer 🎮', status: 'online' },
      { id: 'u3', first: 'Sara', last: 'Lee', username: 'saralee', email: 'sara@example.com', password: 'sara123', color: '#22c55e', bio: 'Travel 🌍 & photography 📷', status: 'away' },
      { id: 'u4', first: 'Mike', last: 'J', username: 'mikej', email: 'mike@example.com', password: 'mike123', color: '#f59e0b', bio: 'Music producer 🎵', status: 'offline' },
    ];
    localStorage.setItem('cw_users', JSON.stringify(seed));
  }
  if (!localStorage.getItem('cw_messages')) {
    const msgs = {
      'u1': [
        { id: 'm1', from: 'u1', text: "Hey! How's it going? 👋", time: '10:30 AM', date: 'Today' },
        { id: 'm2', from: 'ME', text: "All good! Working on a new project. You?", time: '10:31 AM', date: 'Today' },
        { id: 'm3', from: 'u1', text: "Same! Just finished a design for a client. ChatWave is amazing btw 😄", time: '10:32 AM', date: 'Today' },
      ],
      'u2': [
        { id: 'm4', from: 'u2', text: "Yo! Did you see the game last night?", time: 'Yesterday', date: 'Yesterday' },
        { id: 'm5', from: 'ME', text: "Missed it! Was it good?", time: 'Yesterday', date: 'Yesterday' },
      ],
      'u3': [
        { id: 'm6', from: 'u3', text: "Just got back from Bali! 🌴 So beautiful", time: 'Monday', date: 'Monday' },
      ],
    };
    localStorage.setItem('cw_messages', JSON.stringify(msgs));
  }
}
 
function getUsers() { return JSON.parse(localStorage.getItem('cw_users') || '[]'); }
function saveUsers(u) { localStorage.setItem('cw_users', JSON.stringify(u)); }
function getMsgs() { return JSON.parse(localStorage.getItem('cw_messages') || '{}'); }
function saveMsgs(m) { localStorage.setItem('cw_messages', JSON.stringify(m)); }
 
// ─── PAGES ────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  state.currentPage = id;
  if (id === 'chat') initChat();
}
 
// ─── AUTH ──────────────────────────────────────────────────
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
 
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === pw);
  if (!user) { errEl.style.display = 'block'; return; }
 
  state.currentUser = user;
  localStorage.setItem('cw_session', user.id);
  showPage('chat');
}
 
function doRegister() {
  const first = document.getElementById('reg-first').value.trim();
  const last = document.getElementById('reg-last').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pw = document.getElementById('reg-pw').value;
  const errEl = document.getElementById('reg-error');
  errEl.style.display = 'none';
 
  if (!first || !last || !username || !email || !pw) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.style.display = 'block'; return;
  }
  if (pw.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block'; return;
  }
 
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    errEl.textContent = 'Email already registered.';
    errEl.style.display = 'block'; return;
  }
  if (users.find(u => u.username === username)) {
    errEl.textContent = 'Username already taken.';
    errEl.style.display = 'block'; return;
  }
 
  const newUser = {
    id: 'u' + Date.now(),
    first, last, username, email, password: pw,
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    bio: '', status: 'online'
  };
  users.push(newUser);
  saveUsers(users);
  state.currentUser = newUser;
  localStorage.setItem('cw_session', newUser.id);
  showPage('chat');
  toast('🎉 Welcome to ChatWave, ' + first + '!');
}
 
// ─── CHAT INIT ─────────────────────────────────────────────
function initChat() {
  const cu = state.currentUser;
  if (!cu) return;
 
  // Sidebar self
  const sAvatar = document.getElementById('my-sidebar-avatar');
  sAvatar.textContent = cu.first[0].toUpperCase();
  sAvatar.style.background = cu.color;
  document.getElementById('my-sidebar-name').textContent = cu.first + ' ' + cu.last;
 
  renderContactList();
}
 
function renderContactList() {
  const cu = state.currentUser;
  const users = getUsers().filter(u => u.id !== cu.id);
  const msgs = getMsgs();
  const search = document.getElementById('contact-search').value.toLowerCase();
 
  const list = document.getElementById('contact-list');
  list.innerHTML = '';
 
  const filtered = users.filter(u => {
    const name = (u.first + ' ' + u.last + ' ' + u.username).toLowerCase();
    const matchSearch = !search || name.includes(search);
    const matchTab = state.activeTab === 'all' ||
      (state.activeTab === 'online' && u.status === 'online') ||
      (state.activeTab === 'groups' && false);
    return matchSearch && matchTab;
  });
 
  filtered.forEach(u => {
    const convo = msgs[u.id] || [];
    const last = convo[convo.length - 1];
    const unread = convo.filter(m => m.from !== 'ME' && !m.read).length;
 
    const item = document.createElement('div');
    item.className = 'contact-item' + (state.currentContact?.id === u.id ? ' active' : '');
    item.onclick = () => openConversation(u);
    item.innerHTML = `
      <div class="avatar">
        <div class="avatar-img" style="background:${u.color}">${u.first[0]}</div>
        <div class="status-dot ${u.status === 'online' ? '' : u.status}"></div>
      </div>
      <div class="contact-info">
        <div class="contact-name">${u.first} ${u.last}</div>
        <div class="contact-preview">${last ? (last.from === 'ME' ? 'You: ' : '') + last.text : 'No messages yet'}</div>
      </div>
      <div class="contact-meta">
        <div class="contact-time">${last ? last.time : ''}</div>
        ${unread ? `<div class="unread-badge">${unread}</div>` : ''}
      </div>`;
    list.appendChild(item);
  });
}
 
function filterContacts(v) { renderContactList(); }
 
function setTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.activeTab = tab;
  renderContactList();
}
 
// ─── CONVERSATION ─────────────────────────────────────────
function openConversation(user) {
  state.currentContact = user;
 
  // Mark read
  const msgs = getMsgs();
  (msgs[user.id] || []).forEach(m => m.read = true);
  saveMsgs(msgs);
 
  document.getElementById('chat-empty').style.display = 'none';
  const ac = document.getElementById('active-chat');
  ac.style.display = 'flex';
  ac.style.flexDirection = 'column';
 
  // Header
  document.getElementById('chat-avatar').textContent = user.first[0];
  document.getElementById('chat-avatar').style.background = user.color;
  document.getElementById('chat-name').textContent = user.first + ' ' + user.last;
  const statusDot = document.getElementById('chat-status-dot');
  const statusText = document.getElementById('chat-status-text');
  statusDot.className = 'status-dot' + (user.status !== 'online' ? ' ' + user.status : '');
  statusText.textContent = user.status === 'online' ? 'Active now' : user.status === 'away' ? 'Away' : 'Offline';
  statusText.style.color = user.status === 'online' ? 'var(--online)' : 'var(--muted)';
 
  // Profile panel
  document.getElementById('pp-avatar').textContent = user.first[0];
  document.getElementById('pp-avatar').style.background = user.color;
  document.getElementById('pp-name').textContent = user.first + ' ' + user.last;
  document.getElementById('pp-status').textContent = user.status === 'online' ? '🟢 Active now' : user.status === 'away' ? '🟡 Away' : '⚫ Offline';
  document.getElementById('pp-email').textContent = user.email;
  document.getElementById('pp-username').textContent = '@' + user.username;
  document.getElementById('pp-bio').textContent = user.bio || 'No bio yet.';
 
  renderMessages(user.id);
  renderContactList();
}
 
function renderMessages(contactId) {
  const msgs = getMsgs();
  const convo = msgs[contactId] || [];
  const area = document.getElementById('messages-area');
  area.innerHTML = '';
 
  if (convo.length === 0) {
    area.innerHTML = `<div class="no-messages"><div class="icon">👋</div><p>Say hello! This is the beginning of your conversation.</p></div>`;
    return;
  }
 
  let lastDate = null;
 
  convo.forEach((msg, i) => {
    const isMe = msg.from === 'ME';
 
    if (msg.date && msg.date !== lastDate) {
      const div = document.createElement('div');
      div.className = 'date-divider';
      div.textContent = msg.date;
      area.appendChild(div);
      lastDate = msg.date;
    }
 
    const group = document.createElement('div');
    group.className = 'msg-group ' + (isMe ? 'mine' : 'theirs');
 
    const row = document.createElement('div');
    row.className = 'msg-row';
 
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = msg.text;
 
    row.appendChild(bubble);
    group.appendChild(row);
 
    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = msg.time;
    group.appendChild(time);
 
    area.appendChild(group);
  });
 
  area.scrollTop = area.scrollHeight;
}
 
let typingTimer;
function showTyping() {
  // Simulate other user typing back after send
}
 
function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text || !state.currentContact) return;
 
  const msgs = getMsgs();
  const cid = state.currentContact.id;
  if (!msgs[cid]) msgs[cid] = [];
 
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
 
  msgs[cid].push({ id: 'm' + Date.now(), from: 'ME', text, time: timeStr, date: 'Today', read: true });
  saveMsgs(msgs);
 
  input.value = '';
  input.style.height = 'auto';
  renderMessages(cid);
  renderContactList();
 
  // Simulate reply after delay
  const contact = state.currentContact;
  const replies = [
    "That's awesome! 🎉",
    "Haha, totally agree!",
    "Nice one 😄",
    "Sounds good!",
    "Tell me more about that",
    "👍",
    "Interesting!",
    "Hmmm, let me think about that...",
    "100%!",
    "You're right 🙌"
  ];
 
  setTimeout(() => {
    const m = getMsgs();
    if (!m[cid]) return;
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const t = new Date();
    const ts = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
    m[cid].push({ id: 'm' + Date.now(), from: contact.id, text: reply, time: ts, date: 'Today', read: false });
    saveMsgs(m);
    if (state.currentContact?.id === contact.id) renderMessages(cid);
    renderContactList();
    document.getElementById('typing-indicator').innerHTML = '';
  }, 1200 + Math.random() * 800);
 
  // Typing indicator
  document.getElementById('typing-indicator').innerHTML = `
    <span>${contact.first} is typing</span>
    <span class="typing-dots"><span></span><span></span><span></span></span>`;
}
 
function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
 
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
 
function insertEmoji() {
  const emojis = ['😊','😂','❤️','👍','🎉','🔥','✨','😍','🙌','💯','😎','🤔'];
  const e = emojis[Math.floor(Math.random() * emojis.length)];
  const input = document.getElementById('msg-input');
  input.value += e;
  input.focus();
}
 
// ─── PROFILE MODAL ────────────────────────────────────────
const COLORS = ['#e85d2f','#2f6be8','#8b2fe8','#22c55e','#f59e0b','#ec4899','#06b6d4','#ef4444'];
let editColor = '';
 
function openProfileModal() {
  const cu = state.currentUser;
  editColor = cu.color;
  document.getElementById('edit-first').value = cu.first;
  document.getElementById('edit-last').value = cu.last;
  document.getElementById('edit-username').value = cu.username;
  document.getElementById('edit-email').value = cu.email;
  document.getElementById('edit-bio').value = cu.bio || '';
  document.getElementById('edit-pw').value = '';
 
  const av = document.getElementById('edit-avatar');
  document.getElementById('edit-avatar-letter').textContent = cu.first[0].toUpperCase();
  av.style.background = cu.color;
 
  // Color swatches
  const row = document.getElementById('color-picker-row');
  row.innerHTML = '';
  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === cu.color ? ' selected' : '');
    sw.style.background = c;
    sw.onclick = () => {
      editColor = c;
      av.style.background = c;
      row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    };
    row.appendChild(sw);
  });
 
  document.getElementById('profile-modal').classList.add('open');
}
 
function saveProfile() {
  const cu = state.currentUser;
  const first = document.getElementById('edit-first').value.trim();
  const last = document.getElementById('edit-last').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const pw = document.getElementById('edit-pw').value;
 
  if (!first || !last || !username || !email) { toast('⚠️ Please fill all required fields.'); return; }
 
  const users = getUsers();
  const idx = users.findIndex(u => u.id === cu.id);
  users[idx].first = first;
  users[idx].last = last;
  users[idx].username = username;
  users[idx].email = email;
  users[idx].bio = bio;
  users[idx].color = editColor;
  if (pw && pw.length >= 6) users[idx].password = pw;
 
  saveUsers(users);
  state.currentUser = users[idx];
 
  // Update UI
  const sAvatar = document.getElementById('my-sidebar-avatar');
  sAvatar.textContent = first[0].toUpperCase();
  sAvatar.style.background = editColor;
  document.getElementById('my-sidebar-name').textContent = first + ' ' + last;
 
  closeModal('profile-modal');
  renderContactList();
  toast('✅ Profile updated!');
}
 
// ─── NEW CHAT MODAL ────────────────────────────────────────
function openNewChatModal() {
  document.getElementById('user-search-input').value = '';
  searchUsers('');
  document.getElementById('new-chat-modal').classList.add('open');
}
 
function searchUsers(q) {
  const cu = state.currentUser;
  const users = getUsers().filter(u => u.id !== cu.id);
  const list = document.getElementById('user-search-list');
  list.innerHTML = '';
 
  const filtered = q
    ? users.filter(u => (u.first + ' ' + u.last + ' ' + u.username).toLowerCase().includes(q.toLowerCase()))
    : users;
 
  filtered.forEach(u => {
    const item = document.createElement('div');
    item.className = 'user-search-item';
    item.innerHTML = `
      <div class="avatar avatar-sm">
        <div class="avatar-img" style="background:${u.color}">${u.first[0]}</div>
        <div class="status-dot ${u.status !== 'online' ? u.status : ''}"></div>
      </div>
      <div>
        <div style="font-weight:600;font-size:0.9rem">${u.first} ${u.last}</div>
        <div style="font-size:0.78rem;color:var(--muted)">@${u.username}</div>
      </div>`;
    item.onclick = () => {
      closeModal('new-chat-modal');
      openConversation(u);
    };
    list.appendChild(item);
  });
 
  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:0.875rem">No users found</div>';
  }
}
 
// ─── PROFILE PANEL ────────────────────────────────────────
function toggleProfilePanel() {
  const panel = document.getElementById('profile-panel');
  state.profilePanelOpen = !state.profilePanelOpen;
  panel.classList.toggle('open', state.profilePanelOpen);
}
 
// ─── MODALS ────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
 
// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
 
// ─── TOAST ────────────────────────────────────────────────
function toast(msg, duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }, duration);
}
 
// ─── KEYBOARD ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
 
// ─── LOGIN ENTER KEY ──────────────────────────────────────
['login-email','login-pw'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});
 
// ─── INIT ─────────────────────────────────────────────────
initDB();
 
// Auto-login from session
const session = localStorage.getItem('cw_session');
if (session) {
  const users = getUsers();
  const u = users.find(x => x.id === session);
  if (u) { state.currentUser = u; showPage('chat'); }
}
