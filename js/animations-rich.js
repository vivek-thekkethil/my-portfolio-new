/* ================================================
   RICH ANIMATIONS JS - Portfolio Enhancement
   ================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------
     0. Preloader
  ------------------------------------------------ */
  var preloader = document.getElementById('ftco-preloader');
  if (preloader) {
    // Dismiss as soon as window (images etc.) is fully loaded.
    // If load already fired (cached page), dismiss immediately.
    function dismissPreloader() {
      // Small grace delay so the bar-fill animation completes visually
      var minShow = 2000; // ms — never hide before this
      var elapsed = Date.now() - _preloaderStart;
      var remaining = Math.max(0, minShow - elapsed);
      setTimeout(function () {
        preloader.classList.add('preloader-hide');
        // Remove from DOM after transition so it can't block clicks
        setTimeout(function () {
          if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 700);
      }, remaining);
    }
    var _preloaderStart = Date.now();
    if (document.readyState === 'complete') {
      dismissPreloader();
    } else {
      window.addEventListener('load', dismissPreloader, { once: true });
    }
  }

  /* ------------------------------------------------
     0.5  View Transitions API — section nav morphing
          Progressive enhancement: Chrome/Edge 111+
          Falls back to standard smooth-scroll on others
  ------------------------------------------------ */
  if ('startViewTransition' in document) {

    // Map each section's element to its vertical position so we know
    // whether the user is navigating "down" or "up" the page.
    var sectionIds = [
      'home-section', 'about-section', 'resume-section',
      'services-section', 'skills-section', 'projects-section',
      'blog-section', 'contact-section'
    ];

    function getSectionIndex(id) {
      return sectionIds.indexOf(id.replace('#', ''));
    }

    function currentSectionIndex() {
      var scrollMid = window.scrollY + window.innerHeight / 2;
      var best = 0;
      sectionIds.forEach(function (id, i) {
        var el = document.getElementById(id);
        if (el && el.offsetTop <= scrollMid) best = i;
      });
      return best;
    }

    document.addEventListener('click', function (e) {
      // Find closest anchor with a hash-only href (same-page nav links)
      var anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;

      var hash   = anchor.getAttribute('href');
      var target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();

      var targetIdx  = getSectionIndex(hash);
      var currentIdx = currentSectionIndex();
      var dir        = targetIdx >= currentIdx ? 'down' : 'up';

      // Tell CSS which direction so it picks the right slide keyframes
      document.documentElement.setAttribute('data-vt-dir', dir);

      document.startViewTransition(function () {
        target.scrollIntoView({ behavior: 'instant' });
        // Update URL hash without triggering a page jump
        history.pushState(null, '', hash);
      });
    });
  }

  /* ------------------------------------------------
     1. Custom Cursor
  ------------------------------------------------ */
  var dot  = document.createElement('div');
  var ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function animRing() {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  }());

  var interactiveEls = document.querySelectorAll('a,button,.btn,.services-1,.project,.blog-entry');
  interactiveEls.forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      dot.style.transform   = 'translate(-50%,-50%) scale(2.8)';
      dot.style.background  = '#ff7043';
      ring.style.width      = '62px';
      ring.style.height     = '62px';
      ring.style.borderColor = 'rgba(255,112,67,.65)';
    });
    el.addEventListener('mouseleave', function () {
      dot.style.transform   = 'translate(-50%,-50%) scale(1)';
      dot.style.background  = '#ffbd39';
      ring.style.width      = '36px';
      ring.style.height     = '36px';
      ring.style.borderColor = 'rgba(255,189,57,.55)';
    });
  });

  var heroSection = document.getElementById('home-section');

  /* ------------------------------------------------
     3. Floating Background Blobs
  ------------------------------------------------ */
  var blobData = [
    { w: 420, h: 420, top: '8%',  left: '3%',  color: 'rgba(255,189,57,0.045)', delay: '0s'  },
    { w: 320, h: 320, top: '55%', right: '5%', color: 'rgba(249,109,0,0.035)',  delay: '4s'  },
    { w: 500, h: 500, top: '32%', left: '46%', color: 'rgba(255,189,57,0.03)',  delay: '8s'  },
  ];
  blobData.forEach(function (b, idx) {
    var el = document.createElement('div');
    el.className = 'bg-blob';
    el.style.width  = b.w + 'px';
    el.style.height = b.h + 'px';
    el.style.background = 'radial-gradient(circle,' + b.color + ' 0%,transparent 70%)';
    el.style.animationDelay = b.delay;
    el.style.animationDuration = (18 + idx * 5) + 's';
    if (b.top)   el.style.top   = b.top;
    if (b.left)  el.style.left  = b.left;
    if (b.right) el.style.right = b.right;
    document.body.appendChild(el);
  });

  /* ------------------------------------------------
     4. Typewriter effect for hero H2
  ------------------------------------------------ */
  var heroH2 = document.querySelector('.owl-carousel .slider-item:first-child .slider-text h2');
  if (heroH2) {
    var original = heroH2.textContent.trim();
    heroH2.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'typed-cursor';
    heroH2.parentNode.insertBefore(cursor, heroH2.nextSibling);
    var ti = 0;
    function typeNext() {
      if (ti < original.length) {
        heroH2.textContent += original[ti++];
        setTimeout(typeNext, 75);
      }
    }
    setTimeout(typeNext, 1400);
  }

  /* ------------------------------------------------
     5. Scroll-triggered heading underline
  ------------------------------------------------ */
  var headingSections = document.querySelectorAll('.heading-section');
  var hsObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('heading-animated');
        hsObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });
  headingSections.forEach(function (h) { hsObs.observe(h); });

  /* ------------------------------------------------
     6. Scroll Indicator in Hero
  ------------------------------------------------ */
  if (heroSection) {
    var si = document.createElement('div');
    si.className = 'scroll-indicator';
    si.innerHTML = '<span></span><span></span><span></span>';
    heroSection.appendChild(si);
    // Hide on scroll
    window.addEventListener('scroll', function () {
      si.style.opacity = window.scrollY > 80 ? '0' : '0.7';
    }, { passive: true });
  }

  /* ------------------------------------------------
     7. Vanilla 3-D Tilt on cards
  ------------------------------------------------ */
  function addTilt(selector, maxDeg, scl) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var cx   = rect.width  / 2;
        var cy   = rect.height / 2;
        var rx   = ((e.clientY - rect.top)  - cy) / cy * -maxDeg;
        var ry   = ((e.clientX - rect.left) - cx) / cx *  maxDeg;
        el.style.transform  = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(' + scl + ')';
        el.style.transition = 'transform 0.08s linear';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform  = 'perspective(900px) rotateX(0) rotateY(0) scale(1)';
        el.style.transition = 'transform 0.55s ease';
      });
    });
  }
  addTilt('.services-1',            8,  1.025);
  addTilt('.resume-wrap',           4,  1.01);
  addTilt('.contact-section .box',  6,  1.02);
  addTilt('.blog-entry',            4,  1.015);

  /* ------------------------------------------------
     8. Ripple on button click
  ------------------------------------------------ */
  var rippleCSS = document.createElement('style');
  rippleCSS.textContent = '@keyframes rippleOut{to{transform:scale(5);opacity:0;}}';
  document.head.appendChild(rippleCSS);

  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var r       = document.createElement('span');
      var size    = Math.max(btn.offsetWidth, btn.offsetHeight);
      r.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'background:rgba(255,255,255,0.38)',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'left:'  + (e.offsetX - size / 2) + 'px',
        'top:'   + (e.offsetY - size / 2) + 'px',
        'transform:scale(0)',
        'pointer-events:none',
        'animation:rippleOut 0.65s linear forwards'
      ].join(';');
      btn.appendChild(r);
      setTimeout(function () { r.remove(); }, 700);
    });
  });

  /* ------------------------------------------------
     9. Progress bars – animated fill on scroll
  ------------------------------------------------ */
  var pbObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var bar = entry.target;
        var target = bar.style.width || bar.getAttribute('aria-valuenow') + '%';
        bar.style.width = '0%';
        bar.style.transition = 'width 1.6s cubic-bezier(0.17,0.67,0.83,0.67) 0.15s';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            bar.style.width = target;
          });
        });
        pbObs.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.progress-bar').forEach(function (bar) {
    pbObs.observe(bar);
  });

  /* ------------------------------------------------
     10. Glowing border on active nav link
  ------------------------------------------------ */
  var nav = document.querySelector('#ftco-navbar');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.style.boxShadow = window.scrollY > 60
        ? '0 4px 30px rgba(255,189,57,0.12)'
        : 'none';
    }, { passive: true });
  }

}());
