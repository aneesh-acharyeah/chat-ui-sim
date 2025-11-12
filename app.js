// Chat UI Simulation - app.js
// Features: multiple conversations, localStorage history, simulated bot replies, typing indicator, attach image preview, export conversation

// ===== Helpers =====
const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
const el = (tag, attrs = {}, children = []) => {
  const d = document.createElement(tag);
  for (const k in attrs) {
    if (k.startsWith("on") && typeof attrs[k] === "function") d.addEventListener(k.slice(2), attrs[k]);
    else if (k === "html") d.innerHTML = attrs[k];
    else d.setAttribute(k, attrs[k]);
  }
  children.forEach(c => d.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return d;
};
const fmtTime = (ts = Date.now()) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

// ===== App state =====
const STORAGE_KEY = "chat_ui_sim_convos_v1";
let store = {
  convos: [], // {id, title, avatar, messages: [{id, who:'me'|'bot', text, ts, status, imgUrl?}]}
  activeId: null
};

// ===== UI nodes =====
const nodes = {
  convoList: qs("#convoList"),
  newConvBtn: qs("#newConvBtn"),
  chatTitle: qs("#chatTitle"),
  chatSubtitle: qs("#chatSubtitle"),
  chatAvatar: qs("#chatAvatar"),
  messages: qs("#messages"),
  composer: qs("#composer"),
  input: qs("#input"),
  sendBtn: qs("#sendBtn"),
  clearBtn: qs("#clearBtn"),
  exportBtn: qs("#exportBtn"),
  attachBtn: qs("#attachBtn"),
  fileInput: qs("#fileInput"),
  messagesWrap: qs("#messagesWrap")
};

// ===== Utilities =====
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function load(){ const s = localStorage.getItem(STORAGE_KEY); if (s) store = JSON.parse(s); else resetDemo(); }
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }

// Create demo convo if none
function resetDemo(){
  store = {
    convos: [{
      id: uid("c"), title: "Welcome Bot", avatar: "🤖",
      messages: [
        { id: uid("m"), who: "bot", text: "Hey! I am Chatter — a simulated bot. Say hi 👋", ts: Date.now()-1000*60*60, status: "read" }
      ]
    }],
    activeId: null
  };
  save();
}

// ===== Conversation helpers =====
function getActiveConvo(){ return store.convos.find(c => c.id === store.activeId) || null; }
function addConvo(title = "New chat", avatar = "💬"){
  const conv = { id: uid("c"), title, avatar, messages: [] };
  store.convos.unshift(conv);
  store.activeId = conv.id;
  save();
  renderSidebar(); renderChat();
}
function deleteConvo(id){
  store.convos = store.convos.filter(c => c.id !== id);
  if (store.activeId === id) store.activeId = store.convos.length ? store.convos[0].id : null;
  save();
  renderSidebar(); renderChat();
}
function addMessage(convoId, msg){
  const conv = store.convos.find(c => c.id === convoId);
  if (!conv) return;
  conv.messages.push(msg);
  save();
}

// ===== Rendering =====
function renderSidebar(){
  nodes.convoList.innerHTML = "";
  store.convos.forEach(conv => {
    const last = conv.messages[conv.messages.length - 1];
    const text = last ? (last.who === "me" ? "You: " + last.text : last.text) : "No messages";
    const item = el("div", { class: "conv " + (conv.id === store.activeId ? "active" : ""), role: "listitem", tabindex:0 });
    item.appendChild(el("div", { class: "c-avatar" }, [ document.createTextNode(conv.avatar) ]));
    const body = el("div", { class: "c-body" });
    body.appendChild(el("div", { class: "c-title" }, [ document.createTextNode(conv.title) ]));
    body.appendChild(el("div", { class: "c-sub" }, [ document.createTextNode(text) ]));
    item.appendChild(body);
    item.addEventListener("click", () => { store.activeId = conv.id; save(); renderSidebar(); renderChat(); });
    item.addEventListener("keydown", (e) => { if (e.key === "Enter") { item.click(); } });
    nodes.convoList.appendChild(item);
  });
}

