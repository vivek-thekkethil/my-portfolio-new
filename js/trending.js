/* ================================================
   TRENDING MOTION — tech marquee, heading scramble,
   scroll-lit about text, magnetic buttons
   ================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion) return;

  /* ------------------------------------------------
     Scroll velocity — shared by the marquee
     ------------------------------------------------ */
  var lastY    = window.scrollY;
  var velocity = 0;   // smoothed px per frame
  var scrollDir = 1;  // 1 = down, -1 = up

  /* ------------------------------------------------
     Tech marquee — rows drift on their own and
     speed up (and reverse) with the scroll
     ------------------------------------------------ */
  var marquee = document.querySelector('.tech-marquee');
  if (marquee) {
    var rows = Array.prototype.map.call(marquee.querySelectorAll('.tm-row'), function (row, i) {
      var track = row.querySelector('.tm-track');
      var clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
      return { tracks: [track, clone], dir: i % 2 ? 1 : -1, offset: 0 };
    });

    var running = false;
    var frame = function () {
      if (!running) return;
      var y = window.scrollY;
      var delta = y - lastY;
      lastY = y;
      if (delta) scrollDir = delta > 0 ? 1 : -1;
      velocity += (Math.min(Math.abs(delta), 60) - velocity) * 0.12;

      var speed = (0.55 + velocity * 0.35) * scrollDir;
      rows.forEach(function (r) {
        var w = r.tracks[0].offsetWidth;
        r.offset = (r.offset + speed * r.dir) % w;
        if (r.offset > 0) r.offset -= w;
        var tf = 'translate3d(' + r.offset.toFixed(2) + 'px,0,0)';
        r.tracks[0].style.transform = tf;
        r.tracks[1].style.transform = tf;
      });
      requestAnimationFrame(frame);
    };

    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) {
        running = true;
        lastY = window.scrollY;
        requestAnimationFrame(frame);
      } else if (!visible) {
        running = false;
      }
    }).observe(marquee);
  }

  /* ------------------------------------------------
     Section headings decode from random glyphs
     ------------------------------------------------ */
  var GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFXYZ';
  var esc = function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; };

  function scramble(el) {
    var text = el.textContent;
    var queue = [];
    for (var i = 0; i < text.length; i++) {
      var start = Math.floor(Math.random() * 18);
      queue.push({ ch: text[i], start: start, end: start + 10 + Math.floor(Math.random() * 22) });
    }
    el.setAttribute('aria-label', text);
    el.classList.add('tr-scramble');
    var tick = 0;
    (function step() {
      var html = '';
      var done = 0;
      queue.forEach(function (q) {
        if (tick >= q.end || q.ch === ' ') {
          done++;
          html += esc(q.ch);
        } else if (tick >= q.start) {
          // the real letter keeps its space; the glyph is painted over it
          var g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          html += '<span class="tr-glyph" data-g="' + esc(g) + '">' + esc(q.ch) + '</span>';
        } else {
          html += esc(q.ch);
        }
      });
      el.innerHTML = html;
      if (done === queue.length) {
        el.textContent = text;
        el.classList.remove('tr-scramble');
        el.removeAttribute('aria-label');
        return;
      }
      tick++;
      requestAnimationFrame(step);
    })();
  }

  var headings = Array.prototype.filter.call(
    document.querySelectorAll('.heading-section h2'),
    function (h) { return h.children.length === 0 && h.textContent.trim(); }
  );
  var headObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      headObs.unobserve(entry.target);
      // wait for the ftco fade-in to start so the decode is visible
      setTimeout(function () { scramble(entry.target); }, 250);
    });
  }, { threshold: 0.6 });
  headings.forEach(function (h) { headObs.observe(h); });

  /* ------------------------------------------------
     About paragraph lights up word by word on scroll
     ------------------------------------------------ */
  var KEYWORDS = /^(Laravel|Symfony|Vue\.js|APIs|Dubai|CRM|AI|LLM|chatbots)/;
  var aboutP = document.querySelector('#about-section .heading-section > p');
  if (aboutP) {
    var words = [];
    Array.prototype.slice.call(aboutP.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'tr-w' + (KEYWORDS.test(part) ? ' is-key' : '');
        s.textContent = part;
        words.push(s);
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    aboutP.classList.add('tr-words');

    var litCount = -1;
    var paintWords = function () {
      var r  = aboutP.getBoundingClientRect();
      var vh = window.innerHeight;
      var start = vh * 0.9;   // first word lights as the paragraph enters
      var end   = vh * 0.45;  // last word lights as its bottom nears mid-screen
      var p = Math.max(0, Math.min(1, (start - r.top) / (start - end + r.height * 0.6)));
      var n = Math.round(p * words.length);
      if (n === litCount) return;
      litCount = n;
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-lit', i < n);
    };
    var wordTicking = false;
    window.addEventListener('scroll', function () {
      if (wordTicking) return;
      wordTicking = true;
      requestAnimationFrame(function () { wordTicking = false; paintWords(); });
    }, { passive: true });
    paintWords();
  }

  if (!finePointer) return;

  /* ------------------------------------------------
     Magnetic buttons — pulled toward the pointer
     ------------------------------------------------ */
  var magnets = Array.prototype.map.call(
    document.querySelectorAll(
      '.slider-text .btn, .ftco_navbar .nav-hire, .hireme-card .btn, #about-section .btn, .contact-form .cf-submit, .hero-askai'
    ),
    function (el) { el.classList.add('tr-magnet'); return el; }
  );
  var MAGNET_RANGE = 70;  // px around the button that still pulls
  var MAGNET_PULL  = 0.32;
  var px = -1e4, py = -1e4, magTicking = false;

  function pullMagnets() {
    magTicking = false;
    magnets.forEach(function (el) {
      var r  = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = px - cx;
      var dy = py - cy;
      var near = Math.abs(dx) < r.width / 2 + MAGNET_RANGE && Math.abs(dy) < r.height / 2 + MAGNET_RANGE;
      if (near) {
        el.classList.add('is-pulling');
        el.style.translate = (dx * MAGNET_PULL).toFixed(1) + 'px ' + (dy * MAGNET_PULL).toFixed(1) + 'px';
      } else if (el.classList.contains('is-pulling')) {
        el.classList.remove('is-pulling');
        el.style.translate = '';
      }
    });
  }
  document.addEventListener('pointermove', function (e) {
    px = e.clientX;
    py = e.clientY;
    if (!magTicking) {
      magTicking = true;
      requestAnimationFrame(pullMagnets);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', function () {
    px = py = -1e4;
    pullMagnets();
  });
})();
