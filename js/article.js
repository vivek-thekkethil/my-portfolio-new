/* ================================================
   BLOG ARTICLE PAGES — reading progress + reveal
   ================================================ */
(function () {
  'use strict';

  var bar = document.getElementById('read-progress');
  var ticking = false;

  function update() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();

  /* fade sections in as they enter the viewport */
  var items = document.querySelectorAll('.a-body > *, .a-sources, .a-cta, .a-more');
  if (!('IntersectionObserver' in window)) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  Array.prototype.forEach.call(items, function (el) {
    el.classList.add('a-reveal');
    obs.observe(el);
  });
})();