function renderChat(){
  const conv = getActiveConvo();
  if (!conv){
    // empty state
    nodes.chatTitle.textContent = "No conversation";
    nodes.chatSubtitle.textContent = "Create a new chat to start";
    nodes.chatAvatar.textContent = "💬";
    nodes.messages.innerHTML = `<div class="subtle" style="text-align:center;padding:40px">No conversation selected — click <strong>New Chat</strong></div>`;
    return;
  }

  nodes.chatTitle.textContent = conv.title;
  nodes.chatSubtitle.textContent = `${conv.messages.length} message(s)`;
  nodes.chatAvatar.textContent = conv.avatar;

  // Clear message list
  nodes.messages.innerHTML = "";

  conv.messages.forEach(m => {
    nodes.messages.appendChild(renderMessage(m));
  });

  // scroll to bottom
  requestAnimationFrame(() => nodes.messagesWrap.scrollTop = nodes.messagesWrap.scrollHeight);
}

function renderMessage(m){
  const wrapper = el("div", { class: "msg " + (m.who === "me" ? "me" : "you") });
  const avatar = el("div", { class: "avatar-sm" }, [ document.createTextNode(m.who === "me" ? "🧑" : "🤖") ]);
  const bubble = el("div", { class: "bubble" });

  if (m.imgUrl){
    const img = el("img", { src: m.imgUrl, style: "max-width:320px;border-radius:10px;display:block;margin-bottom:8px" });
    bubble.appendChild(img);
  }

  bubble.appendChild(el("div", { html: escapeHtml(m.text) }));

  // meta row
  const meta = el("div", { class: "meta" });
  meta.appendChild(el("span", { class: "timestamp" }, [ document.createTextNode(fmtTime(m.ts)) ]));
  const statusDot = el("span", { class: "status-dot " + (m.status || "sent") });
  meta.appendChild(statusDot);

  bubble.appendChild(meta);

  if (m.who === "me"){
    wrapper.appendChild(bubble);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
  }

  return wrapper;
}

// ===== Simulated bot logic =====
function botReplyFor(text){
  // simple canned replies — keep it short & varied
  const lower = (text || "").toLowerCase();
  if (!text) return "Huh?";
  if (lower.includes("hello") || lower.includes("hi")) return "Hello! How can I help you today?";
  if (lower.includes("time")) return `It's ${fmtTime()}.`;
  if (lower.includes("joke")) return "Why do programmers prefer dark mode? Because light attracts bugs. 🐛";
  if (lower.includes("weather")) return "Sun is shining in this demo world ☀️ — pretend it's warm!";
  if (lower.includes("help")) return "Try: 'Tell me a joke', 'What is the time', or 'Export chat'.";
  // fallback: echo & small variation
  return "You said: " + text + ". That's interesting!";
}

// Simulate typing + reply
function simulateBotReply(convoId, promptText){
  const conv = store.convos.find(c => c.id === convoId);
  if (!conv) return;
  // Add typing indicator message (bot placeholder)
  const typingId = uid("m");
  const typingMsg = { id: typingId, who: "bot", text: "", ts: Date.now(), status: "sending", __typing: true };
  conv.messages.push(typingMsg);
  save();
  renderChat();

  // determine typing duration
  const reply = botReplyFor(promptText);
  const words = reply.split(/\s+/).length;
  const typingMs = Math.min(1200 + words * 90, 3000);

  // animate typing (we'll replace placeholder)
  setTimeout(() => {
    // remove typing placeholder
    const idx = conv.messages.findIndex(m => m.id === typingId);
    if (idx >= 0) conv.messages.splice(idx, 1);

    // push actual bot reply
    const botMsg = { id: uid("m"), who: "bot", text: reply, ts: Date.now(), status: "read" };
    conv.messages.push(botMsg);
    save();
    renderChat();
  }, typingMs);
}

