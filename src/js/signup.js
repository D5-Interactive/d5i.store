

(function () {
  'use strict';

  var CONFIG = {
    email: 'd5int.sp@gmail.com',

    endpoint: '',
    subject: 'StarSec signup: Rowdy CyberCon, Nov 6-7 2026',

    thanks: "You're on the list.",

    emailDomain: '@utsa.edu'
  };

  var FIELDS = [
    { key: 'name', label: 'Full name', type: 'text', required: true, width: 'half', autocomplete: 'name' },
    { key: 'role', label: 'Role', type: 'select', required: true, width: 'half',
      options: ['Captain', 'Operator'] },
    { key: 'experience', label: 'Experience level', type: 'select', required: true, width: 'half',
      options: ['Beginner', 'Intermediate', 'Advanced'] },
    { key: 'jedis', label: 'Are you a member of Cyber Jedis?', type: 'select', required: true, width: 'half',
      options: ['Yes', 'No'] },
    { key: 'utsaEmail', label: 'UTSA email', type: 'email', required: true, width: 'half',
      placeholder: 'abc123@utsa.edu', autocomplete: 'email' },
    { key: 'utsaId', label: 'UTSA ID', type: 'text', required: true, width: 'half',
      placeholder: 'ABC123' },
    { key: 'discord', label: 'Discord', type: 'text', width: 'half',
      placeholder: 'your handle, no @' },
    { key: 'github', label: 'GitHub account', type: 'text', width: 'half',
      placeholder: 'your username' },
    { key: 'notes', label: 'Notes / anything else', type: 'textarea', width: 'full',
      placeholder: 'Arrival time, accessibility needs, teammates, questions...' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '"') return '&quot;';
      return '&#39;';
    });
  }

  function fieldId(f) { return 'sf-' + f.key; }
  function fieldName(f) { return f.label + (f.required ? ' *' : ''); }

  function renderField(f) {
    var id = fieldId(f);
    var req = f.required ? ' required aria-required="true"' : '';
    var ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
    var ac = f.autocomplete ? ' autocomplete="' + esc(f.autocomplete) + '"' : '';
    var hint = f.hint ? '<span class="sf-hint" id="' + id + '-hint">' + esc(f.hint) + '</span>' : '';
    var aria = hint ? ' aria-describedby="' + id + '-hint"' : '';
    var err = '<span class="sf-error" id="' + id + '-err" role="alert"></span>';
    var ctl;

    if (f.type === 'select') {
      var opts = '<option value="">Select...</option>' +
        (f.options || []).map(function (o) {
          return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
        }).join('');
      ctl = '<select class="sf-control" id="' + id + '" name="' + esc(f.key) + '"' + req + aria + '>' + opts + '</select>';
    } else if (f.type === 'textarea') {
      ctl = '<textarea class="sf-control" id="' + id + '" name="' + esc(f.key) + '" rows="4"' +
        ph + req + aria + '></textarea>';
    } else {
      ctl = '<input class="sf-control" type="' + esc(f.type) + '" id="' + id + '" name="' + esc(f.key) + '"' +
        ph + ac + req + aria + '>';
    }

    return '<div class="sf-field sf-' + (f.width === 'half' ? 'half' : 'full') + '" data-key="' + esc(f.key) + '">' +
      '<label class="sf-label" for="' + id + '">' + esc(fieldName(f)) + '</label>' +
      ctl + hint + err +
      '</div>';
  }

  function validate(f, value) {
    var v = String(value == null ? '' : value).trim();
    if (f.required && !v) return 'This field is required.';
    if (!v) return '';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'That does not look like an email address.';
    if (CONFIG.emailDomain && f.key === 'utsaEmail' &&
        v.toLowerCase().slice(-CONFIG.emailDomain.length) !== CONFIG.emailDomain) {
      return 'Use your UTSA address, which ends in ' + CONFIG.emailDomain + '.';
    }
    if (f.pattern) {
      try { if (!new RegExp(f.pattern).test(v)) return f.hint || 'Check this value.'; }
      catch (e) {  }
    }
    return '';
  }

  function collect(fields) {
    var values = {}, errors = [], firstBad = null;
    fields.forEach(function (f) {
      var el = document.getElementById(fieldId(f));
      var v = el ? el.value : '';
      values[f.key] = String(v == null ? '' : v).trim();
      var msg = validate(f, v);
      var errEl = document.getElementById(fieldId(f) + '-err');
      var wrap = el && el.closest('.sf-field');
      if (errEl) errEl.textContent = msg;
      if (wrap) wrap.classList.toggle('is-invalid', !!msg);
      if (msg) {
        errors.push(f.label + ': ' + msg);
        if (!firstBad && el) firstBad = el;
      }
    });
    return { values: values, errors: errors, firstBad: firstBad };
  }

  function compose(fields, values) {
    var lines = [];
    fields.forEach(function (f) {
      var v = values[f.key] || '';
      lines.push(f.label + ': ' + (v || '(not given)'));
    });
    lines.push('');
    lines.push('Sent from ' + window.location.href);
    return lines.join('\n');
  }

  function summaryHtml(fields, values) {
    return '<dl class="sf-summary">' + fields.filter(function (f) { return values[f.key]; })
      .map(function (f) {
        return '<dt>' + esc(f.label) + '</dt><dd>' + esc(values[f.key]) + '</dd>';
      }).join('') + '</dl>';
  }

  function build() {
    var mount = document.getElementById('signup-form');
    if (!mount) return;

    mount.innerHTML =
      '<form class="sf-form" id="sf-form" novalidate>' +
        '<div class="sf-grid">' + FIELDS.map(renderField).join('') + '</div>' +
        '<div class="sf-actions">' +
          '<button type="submit" class="sf-submit">Send my signup</button>' +
          '<button type="button" class="sf-copy" id="sf-copy">Copy instead</button>' +
        '</div>' +
        '<p class="sf-status" id="sf-status" role="status"></p>' +
      '</form>' +
      '<div class="sf-done" id="sf-done" hidden>' +
        '<h2 class="sf-done-h">' + esc(CONFIG.thanks) + '</h2>' +
        '<p class="sf-done-p">Your mail app should have opened with the details below. ' +
        'If it didn\'t, use the copy button and email them to ' +
        '<a href="mailto:' + esc(CONFIG.email) + '">' + esc(CONFIG.email) + '</a>.</p>' +
        '<div id="sf-done-body"></div>' +
        '<div class="sf-actions">' +
          '<button type="button" class="sf-submit" id="sf-again">Edit and resubmit</button>' +
        '</div>' +
      '</div>';

    var form = document.getElementById('sf-form');
    var status = document.getElementById('sf-status');
    var done = document.getElementById('sf-done');

    function finish(values) {
      var body = compose(FIELDS, values);
      document.getElementById('sf-done-body').innerHTML = summaryHtml(FIELDS, values);
      form.hidden = true;
      done.hidden = false;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return body;
    }

    function post(body, values) {
      var payload = {};
      FIELDS.forEach(function (f) { payload[f.key] = values[f.key]; });
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        status.textContent = 'Sent. Thanks!';
        finish(values);
      }).catch(function (err) {
        status.textContent = 'Could not send (' + err.message + '). Use "Copy instead".';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = collect(FIELDS);
      if (r.errors.length) {
        status.textContent = r.errors.length + ' field' + (r.errors.length > 1 ? 's need' : ' needs') +
          ' attention: ' + r.errors.join('; ');
        if (r.firstBad) r.firstBad.focus();
        return;
      }
      status.textContent = '';
      var body = finish(r.values);
      if (CONFIG.endpoint) {
        post(body, r.values);
      } else {
        window.location.href = 'mailto:' + CONFIG.email +
          '?subject=' + encodeURIComponent(CONFIG.subject) +
          '&body=' + encodeURIComponent(body);
      }
    });

    document.getElementById('sf-copy').addEventListener('click', function () {
      var r = collect(FIELDS);
      if (r.errors.length) {
        status.textContent = 'Fix the highlighted fields first: ' + r.errors.join('; ');
        if (r.firstBad) r.firstBad.focus();
        return;
      }
      var body = compose(FIELDS, r.values);
      var done2 = function () {
        status.textContent = 'Copied. Paste it into an email to ' + CONFIG.email + '.';
        finish(r.values);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(done2, function () { fallbackCopy(body, status, done2); });
      } else {
        fallbackCopy(body, status, done2);
      }
    });

    document.getElementById('sf-again').addEventListener('click', function () {
      done.hidden = true;
      form.hidden = false;
      status.textContent = '';
      var first = document.getElementById(fieldId(FIELDS[0]));
      if (first) first.focus();
    });

    form.addEventListener('input', function (e) {
      var wrap = e.target.closest ? e.target.closest('.sf-field') : null;
      if (!wrap) return;
      var f = FIELDS.filter(function (x) { return x.key === wrap.getAttribute('data-key'); })[0];
      if (!f) return;
      if (!validate(f, e.target.value)) {
        wrap.classList.remove('is-invalid');
        var errEl = document.getElementById(fieldId(f) + '-err');
        if (errEl) errEl.textContent = '';
      }
    });
  }

  function fallbackCopy(text, statusEl, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) { done(); }
    else {
      statusEl.textContent = 'Copy failed. Select the text below and copy it manually.';
      var pre = document.createElement('pre');
      pre.className = 'sf-raw';
      pre.textContent = text;
      statusEl.parentNode.appendChild(pre);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
