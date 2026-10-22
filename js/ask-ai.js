/* ================================================
   ASK MY AI — chat widget that answers questions
   about Vivek. Streams answers from the Worker in
   /ask-ai-worker (endpoint set via data-endpoint on
   this script tag). With no endpoint, or if the
   endpoint is unreachable, it falls back to instant
   answers from the FAQ below.
   ================================================ */
(function () {
  'use strict';

  var script   = document.currentScript;
  var STORE    = 'askai-chat-v1';
  var NUDGE    = 'askai-nudge-seen';
  var MAX_LEN  = 600;
  var GREETING = "Hi! I'm Vivek's AI assistant. Ask me anything about his experience, skills, projects or availability.";
  var SUGGESTIONS = [
    "What's Vivek's experience?",
    'Has he built CRM systems?',
    'What AI work has he done?',
    'Is he available for hire?',
    'Tell me about HRHub'
  ];

  /* ---------- instant answers (offline fallback) ---------- */
  var FAQ = [
    { k: /hrhub|\bhr\b|human resource/i,
      a: "**HRHub** is an HR management system Vivek built with **Next.js**, using Claude for AI-assisted development. It brings employees, visas, payroll trends, leave approvals and hiring into one dashboard. You can see it live at [hr.hrhub.ae](https://hr.hrhub.ae/)." },
    { k: /crm|real.?estate|propert|lead/i,
      a: "Yes. At **Property Matters** in Dubai (Mar 2025 – present) Vivek builds a real-estate CRM: lead management, property listings, client workflows, WhatsApp and email automation, REST APIs and role-based access control, using Laravel, Vue.js and MySQL. He also worked on **PropCRM**, a SaaS real-estate CRM." },
    { k: /\bai\b|claude|llm|gpt|chatbot|machine|automation|prompt/i,
      a: "Vivek is **Anthropic-certified** (Claude 101: Generative AI Fundamentals) and works with LLM API integration (Claude API), prompt engineering, AI chatbots and workflow automation. He used Claude for AI-assisted development on HRHub, and this assistant is built on the Claude API too." },
    { k: /hire|available|availability|freelance|contact|email|phone|whatsapp|reach|job|role|opportunit/i,
      a: "Vivek is **open to new opportunities** and freelance projects. The best ways to reach him:\n- Email: viveknair97k@gmail.com\n- The [contact form](#contact-section) on this page\n- His [CV](files/Vivek-Krishnan-CV.pdf)" },
    { k: /experience|work|compan|career|years|background|history/i,
      a: "Vivek has **4+ years** of experience:\n- **Full Stack Developer**, Property Matters, Dubai (Mar 2025 – present)\n- **Software Engineer**, Lean Transition Solution, Trivandrum (May 2023 – Jun 2024)\n- **Associate Software Engineer**, Spawoz Technologies, Kochi (Dec 2021 – Apr 2023)" },
    { k: /skill|stack|tech|laravel|vue|php|symfony|mysql|next|language|framework/i,
      a: "His core stack is **PHP, Laravel, Symfony, CodeIgniter, Vue.js and MySQL**, plus REST APIs, WhatsApp/email integrations, role-based access control, Git and CI/CD. He also builds with Next.js and integrates AI through the Claude API." },
    { k: /educat|degree|study|college|universit|certif/i,
      a: "Vivek holds a **B.Tech in Electronics and Communication Engineering** (Jawaharlal College of Engineering and Technology, 2014 – 2018), plus Anthropic's Claude 101 certification and an Advanced Embedded Systems certification." },
    { k: /where|location|based|dubai|uae|relocat/i,
      a: "Vivek is based in **Dubai, UAE**." },
    { k: /project|portfolio|built|work samples/i,
      a: "Highlights include **HRHub** (HR management, Next.js), **PropCRM** (real-estate CRM), the **T-Card SaaS platform**, Mondial Xpress (e-commerce) and the Augustoni Academy CMS. See them in the [projects section](#projects-section)." }
  ];
  var FAQ_DEFAULT = "I can answer questions about Vivek's experience, skills, projects, AI work and availability. Try one of the suggestions below, or reach him directly via the [contact form](#contact-section).";

  function faqAnswer(q) {
    for (var i = 0; i < FAQ.length; i++) if (FAQ[i].k.test(q)) return FAQ[i].a;
    return FAQ_DEFAULT;
  }

  /* ---------- tiny, safe markdown: bold, lists, links ---------- */
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
        if (!/^(https?:\/\/|mailto:|#|files\/|blog\/)/i.test(url)) return text;
        var external = /^https?:/i.test(url);
        return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
      })
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+)/g, '$1<a href="mailto:$2">$2</a>');
  }
  function renderMarkdown(src) {
    var lines = escapeHtml(src).split('\n');
    var html = '', inList = false;
    lines.forEach(function (line) {
      var item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (item) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(item[1]) + '</li>';
        return;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim()) html += '<p>' + inline(line) + '</p>';
    });
    if (inList) html += '</ul>';
    return html;
  }

  /* ---------- state ---------- */
  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { history = []; }
  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (e) {}
  }

  /* ---------- DOM ---------- */
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'askai-launcher';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<span class="askai-launcher-icon"><i class="fas fa-wand-magic-sparkles"></i></span><span class="askai-launcher-text">Ask my AI</span>';

  var nudge = document.createElement('div');
  nudge.className = 'askai-nudge';
  nudge.innerHTML = '<button type="button" class="askai-nudge-close" aria-label="Dismiss">&times;</button>' +
    '<strong>Hi there! 👋</strong> Ask my AI anything about my experience, projects or availability.';

  var panel = document.createElement('section');
  panel.className = 'askai-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', "Ask Vivek's AI assistant");
  panel.hidden = true;
  panel.innerHTML =
    '<header class="askai-head">' +
      '<span class="askai-avatar"><img src="images/hero-vivek.webp" alt=""><i></i></span>' +
      '<div class="askai-title"><strong>Ask Vivek\'s AI</strong><span>Answers from his CV &amp; projects</span></div>' +
      '<button type="button" class="askai-icon-btn askai-reset" aria-label="Start a new chat" title="New chat"><i class="fas fa-rotate-right"></i></button>' +
      '<button type="button" class="askai-icon-btn askai-close" aria-label="Close chat"><i class="fas fa-xmark"></i></button>' +
    '</header>' +
    '<div class="askai-log" aria-live="polite"></div>' +
    '<div class="askai-chips"></div>' +
    '<form class="askai-form">' +
      '<label class="askai-sr" for="askai-input">Your question</label>' +
      '<textarea id="askai-input" rows="1" maxlength="' + MAX_LEN + '" placeholder="Ask about skills, projects, availability…"></textarea>' +
      '<button type="submit" class="askai-send" aria-label="Send"><i class="fas fa-arrow-up"></i></button>' +
    '</form>' +
    '<p class="askai-foot">AI can make mistakes. For anything important, <a href="#contact-section">contact Vivek</a>.</p>';

  document.body.appendChild(launcher);
  document.body.appendChild(nudge);
  document.body.appendChild(panel);

  var log    = panel.querySelector('.askai-log');
  var chips  = panel.querySelector('.askai-chips');
  var form   = panel.querySelector('.askai-form');
  var input  = panel.querySelector('textarea');
  var sendBt = panel.querySelector('.askai-send');
  var busy   = false;

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function bubble(role, text) {
    var el = document.createElement('div');
    el.className = 'askai-msg askai-' + (role === 'user' ? 'user' : 'bot');
    if (role === 'user') el.textContent = text;
    else el.innerHTML = renderMarkdown(text);
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function renderChips() {
    chips.innerHTML = '';
    var asked = history.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.content; });
    SUGGESTIONS.filter(function (s) { return asked.indexOf(s) === -1; }).slice(0, history.length ? 3 : 5).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'askai-chip';
      b.textContent = s;
      b.addEventListener('click', function () { ask(s); });
      chips.appendChild(b);
    });
  }

  function renderAll() {
    log.innerHTML = '';
    bubble('assistant', GREETING);
    history.forEach(function (m) { bubble(m.role, m.content); });
    renderChips();
  }

  function setBusy(on) {
    busy = on;
    sendBt.disabled = on;
    panel.classList.toggle('is-busy', on);
  }

  function endpoint() {
    return ((script && script.getAttribute('data-endpoint')) || '').trim();
  }

  /* stream an answer from the Worker; resolves with the full text */
  function streamAnswer(el) {
    return fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) })
    }).then(function (res) {
      if (!res.ok || !res.body) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          var err = new Error(d.error || 'Request failed');
          err.userFacing = res.status === 429 && d.error;
          throw err;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '', text = '';
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) return text;
          buffer += decoder.decode(chunk.value, { stream: true });
          var events = buffer.split('\n\n');
          buffer = events.pop();
          for (var i = 0; i < events.length; i++) {
            var line = events[i].replace(/^data: /, '');
            var data;
            try { data = JSON.parse(line); } catch (e) { continue; }
            if (data.t) {
              text += data.t;
              el.innerHTML = renderMarkdown(text);
              scrollDown();
            } else if (data.error) {
              var err = new Error(data.error);
              err.userFacing = data.error;
              err.partial = text;
              throw err;
            }
          }
          return pump();
        });
      }
      return pump();
    });
  }

  function ask(question) {
    question = (question || '').trim().slice(0, MAX_LEN);
    if (!question || busy) return;
    history.push({ role: 'user', content: question });
    bubble('user', question);
    chips.innerHTML = '';
    input.value = '';
    autosize();
    setBusy(true);

    var el = bubble('assistant', '');
    el.classList.add('is-typing');
    el.innerHTML = '<span class="askai-dots"><i></i><i></i><i></i></span>';

    var done = function (answer) {
      el.classList.remove('is-typing');
      el.innerHTML = renderMarkdown(answer);
      history.push({ role: 'assistant', content: answer });
      save();
      setBusy(false);
      renderChips();
      scrollDown();
      input.focus();
    };

    if (!endpoint()) {
      setTimeout(function () { done(faqAnswer(question)); }, 450);
      return;
    }

    streamAnswer(el)
      .then(function (text) { done(text || faqAnswer(question)); })
      .catch(function (err) {
        // Network or server failure: answer from the FAQ rather than leave the visitor stuck.
        done(err.userFacing && !err.partial ? err.userFacing : faqAnswer(question));
      });
  }

  /* ---------- open / close ---------- */
  function open() {
    hideNudge();
    if (!panel.hidden) return;
    if (!log.childElementCount) renderAll();
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-hidden');
    document.documentElement.classList.add('askai-open');
    setTimeout(function () { input.focus(); scrollDown(); }, 60);
  }
  function close() {
    panel.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.classList.remove('is-hidden');
    document.documentElement.classList.remove('askai-open');
    setTimeout(function () { panel.hidden = true; }, 250);
    launcher.focus();
  }

  function hideNudge() {
    nudge.classList.remove('is-visible');
    try { localStorage.setItem(NUDGE, '1'); } catch (e) {}
  }

  launcher.addEventListener('click', open);
  panel.querySelector('.askai-close').addEventListener('click', close);
  panel.querySelector('.askai-reset').addEventListener('click', function () {
    if (busy) return;
    history = [];
    save();
    renderAll();
    input.focus();
  });
  nudge.addEventListener('click', function (e) {
    if (e.target.closest('.askai-nudge-close')) { hideNudge(); return; }
    open();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-askai]');
    if (trigger) {
      e.preventDefault();
      open();
      var q = trigger.getAttribute('data-askai');
      if (q) ask(q);
    }
  });

  /* links to page sections close the chat so the section is visible */
  log.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ask(input.value);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      ask(input.value);
    }
  });
  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  input.addEventListener('input', autosize);

  /* gentle first-visit nudge */
  var seen = false;
  try { seen = !!localStorage.getItem(NUDGE); } catch (e) {}
  if (!seen) {
    // wait until the visitor scrolls past the hero so it never covers the intro
    var onScroll = function () {
      if (window.scrollY < 500) return;
      window.removeEventListener('scroll', onScroll);
      setTimeout(function () { if (panel.hidden) nudge.classList.add('is-visible'); }, 1500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
