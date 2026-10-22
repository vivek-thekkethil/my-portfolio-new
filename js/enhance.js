/* ================================================
   DESIGN ENHANCEMENTS — scroll progress, resume
   timeline, card spotlight, hero parallax
   ================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(pointer: fine)').matches;

  /* ------------------------------------------------
     Scroll progress bar + resume timeline fill
     ------------------------------------------------ */
  var bar = document.createElement('div');
  bar.id = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  var timeline = document.querySelector('.resume-timeline');
  var tlFill   = timeline && timeline.querySelector('.tl-progress');
  var tlCards  = timeline ? timeline.querySelectorAll('.resume-wrap') : [];
  var ticking  = false;

  function update() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';

    if (!timeline) return;
    var trigger = window.innerHeight * 0.6;
    var rect = timeline.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (trigger - rect.top) / rect.height));
    if (tlFill) tlFill.style.height = (p * (rect.height - 50)) + 'px';

    for (var i = 0; i < tlCards.length; i++) {
      var top = tlCards[i].getBoundingClientRect().top + 36;
      tlCards[i].classList.toggle('tl-active', top < trigger);
    }
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  update();

  /* ------------------------------------------------
     Memory game — hidden extra, opened from the footer
     ------------------------------------------------ */
  var gameToggle = document.querySelector('.game-toggle');
  var game = document.getElementById('game-section');
  if (gameToggle && game) {
    gameToggle.addEventListener('click', function () {
      var opening = game.hidden;
      game.hidden = !opening;
      gameToggle.setAttribute('aria-expanded', String(opening));
      if (!opening) return;
      // its scroll-in animations never fired while hidden, so reveal them now
      Array.prototype.forEach.call(game.querySelectorAll('.ftco-animate'), function (el) {
        el.classList.add('fadeInUp', 'ftco-animated');
      });
      game.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  if (!finePointer) return;

  /* ------------------------------------------------
     Card spotlight — glow follows the pointer
     ------------------------------------------------ */
  var spotCards = document.querySelectorAll(
    '.resume-wrap, .services-1, .skl-card, .ftco-counter .block-18, .hireme-card'
  );
  Array.prototype.forEach.call(spotCards, function (card) {
    card.classList.add('fx-spot');
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ------------------------------------------------
     Hero parallax — portrait and chips drift with pointer
     ------------------------------------------------ */
  var hero = document.getElementById('home-section');
  if (hero && !reduceMotion) {
    hero.addEventListener('pointermove', function (e) {
      hero.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      hero.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--px', 0);
      hero.style.setProperty('--py', 0);
    });
  }
})();
