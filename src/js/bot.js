/* bot.js — D5Bot, the site help assistant.
   Self-contained on purpose: index.html does not load load.js, so nothing here
   may depend on it. Mounted by including:

     <script>window.D5I_BOT_BASE = '../';</script>   ('' on the root page)
     <script src="../js/bot.js"></script>            ('src/js/bot.js' at root)

   Everything a maintainer needs to change lives in CONFIG below. */

(function () {
  'use strict';

  var CONFIG = {
    email: 'd5int.sp@gmail.com',
    volume: 0.35,
    panelTitle: 'D5Bot',
    openGreeting:
      "Woof! I'm D5Bot. I can help you find someone, or pass a message straight to the team. What do you need?",
    fallback:
      "I don't have an answer for that one, sorry. I can pass it to a human though — hit the button below and it'll come pre-filled."
  };

  var BASE = (typeof window.D5I_BOT_BASE === 'string') ? window.D5I_BOT_BASE : '';

  function asset(p) { return BASE + 'src/bin/d5dog/' + p; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '"') return '&quot;';
      return '&#39;';
    });
  }

  function mailto(subject, body) {
    return 'mailto:' + CONFIG.email +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function pageUrl() { return window.location.href; }
  function pageName() {
    var p = window.location.pathname.split('/').pop();
    return (p && p.indexOf('.') > -1) ? p : 'the site';
  }

  /* The standing menu, always reachable no matter what the last reply was. */
  var DEFAULT_OPTIONS = [
    { label: 'Contact us', action: 'contact' },
    { label: 'Leave a suggestion', action: 'suggest' },
    { label: 'Report a broken page', action: 'bug' }
  ];

  /* ── Local keyword matcher ──────────────────────────────────────
     No network, no API key, no cost. First hit wins, so order rules
     from most specific to most general. */
  var RULES = [
    { re: /\b(hi|hey|hello|yo|sup|howdy|good (morning|afternoon|evening))\b/i,
      say: "Woof woof. I'm D5Bot — a small helper that lives in the corner of this site. Try \"services\", \"products\", \"team\", or \"contact\"." },

    { re: /\b(service|services|consult|consulting|hire|hiring|work with you|freelance|contract|advisory)\b/i,
      say: "We do two things: architecture and security consulting, and full end-to-end product development. Rates are on request and we keep a limited number of slots open.",
      link: { text: 'See services', href: BASE + 'src/pages/SERVICES.html' } },

    { re: /\b(product|products|tool|tools|ship|thing(s)? you (made|build)|starsec|dbgc|star sec|debug commander|cli)\b/i,
      say: "We ship a few things: StarSec, a simulated cyber-warfare range built on real shells and services, and DBGC, our debugging commander tool. There are more in the works.",
      link: { text: 'See products', href: BASE + 'src/pages/PRODUCTS.html' } },

    { re: /\b(staff|team|who (works|are|is)|member|members|people|roster|join)\b/i,
      say: function () {
        var n = document.querySelector('.page-count');
        var m = n && n.textContent.match(/(\d+)\s+entr/);
        return m
          ? "There's " + m[1] + " people listed on the team page. Everyone's grouped by team — security, hardware, website, and the StarSec range."
          : "Our team page lists everyone, grouped by the teams they work on — security, hardware, website, and the StarSec range.";
      },
      link: { text: 'Meet the team', href: BASE + 'src/pages/STAFF.html' } },

    { re: /\b(price|pricing|cost|costs|rate|rates|budget|cheap|expensive|how much|afford)\b/i,
      say: "We don't post rates — they depend on scope. Send us a note describing what you need and we'll come back with something concrete." },

    { re: /\b(contact|email|reach|message|talk|speak|get in touch|dm)\b/i,
      say: "You can reach the whole team at " + CONFIG.email + ". It goes to a real inbox, not a form that goes nowhere.",
      action: 'contact' },

    { re: /\b(suggest|suggestion|feedback|idea|ideas|improve|improvement|feature request|request)\b/i,
      say: "Good — suggestions are genuinely welcome, and pre-filling them with the page you were on helps a lot.",
      action: 'suggest' },

    { re: /\b(bug|broken|error|typo|not working|does ?n'?t work|404|fail(ed|ing)?|issue)\b/i,
      say: "Found something broken? Send it over with the page URL attached and we'll take a look.",
      action: 'bug' },

    { re: /\b(github|repo|repository|source|code|open source|contribute|contributing)\b/i,
      say: "Everything we build is open source. The site itself lives on GitHub under D5-Interactive/d5i.store." },

    { re: /\b(security|secure|infosec|cybersecurity|pen ?test|pentest|audit|vuln|vulnerability|dev ?sec ?ops|hardening)\b/i,
      say: "Security is the core of what we do — architecture review, technical due diligence, and DevSecOps mentorship for teams that need a second pair of eyes." },

    { re: /\b(thank|thanks|thx|cheers|appreciate|ta)\b/i,
      say: "Any time. Bark on if anything else comes up." },

    { re: /\b(dog|d5dog|woof|bark|good (boy|girl)|puppy)\b/i,
      say: "Bark bark. That's me. I'm the clickable one — press me and I bark, that's the whole gimmick." },

    { re: /\b(help|how does this work|what can you do|commands|options)\b/i,
      say: "I can answer quick questions, or pass a message to the team: contact, a suggestion, or a bug report. I run entirely in your browser, so nothing you type here leaves it." }
  ];

  function matchRule(text) {
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(text)) return RULES[i];
    }
    return null;
  }

  /* ── Audio ─────────────────────────────────────────────────────
     Sound is ON by default. Only an explicit stored '0' turns it off, so a
     corrupt or legacy value can never leave the bot permanently silent. */
  var SOUND_KEY = 'd5bot-sound';
  var soundOn = true;
  try {
    var stored = window.localStorage.getItem(SOUND_KEY);
    if (stored !== null) soundOn = stored !== '0';
  } catch (e) {}

  var audio = null;
  function bark() {
    if (!soundOn) return;
    try {
      if (!audio) {
        audio = new Audio(asset('d5dog.mp3'));
        audio.preload = 'auto';
        audio.volume = CONFIG.volume;
      }
      audio.currentTime = 0;
      var p = audio.play();
      // Autoplay policy can reject even inside a click; never let that throw.
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }

  /* ── Build ──────────────────────────────────────────────────── */
  function build() {
    var root = document.createElement('div');
    root.className = 'd5bot';
    root.innerHTML = [
      '<div class="d5bot-panel" id="d5bot-panel" role="dialog" aria-modal="false" aria-label="' + esc(CONFIG.panelTitle) + '">',
      '  <div class="d5bot-head">',
      '    <strong>' + esc(CONFIG.panelTitle) + '</strong>',
      '    <span class="d5bot-status">online</span>',
      '    <button type="button" class="d5bot-close" aria-label="Close help assistant">&times;</button>',
      '  </div>',
      '  <div class="d5bot-log" id="d5bot-log" aria-live="polite"></div>',
      '  <div class="d5bot-opts" id="d5bot-opts"></div>',
      '  <form class="d5bot-form" id="d5bot-form">',
      '    <label for="d5bot-q" class="visually-hidden">Ask D5Bot a question</label>',
      '    <input id="d5bot-q" type="text" placeholder="ask something…" autocomplete="off">',
      '    <button type="submit">Send</button>',
      '  </form>',
      '  <div class="d5bot-foot">',
      '    <label for="d5bot-sound"><input type="checkbox" id="d5bot-sound"> sound on</label>',
      '    <span class="d5bot-hint">esc to close</span>',
      '  </div>',
      '</div>',
      '<button type="button" class="d5bot-btn" id="d5bot-btn" aria-expanded="false" aria-controls="d5bot-panel" aria-label="Open help assistant ' + esc(CONFIG.panelTitle) + '">',
      '  <img src="' + esc(asset('d5dog-idle-512.gif')) + '" alt="" width="76" height="76" draggable="false">',
      '</div>'
    ].join('');
    document.body.appendChild(root);

    var btn = root.querySelector('#d5bot-btn');
    var panel = root.querySelector('#d5bot-panel');
    var log = root.querySelector('#d5bot-log');
    var opts = root.querySelector('#d5bot-opts');
    var form = root.querySelector('#d5bot-form');
    var input = root.querySelector('#d5bot-q');
    var soundBox = root.querySelector('#d5bot-sound');
    var closeBtn = root.querySelector('.d5bot-close');

    soundBox.checked = soundOn;

    /* message log */
    function say(text, who) {
      var el = document.createElement('div');
      el.className = 'd5bot-msg ' + (who === 'me' ? 'd5bot-me' : 'd5bot-them');
      // text is either a CONFIG string or a RULE-authored string; escape it
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    function sayWithLink(text, link) {
      var el = say(text);
      if (link) {
        var a = document.createElement('a');
        a.href = link.href;
        a.textContent = '  ' + link.text + ' →';
        el.appendChild(a);
      }
    }

    /* actions */
    function act(kind) {
      var url = window.location.href;
      if (kind === 'contact') {
        window.location.href = mailto('D5-Interactive — enquiry', 'Hi D5i team,\n\n\n');
      } else if (kind === 'suggest') {
        window.location.href = mailto('D5-Interactive — suggestion',
          'Hi D5i team,\n\nSuggestion:\n\n\n\n(seen on: ' + url + ')\n');
      } else if (kind === 'bug') {
        window.location.href = mailto('D5-Interactive — broken page report',
          'Hi D5i team,\n\nSomething is broken:\n\n\n\nPage: ' + url + '\n');
      } else if (kind === 'handoff') {
        window.location.href = mailto('D5-Interactive — question from ' + pageName(),
          'Hi D5i team,\n\nI asked D5Bot: "' + (lastQuestion || '') + '"\n\n\n\n(seen on: ' + url + ')\n');
      }
    }

    function renderOptions(items) {
      opts.innerHTML = '';
      var seen = {};
      // Contextual options first, then the standing menu, so a reply can
      // never hide Contact / Suggestion / Report behind a one-button panel.
      var all = items.concat(DEFAULT_OPTIONS);
      all.forEach(function (it) {
        if (seen[it.label]) return;
        seen[it.label] = 1;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'd5bot-opt';
        b.textContent = it.label;
        b.addEventListener('click', function () {
          say(it.label, 'me');
          if (it.action) { act(it.action); return; }
          window.location.href = it.href;
        });
        opts.appendChild(b);
      });
    }

    function defaultOptions() { renderOptions([]); }

    var lastQuestion = '';

    function answer(raw) {
      lastQuestion = raw;
      say(raw, 'me');
      var rule = matchRule(raw);
      if (rule) {
        var text = typeof rule.say === 'function' ? rule.say() : rule.say;
        sayWithLink(text, rule.link);
        if (rule.action) {
          var labels = { contact: 'Contact us', suggest: 'Leave a suggestion', bug: 'Report a broken page' };
          renderOptions([{ label: labels[rule.action], action: rule.action }]);
        } else {
          defaultOptions();
        }
      } else {
        sayWithLink(CONFIG.fallback);
        renderOptions([{ label: 'Ask a human', action: 'handoff' }]);
      }
    }

    /* open / close */
    function open() {
      root.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (!log.childNodes.length) { say(CONFIG.openGreeting); defaultOptions(); }
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
    function close() {
      root.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus({ preventScroll: true });
    }
    function toggle() {
      if (root.classList.contains('is-open')) close(); else open();
    }

    btn.addEventListener('click', function () {
      bark();
      btn.classList.remove('is-barking');
      // restart the CSS animation
      void btn.offsetWidth;
      btn.classList.add('is-barking');
      toggle();
    });
    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) { close(); }
    });

    document.addEventListener('click', function (e) {
      if (!root.classList.contains('is-open')) return;
      if (root.contains(e.target)) return;
      root.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      input.value = '';
      answer(v);
    });

    soundBox.addEventListener('change', function () {
      soundOn = soundBox.checked;
      try { window.localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch (e) {}
    });
  }

  function init() {
    if (document.querySelector('.d5bot')) return;  // already mounted
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
