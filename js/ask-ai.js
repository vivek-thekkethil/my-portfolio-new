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
  launcher.setAttribute('aria-label', "Ask my AI — chat with Vivek's assistant");
  // a little Vivek: photo head on an SVG hoodie-and-jeans body (limbs animate in ask-ai.css).
  // The hood collar and waving arm sit in a second layer in front of the head,
  // so the neck tucks into the hoodie instead of ending in a hard edge.
  launcher.innerHTML =
    '<span class="askai-buddy" aria-hidden="true">' +
      '<svg class="askai-buddy-body" viewBox="0 0 64 64">' +
        '<g class="b-leg b-leg-1"><rect x="22" y="40" width="9.5" height="19" rx="4" fill="#34416a" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><rect x="19.5" y="56" width="13" height="6" rx="3" fill="#f2f2f2"/></g>' +
        '<g class="b-leg b-leg-2"><rect x="32.5" y="40" width="9.5" height="19" rx="4" fill="#34416a" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><rect x="31.5" y="56" width="13" height="6" rx="3" fill="#f2f2f2"/></g>' +
        '<g class="b-arm b-arm-1"><rect x="4" y="8" width="9" height="25" rx="4.5" fill="#1f1b28" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><circle cx="8.5" cy="34" r="4" fill="#c58a62"/></g>' +
        '<rect x="9" y="9" width="46" height="35" rx="14" fill="#1c1826" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>' +
        '<path d="M20 31h24v8a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3z" fill="#24202e"/>' +
      '</svg>' +
      '<img class="askai-buddy-head" src="images/vivek-head.webp" width="176" height="223" alt="">' +
      '<svg class="askai-buddy-body askai-buddy-front" viewBox="0 0 64 64">' +
        '<path d="M11 11C13 5 21 5 24 10C27 14 37 14 40 10C43 5 51 5 53 11C54 17 46 22 32 22C18 22 10 17 11 11Z" fill="#24202e" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>' +
        '<path d="M28 20v11M36 20v8" stroke="#b3262e" stroke-width="1.6" stroke-linecap="round"/>' +
        '<g class="b-arm b-arm-2"><rect x="51" y="8" width="9" height="25" rx="4.5" fill="#1f1b28" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><rect x="51.5" y="28" width="8" height="3" rx="1" fill="#050505"/><circle cx="55.5" cy="34" r="4" fill="#c58a62"/></g>' +
      '</svg>' +
    '</span>' +
    '<span class="askai-launcher-text"><i class="fas fa-wand-magic-sparkles"></i> Ask my AI</span>';

  var nudge = document.createElement('div');
  nudge.className = 'askai-nudge';
  nudge.innerHTML = '<button type="button" class="askai-nudge-close" aria-label="Dismiss">&times;</button>' +
    '<strong>Hi, I\'m Vivek! 👋</strong> Ask my AI anything about my experience, projects or availability.';

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

  /* Vivek walks in from the left once the preloader is gone,
     waves, and says hi in a speech bubble */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function arrive() {
    launcher.classList.remove('is-walking');
    launcher.classList.add('is-arrived', 'is-waving');
    setTimeout(function () { launcher.classList.remove('is-waving'); }, 1900);
    setTimeout(function () {
      if (!panel.hidden) return;
      nudge.classList.add('is-visible');
      setTimeout(hideNudge, 9000);
    }, 450);
  }

  function walkIn() {
    if (reduceMotion) { arrive(); return; }
    launcher.addEventListener('animationend', function onEnd(e) {
      if (e.animationName !== 'buddyWalkIn') return;
      launcher.removeEventListener('animationend', onEnd);
      arrive();
    });
    launcher.classList.add('is-walking');
  }

  /* his face turns to look at the visitor's pointer, then goes back
     to looking around on its own after a few still seconds */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var buddy = launcher.querySelector('.askai-buddy');
    var head  = launcher.querySelector('.askai-buddy-head');
    var lookTimer, lookFrame = 0, pointerX = 0, pointerY = 0;
    var setLook = function (x, y) {
      head.style.setProperty('--look-x', x.toFixed(1) + 'deg');
      head.style.setProperty('--look-y', y.toFixed(1) + 'deg');
    };
    document.addEventListener('pointermove', function (e) {
      if (!launcher.classList.contains('is-arrived')) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!lookFrame) lookFrame = requestAnimationFrame(function () {
        lookFrame = 0;
        var r  = buddy.getBoundingClientRect();   // the body's box, unaffected by the head's own turn
        var dx = (pointerX - (r.left + r.width * 0.52)) / 420;
        var dy = (pointerY - (r.top + r.height * 0.27)) / 320;
        setLook(Math.max(-1, Math.min(1, dx)) * 26, Math.max(-1, Math.min(1, dy)) * -16);
        launcher.classList.add('is-tracking');
      });
      clearTimeout(lookTimer);
      lookTimer = setTimeout(function () {
        setLook(0, 0);                           // ease back to centre before the idle look-around resumes
        lookTimer = setTimeout(function () {
          launcher.classList.remove('is-tracking');
          head.style.removeProperty('--look-x');
          head.style.removeProperty('--look-y');
        }, 400);
      }, 3000);
    }, { passive: true });
  }

  (function waitForPreloader() {
    var pre = document.getElementById('ftco-preloader');
    if (pre && !pre.classList.contains('preloader-hide')) { setTimeout(waitForPreloader, 150); return; }
    setTimeout(walkIn, 400);
  })();
})();
