/* ================================================
   CONTACT FORM — validation, sending, success state.
   With data-access-key set on the form it posts to
   Web3Forms; without one it opens the visitor's
   email app with the message pre-filled.
   ================================================ */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var ENDPOINT   = 'https://api.web3forms.com/submit';
  var accessKey  = (form.getAttribute('data-access-key') || '').trim();
  var mailTo     = form.getAttribute('data-to');
  var submitBtn  = form.querySelector('.cf-submit');
  var statusEl   = form.querySelector('.cf-status');
  var successEl  = form.querySelector('.cf-success');
  var EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    name:    function (v) { return v.length >= 2 || 'Please enter your name.'; },
    email:   function (v) { return EMAIL_RE.test(v) || 'Please enter a valid email address.'; },
    message: function (v) { return v.length >= 10 || 'Please write at least a short message (10+ characters).'; }
  };

  function field(name) { return form.elements[name]; }

  function setError(name, msg) {
    var input = field(name);
    var err = input.parentNode.querySelector('.cf-error');
    input.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  }

  function validate(name) {
    var result = rules[name](field(name).value.trim());
    setError(name, result === true ? '' : result);
    return result === true;
  }

  function validateAll() {
    var firstBad = null;
    Object.keys(rules).forEach(function (name) {
      if (!validate(name) && !firstBad) firstBad = field(name);
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* re-check a field as soon as the visitor fixes it */
  Object.keys(rules).forEach(function (name) {
    field(name).addEventListener('input', function () {
      if (this.classList.contains('is-invalid')) validate(name);
    });
    field(name).addEventListener('blur', function () {
      if (this.value.trim()) validate(name);
    });
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
  }

  function showSuccess() {
    form.classList.add('is-sent');
    successEl.hidden = false;
    successEl.querySelector('.cf-again').focus();
  }

  function values() {
    return {
      name:    field('name').value.trim(),
      email:   field('email').value.trim(),
      subject: field('subject').value.trim() || 'New message from your portfolio',
      message: field('message').value.trim()
    };
  }

  function openMailApp(v) {
    var body = v.message + '\n\n— ' + v.name + ' (' + v.email + ')';
    window.location.href = 'mailto:' + mailTo +
      '?subject=' + encodeURIComponent(v.subject) +
      '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.textContent = '';
    if (form.elements.botcheck.checked) return; // spam bot
    if (!validateAll()) return;

    var v = values();

    if (!accessKey) {
      openMailApp(v);
      statusEl.textContent = 'Your email app should open with the message ready to send.';
      return;
    }

    setLoading(true);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: 'Portfolio: ' + v.subject,
        from_name: v.name,
        name: v.name,
        email: v.email,
        message: v.message,
        botcheck: false
      })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        if (!r.ok || !r.data.success) throw new Error(r.data && r.data.message);
        form.reset();
        showSuccess();
      })
      .catch(function () {
        statusEl.innerHTML = 'Sorry, the message couldn\'t be sent. Please email me directly at ' +
          '<a href="mailto:' + mailTo + '">' + mailTo + '</a>.';
      })
      .finally(function () { setLoading(false); });
  });

  successEl.querySelector('.cf-again').addEventListener('click', function () {
    successEl.hidden = true;
    form.classList.remove('is-sent');
    field('name').focus();
  });
})();