// ===== Composer & actions =====
function sendMessage(text, fileUrl = null){
  const conv = getActiveConvo();
  if (!conv) {
    addConvo("New Chat", "💬");
  }
  const target = getActiveConvo();
  const msg = { id: uid("m"), who: "me", text: text || "", ts: Date.now(), status: "sending" };
  if (fileUrl) msg.imgUrl = fileUrl;
  target.messages.push(msg);
  save();
  renderChat();

  // simulate sending then mark sent
  setTimeout(() => {
    msg.status = "sent";
    save();
    renderChat();

    // then simulate bot reply
    simulateBotReply(target.id, text);
  }, 250 + Math.random()*400);
}

// Escape HTML but keep simple emojis safe
function escapeHtml(s){
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// New conversation button
nodes.newConvBtn.addEventListener("click", () => {
  const title = prompt("Conversation title", "New Chat") || "New Chat";
  addConvo(title, ["🤖","💬","🦊","👩‍💻","🧠"][Math.floor(Math.random()*5)]);
  renderSidebar(); renderChat();
});

// send (form submit)
nodes.composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const txt = nodes.input.value.trim();
  if (!txt && nodes.fileInput.files.length === 0) return;
  const file = nodes.fileInput.files[0];
  if (file){
    // read file as data URL (image preview)
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage(txt, reader.result);
      nodes.fileInput.value = "";
    };
    reader.readAsDataURL(file);
  } else {
    sendMessage(txt, null);
  }
  nodes.input.value = "";
  autosizeTextarea(nodes.input);
});

// Enter to send, Shift+Enter newline
nodes.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    nodes.composer.requestSubmit();
  }
});

// attach button
nodes.attachBtn.addEventListener("click", () => nodes.fileInput.click());
nodes.fileInput.addEventListener("change", (e) => {
  // show filename briefly
  const f = e.target.files[0];
  if (f) {
    nodes.input.placeholder = `Attaching ${f.name} — press Send`;
  }
});

// clear conversation
nodes.clearBtn.addEventListener("click", () => {
  const conv = getActiveConvo();
  if (!conv) return;
  if (!confirm("Clear all messages in this conversation?")) return;
  conv.messages = [];
  save();
  renderChat();
});

// export conversation (CSV simple)
nodes.exportBtn.addEventListener("click", () => {
  const conv = getActiveConvo();
  if (!conv) return alert("No conversation to export");
  const rows = [["who","text","timestamp"]];
  conv.messages.forEach(m => rows.push([m.who, m.text.replace(/"/g,'""'), new Date(m.ts).toISOString()]));
  const blob = new Blob([rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${conv.title.replace(/\s+/g,'_')}_export.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
});

// autosize textarea
function autosizeTextarea(t){
  t.style.height = "auto";
  t.style.height = Math.min(160, t.scrollHeight) + "px";
}
nodes.input.addEventListener("input", () => autosizeTextarea(nodes.input));

// keyboard shortcuts (n = new, e = export)
document.addEventListener("keydown", (e) => {
  if (e.target.tagName.toLowerCase() === "textarea") return;
  if (e.key.toLowerCase() === "n") nodes.newConvBtn.click();
  if (e.key.toLowerCase() === "e") nodes.exportBtn.click();
});

// click message to copy text
nodes.messages.addEventListener("click", (e) => {
  const bubble = e.target.closest(".bubble");
  if (!bubble) return;
  const text = bubble.textContent.trim();
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => {
    // small feedback
    bubble.animate([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 220 });
  });
});

// scroll to load older messages (simple demo: none)
nodes.messagesWrap.addEventListener("scroll", () => {
  if (nodes.messagesWrap.scrollTop < 40) {
    // could load older messages (not implemented)
  }
});

// init
(function init(){
  load();
  if (!store.convos.length) resetDemo();
  if (!store.activeId) store.activeId = store.convos[0].id;
  renderSidebar();
  renderChat();
})();
