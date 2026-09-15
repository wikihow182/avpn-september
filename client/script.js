// ============================================================
// DOM ELEMENTS
// ============================================================
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const minimizeBtn = document.getElementById('minimize-btn');

// Floating Widget Triggers
const chatFabToggle = document.getElementById('chat-fab-toggle');
const chatWidgetWindow = document.getElementById('chat-widget-window');
const navChatBtn = document.getElementById('nav-chat-btn');
const ctaOpenChat = document.getElementById('cta-open-chat');

// Hero Interactive Elements
const heroQuickInput = document.getElementById('hero-quick-input');
const heroSearchBtn = document.getElementById('hero-search-btn');
const quickChips = document.querySelectorAll('.quick-chip, .chip-item');
const categoryCards = document.querySelectorAll('.category-card');

// ============================================================
// CONFIG & STATE
// ============================================================
const API_URL = 'http://localhost:3000/api/chat';
const STORAGE_KEY = 'kawankuliner_chat_history';

// In-memory conversation state: [{ role: 'user', text: '...' }, { role: 'model', text: '...' }]
let conversation = [];

// Configure Marked options
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}

// ============================================================
// WIDGET TOGGLE CONTROLS
// ============================================================
function openChatWidget() {
  chatWidgetWindow.classList.add('is-open');
  chatFabToggle.classList.add('is-active');
  chatWidgetWindow.setAttribute('aria-hidden', 'false');
  setTimeout(() => input.focus(), 150);
}

function closeChatWidget() {
  chatWidgetWindow.classList.remove('is-open');
  chatFabToggle.classList.remove('is-active');
  chatWidgetWindow.setAttribute('aria-hidden', 'true');
}

function toggleChatWidget() {
  if (chatWidgetWindow.classList.contains('is-open')) {
    closeChatWidget();
  } else {
    openChatWidget();
  }
}

if (chatFabToggle) chatFabToggle.addEventListener('click', toggleChatWidget);
if (minimizeBtn) minimizeBtn.addEventListener('click', closeChatWidget);
if (navChatBtn) navChatBtn.addEventListener('click', openChatWidget);
if (ctaOpenChat) ctaOpenChat.addEventListener('click', openChatWidget);

// ============================================================
// CHAT INITIALIZATION & LOCALSTORAGE
// ============================================================
function initChat() {
  const savedHistory = localStorage.getItem(STORAGE_KEY);
  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory);
      if (Array.isArray(parsed) && parsed.length > 0) {
        conversation = parsed;
        conversation.forEach((msg) => {
          appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.text);
        });
        return;
      }
    } catch (e) {
      console.error('Failed to parse chat history from localStorage:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Welcome greeting
  const welcomeGreeting = 'Halo! Saya **KawanKuliner**, asisten rekomendasi kuliner Denah Rasa. 🍜☕\n\nAda tempat makan, kafe aesthetic, warung legendaris, atau makanan khas daerah mana yang ingin kamu tanyakan hari ini?';
  appendMessage('bot', welcomeGreeting);
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
  } catch (e) {
    console.error('Failed to save chat to localStorage:', e);
  }
}

function clearChat() {
  if (conversation.length === 0) return;
  if (!confirm('Apakah Anda yakin ingin menghapus semua riwayat percakapan?')) return;

  conversation = [];
  localStorage.removeItem(STORAGE_KEY);
  chatBox.innerHTML = '';

  appendMessage('bot', 'Riwayat chat telah dibersihkan. Mau cari rekomendasi kuliner apa sekarang? 🍽️');
}

if (clearBtn) clearBtn.addEventListener('click', clearChat);

// ============================================================
// SEND MESSAGE HANDLER
// ============================================================
async function sendMessage(text) {
  const userMessage = (text || input.value).trim();
  if (!userMessage) return;

  // Render user message in UI
  appendMessage('user', userMessage);
  input.value = '';

  // Push to conversation history & persist
  conversation.push({ role: 'user', text: userMessage });
  saveToLocalStorage();

  // Show loading indicator & disable inputs
  const loadingElement = appendLoadingMessage();
  setInputDisabled(true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error (${response.status})`);
    }

    const data = await response.json();
    const botReply = data.result;

    // Remove loading & append bot response
    removeLoadingMessage(loadingElement);
    appendMessage('bot', botReply);

    // Save model response to history
    conversation.push({ role: 'model', text: botReply });
    saveToLocalStorage();
  } catch (error) {
    console.error('Error in chat API integration:', error);
    removeLoadingMessage(loadingElement);
    appendMessage('bot error', `Maaf, terjadi kesalahan: ${error.message}`);

    // Rollback failed turn
    conversation.pop();
    saveToLocalStorage();
  } finally {
    setInputDisabled(false);
    input.focus();
  }
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  sendMessage();
});

// ============================================================
// HERO & INTERACTIVE TRIGGERS
// ============================================================

// Hero Quick Ask Bar
function handleHeroSearch() {
  const query = heroQuickInput.value.trim();
  if (!query) return;

  openChatWidget();
  sendMessage(query);
  heroQuickInput.value = '';
}

if (heroSearchBtn) heroSearchBtn.addEventListener('click', handleHeroSearch);
if (heroQuickInput) {
  heroQuickInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleHeroSearch();
    }
  });
}

// Quick Chips click handler
quickChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const query = chip.getAttribute('data-query');
    if (query) {
      openChatWidget();
      sendMessage(query);
    }
  });
});

// Category cards click handler
categoryCards.forEach((card) => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    if (prompt) {
      openChatWidget();
      sendMessage(prompt);
    }
  });
});

// ============================================================
// UI RENDER HELPERS
// ============================================================
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  const senderClasses = sender.split(' ');
  msg.classList.add('message', ...senderClasses);

  if (senderClasses.includes('bot') && !senderClasses.includes('loading') && typeof marked !== 'undefined') {
    try {
      const rawHtml = marked.parse(text);
      const cleanHtml = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
      msg.innerHTML = cleanHtml;

      const links = msg.querySelectorAll('a');
      links.forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
    } catch (e) {
      console.error('Error parsing markdown:', e);
      msg.textContent = text;
    }
  } else {
    msg.textContent = text;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function appendLoadingMessage() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot', 'loading');
  msg.textContent = 'KawanKuliner sedang mencari rekomendasi... 🔍';
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function removeLoadingMessage(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function setInputDisabled(disabled) {
  input.disabled = disabled;
  if (sendBtn) sendBtn.disabled = disabled;
}

// ============================================================
// INITIALIZE ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', initChat);
