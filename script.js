// script.js
document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Elements ---------- */
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  const quoteBoxMain = document.getElementById('quoteBoxMain');
  const refreshQuoteBtn = document.getElementById('refreshQuote');

  const nameModal = document.getElementById('nameModal');
  const userNameInput = document.getElementById('userNameInput');
  const submitNameBtn = document.getElementById('submitNameBtn');

  const quizBtn = document.getElementById('quizBtn');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModalBtn = modal ? modal.querySelector('.closeModal') : null;

  const certificateLink = document.getElementById('certificateLink');
  const certificateBtn = certificateLink ? certificateLink.querySelector('button') : null;

  const toastEl = document.getElementById('toast');
  const anthem = document.getElementById('anthem');

  /* ---------- State ---------- */
  const TARGET_MS = new Date('August 15, 2025 00:00:00').getTime();
  const QUOTES = [
    "Freedom is the oxygen of the soul. — Moshe Dayan",
    "Jai Hind! The tricolor reminds us of freedom, sacrifice, and unity.",
    "Let us remember the golden heritage of our country and feel proud to be a part of India.",
    "In the spirit of freedom and patriotism, we celebrate Independence Day.",
    "Unity in diversity is our strength. Happy Independence Day!"
  ];

  const QUIZ_POOL = [
    { q: "When is Independence Day celebrated in India?", opts: ["15 August", "26 January", "2 October", "1 May"], a: 0 },
    { q: "What is the color of the Indian flag's middle stripe?", opts: ["Saffron", "White", "Green", "Blue"], a: 1 },
    { q: "Who was the first Prime Minister of India?", opts: ["Jawaharlal Nehru", "Mahatma Gandhi", "Sardar Patel", "Indira Gandhi"], a: 0 },
    { q: "What does the Ashoka Chakra represent?", opts: ["Progress", "Peace", "Courage", "Justice"], a: 0 }
  ];

  // IMPORTANT: quizPassed is session-only. We DO NOT persist it in localStorage.
  let shuffledQuiz = [];
  let quizIndex = 0;
  let quizPassed = false;       // <-- always start false on each page load
  let userName = (localStorage.getItem('userName') || '').trim();
  let pendingOpenCertificate = false;

  let countdownInterval = null;
  let toastTimeout = null;

  /* ---------- Helpers ---------- */
  function showToast(msg, ms = 2200) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.add('hidden');
      toastTimeout = null;
    }, ms);
  }

  function findQuoteTextNode(container) {
    if (!container) return null;
    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) return node;
    }
    return null;
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /* ---------- Countdown ---------- */
  function updateCountdownOnce() {
    const now = Date.now();
    const diff = TARGET_MS - now;
    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  function startCountdown() {
    updateCountdownOnce();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdownOnce, 1000);
  }

  /* ---------- Quote ---------- */
  function refreshQuote() {
    const node = findQuoteTextNode(quoteBoxMain);
    if (!node) return;
    let newQ;
    do { newQ = QUOTES[Math.floor(Math.random() * QUOTES.length)]; } while (newQ === node.nodeValue.trim().replace(/^"|"$/g, ''));
    node.nodeValue = ` "${newQ}" `;
  }

  /* ---------- Name Modal ---------- */
  function openNameModal(prefill = '') {
    if (!nameModal) return;
    nameModal.classList.remove('hidden');
    if (userNameInput) {
      userNameInput.value = prefill || '';
      submitNameBtn.disabled = !(userNameInput.value.trim());
      setTimeout(() => userNameInput.focus(), 50);
    }
  }
  function closeNameModal() {
    if (!nameModal) return;
    nameModal.classList.add('hidden');
  }
  function saveUserName(name) {
    userName = (name || '').trim();
    if (userName) localStorage.setItem('userName', userName);
  }

  /* ---------- Certificate control (always disabled until quizPassed this session) ---------- */
  function updateCertificateState() {
    const canEnable = quizPassed && userName;
    if (certificateLink) {
      if (canEnable) {
        certificateLink.removeAttribute('aria-disabled');
        certificateLink.removeAttribute('tabindex');
      } else {
        certificateLink.setAttribute('aria-disabled', 'true');
        certificateLink.setAttribute('tabindex', '-1');
      }
    }
    if (certificateBtn) {
      if (canEnable) certificateBtn.removeAttribute('disabled');
      else certificateBtn.setAttribute('disabled', 'true');
    }
  }

  /* ---------- Quiz (random order, non-repeating until exhausted) ---------- */
  function prepareQuiz() {
    shuffledQuiz = shuffleArray(QUIZ_POOL);
    quizIndex = 0;
    quizPassed = false; // ensure session starts not passed
    updateCertificateState();
  }

  function openQuizModal() {
    if (!modal || !modalBody) return;
    modal.classList.remove('hidden');
    // if quiz just prepared, start at first
    if (!shuffledQuiz.length) prepareQuiz();
    renderCurrentQuizQuestion();
  }

  function closeQuizModal() {
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function renderCurrentQuizQuestion() {
    if (!modalBody) return;
    modalBody.innerHTML = '';

    const qObj = shuffledQuiz[quizIndex];
    if (!qObj) {
      modalBody.textContent = 'No questions available.';
      return;
    }

    const qElem = document.createElement('p');
    qElem.textContent = `Q${quizIndex + 1}. ${qObj.q}`;
    qElem.style.fontWeight = '700';
    modalBody.appendChild(qElem);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'quiz-options-wrap';
    qObj.opts.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.margin = '10px 0';
      btn.style.padding = '10px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid #FF9933';
      btn.style.background = '#fff';
      btn.style.color = '#138808';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => handleQuizAnswer(idx));
      optionsWrap.appendChild(btn);
    });
    modalBody.appendChild(optionsWrap);

    const note = document.createElement('p');
    note.textContent = `Question ${quizIndex + 1} of ${shuffledQuiz.length}`;
    note.style.fontSize = '0.9rem';
    note.style.marginTop = '8px';
    modalBody.appendChild(note);
  }

  function handleQuizAnswer(selectedIdx) {
    const qObj = shuffledQuiz[quizIndex];
    if (!qObj) return;
    if (selectedIdx === qObj.a) {
      // correct => advance
      quizIndex++;
      showToast('Correct ✅');
      if (quizIndex < shuffledQuiz.length) {
        setTimeout(renderCurrentQuizQuestion, 450);
      } else {
        // user answered all questions correctly in this session
        quizPassed = true;
        showToast('All questions correct! Certificate unlocked 🎉', 2500);
        updateCertificateState();
        setTimeout(closeQuizModal, 700);
      }
    } else {
      // incorrect => allow retry (do NOT advance)
      showToast('Wrong answer ❌ Try again.');
    }
  }

  /* ---------- Certificate click ---------- */
  function onCertificateClick(e) {
    e.preventDefault();
    if (!quizPassed) {
      showToast('Please complete the quiz to unlock certificate.');
      return;
    }
    if (userName) {
      const url = `Certificate.html?name=${encodeURIComponent(userName)}`;
      window.open(url, '_blank');
      return;
    }
    pendingOpenCertificate = true;
    openNameModal();
  }

  /* ---------- Name submit ---------- */
  function onSubmitName() {
    const val = (userNameInput && userNameInput.value || '').trim();
    if (!val) { showToast('Please enter your name.'); return; }
    saveUserName(val);
    showToast(`Welcome, ${val}!`);
    closeNameModal();
    updateCertificateState();
    if (pendingOpenCertificate) {
      pendingOpenCertificate = false;
      const url = `Certificate.html?name=${encodeURIComponent(userName)}`;
      window.open(url, '_blank');
    }
  }

  /* ---------- Audio / fireworks ---------- */
  function attemptPlayAnthem() {
    if (!anthem) return;
    anthem.play().catch(() => {
      console.warn('Autoplay blocked — user interaction needed.');
    });
  }
  function tryStartFireworks() {
    if (typeof startFireworks === 'function') {
      try { startFireworks(); } catch (err) { console.warn('startFireworks error', err); }
    }
  }

  /* ---------- Init ---------- */
  function init() {
    // prepare quiz (shuffled)
    prepareQuiz();

    // events
    if (refreshQuoteBtn) refreshQuoteBtn.addEventListener('click', refreshQuote);
    if (quizBtn) quizBtn.addEventListener('click', () => {
      if (!userName) { showToast('Please enter your name first.'); openNameModal(); return; }
      openQuizModal();
    });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeQuizModal);
    if (certificateLink) certificateLink.addEventListener('click', onCertificateClick);

    if (submitNameBtn) {
      submitNameBtn.addEventListener('click', onSubmitName);
      if (userNameInput) userNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !submitNameBtn.disabled) onSubmitName();
      });
    }
    if (userNameInput) userNameInput.addEventListener('input', () => {
      const ok = userNameInput.value.trim().length > 0;
      submitNameBtn.disabled = !ok;
    });

    // ensure certificate disabled at start of each load
    quizPassed = false;
    updateCertificateState();

    // show name modal if no saved name
    if (!userName) openNameModal();

    attemptPlayAnthem();
    tryStartFireworks();
    startCountdown();
  }

  init();
});
