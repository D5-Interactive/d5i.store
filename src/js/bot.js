/* bot.js — D5-DOG, the site help assistant.
   Self-contained on purpose: index.html does not load load.js, so nothing here
   may depend on it. Mounted by including:

     <script>window.D5I_BOT_BASE = '../';</script>   ('' on the root page)
     <script src="../js/bot.js"></script>            ('src/js/bot.js' at root)

   Everything a maintainer needs to change lives in CONFIG below. */

(function () {
  'use strict';

  var CONFIG = {
    email: 'd5int.sp@gmail.com',
    // d5dog.mp3 is normalised to -2 dBTP, so full volume is the intended
    // level. Drop this to ~0.5 for a more discreet bark.
    volume: 1.0,
    panelTitle: 'D5-DOG',
    openGreeting:
      "D5-DOG: Hi! I can help you find someone, or pass a message straight to the team. What do you need?",
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
      say: "Woof woof. I'm D5-DOG — a small helper that lives in the corner of this site. Try \"services\", \"products\", \"team\", or \"contact\"." },

    { re: /\b(service|services|consult|consulting|hire|hiring|work with you|freelance|contract|advisory)\b/i,
      say: "We do two things: architecture and security consulting, and full end-to-end product development. Rates are on request and we keep a limited number of slots open.",
      link: { text: 'See services', href: BASE + 'src/pages/SERVICES.html' } },

    // Signup questions must be tested before the product rule, since both
    // match on "starsec" and the visitor almost always means the event.
    // Deliberately narrow. An earlier version included a bare \bwhere\b and
    // "how do i find", which meant "where is walker caskey" and "where do I
    // find derek wei" were answered with the venue instead of reaching the
    // name lookup — the exact queries this bot exists for. Location now
    // requires a location word or an explicit "get there".
    { re: /\b(venue|venues|location|locations|address|addresses|directions?|downtown|san ?pedro|sp1|weston|campus|building|room|floor)\b|where(?:'s| is)? (?:it|that|the (?:event|competition|showcase|cyber ?con|sign ?up))\b|how (?:do|can) i get there\b|getting there\b/i,
      say: "It's at the Weston Conference Center on the UTSA Downtown Campus, in SP1 (San Pedro 1). The signup form has a Maps link so you can route to it.",
      link: { text: 'See venue and sign up', href: BASE + 'src/pages/STARSEC-SIGNUP.html' } },

    { re: /\b(sign ?up|signing|register|registration|compete|competing|competition|comp|tournament|showcase|train(ing)?|rowdy|cyber ?con|cybercon|cyber jedis|jedis|captain|operator|nov(ember)? ?6|nov(ember)? ?7|nov(ember)? ?6.?7)\b/i,
      say: "StarSec is running a cyber competition showcase at Rowdy CyberCon, November 6-7. Friday the 6th is team training and Saturday the 7th is the competition — both days are required — at the Weston Conference Center on the UTSA Downtown Campus (SP1 / San Pedro 1). The signup form is short — name, the role you want (Captain or Operator), experience level, and your details. It lands in a real inbox.",
      link: { text: 'Open the signup form', href: BASE + 'src/pages/STARSEC-SIGNUP.html' } },

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

    { re: /\b(dog|d5[\s-]?dog|woof|bark|good (boy|girl)|puppy)\b/i,
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
  var SOUND_KEY = 'd5dog-sound';
  var SOUND_KEY_LEGACY = 'd5bot-sound';
  var soundOn = true;
  try {
    var stored = window.localStorage.getItem(SOUND_KEY);
    if (stored === null) {
      // One-time carry-over from the pre-rename key, so returning visitors
      // do not silently get their sound preference reset.
      stored = window.localStorage.getItem(SOUND_KEY_LEGACY);
      if (stored !== null) {
        window.localStorage.setItem(SOUND_KEY, stored);
        window.localStorage.removeItem(SOUND_KEY_LEGACY);
      }
    }
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
    root.className = 'd5dog';
    root.innerHTML = [
      '<div class="d5dog-panel" id="d5dog-panel" role="dialog" aria-modal="false" aria-label="' + esc(CONFIG.panelTitle) + '">',
      '  <div class="d5dog-head">',
      '    <strong>' + esc(CONFIG.panelTitle) + '</strong>',
      '    <span class="d5dog-status">online</span>',
      '    <button type="button" class="d5dog-close" aria-label="Close D5-DOG">&times;</button>',
      '  </div>',
      '  <div class="d5dog-log" id="d5dog-log" aria-live="polite"></div>',
      '  <div class="d5dog-opts" id="d5dog-opts"></div>',
      '  <form class="d5dog-form" id="d5dog-form">',
      '    <label for="d5dog-q" class="visually-hidden">Ask D5-DOG a question</label>',
      '    <input id="d5dog-q" type="text" placeholder="ask something…" autocomplete="off">',
      '    <button type="submit">Send</button>',
      '  </form>',
      '  <div class="d5dog-foot">',
      '    <label for="d5dog-sound"><input type="checkbox" id="d5dog-sound"> sound on</label>',
      '    <span class="d5dog-hint">esc to close</span>',
      '  </div>',
      '</div>',
      '<button type="button" class="d5dog-btn" id="d5dog-btn" aria-expanded="false" aria-controls="d5dog-panel" aria-label="Open help assistant ' + esc(CONFIG.panelTitle) + '">',
      '  <img src="' + esc(asset('d5dog-idle-512.gif')) + '" alt="" width="76" height="76" draggable="false">',
      '</div>'
    ].join('');
    document.body.appendChild(root);

    var btn = root.querySelector('#d5dog-btn');
    var panel = root.querySelector('#d5dog-panel');
    var log = root.querySelector('#d5dog-log');
    var opts = root.querySelector('#d5dog-opts');
    var form = root.querySelector('#d5dog-form');
    var input = root.querySelector('#d5dog-q');
    var soundBox = root.querySelector('#d5dog-sound');
    var closeBtn = root.querySelector('.d5dog-close');

    soundBox.checked = soundOn;

    /* message log */
    function say(text, who) {
      var el = document.createElement('div');
      el.className = 'd5dog-msg ' + (who === 'me' ? 'd5dog-me' : 'd5dog-them');
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
          'Hi D5i team,\n\nI asked D5-DOG: "' + (lastQuestion || '') + '"\n\n\n\n(seen on: ' + url + ')\n');
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
        b.className = 'd5dog-opt';
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

    /* ── "where is X?" lookup ────────────────────────────────────
     * Runs only after the rule table has declined, so the common
     * cases still cost nothing. Internally this is three stages —
     * name/alias matching, then edit distance for typos, then a
     * ~4.8 MB on-device embedding model — and only the last one
     * costs a download. If the model can't load, this quietly
     * returns null and we fall through to the human handoff. */
    function lookup(raw) {
      var T = (typeof window !== 'undefined' ? window : globalThis).D5Tern;
      if (!T || typeof T.resolve !== 'function') return Promise.resolve(null);
      var thinking = say('…looking that up');
      thinking.classList.add('is-pending');
      return T.resolve(raw).then(function (hit) {
        thinking.remove();
        return hit;
      }, function () {
        thinking.remove();
        return null;
      });
    }

    /* A "where is X / find X / who is X" question is a lookup, so it goes
     * to the resolver before the rule table. Otherwise "where is the debug
     * tool" got the generic products blurb and "who is on the hardware
     * team" got the generic roster blurb, when a specific answer was
     * sitting in the index. Rules still get first refusal on everything
     * else, and still act as the fallback if the resolver comes up empty. */
    var LOCATOR = /\b(where|find|locate|look for|show me|who)\b/i;

    function renderRule(rule) {
      var text = typeof rule.say === 'function' ? rule.say() : rule.say;
      sayWithLink(text, rule.link);
      if (rule.action) {
        var labels = { contact: 'Contact us', suggest: 'Leave a suggestion', bug: 'Report a broken page' };
        renderOptions([{ label: labels[rule.action], action: rule.action }]);
      } else {
        defaultOptions();
      }
    }

    function renderHit(hit) {
      var link = null;
      if (hit.href) {
        var label = hit.kind === 'team' ? 'Open the staff page'
          : hit.kind === 'staff' ? 'Open their profile'
          : hit.kind === 'page' ? 'Open that page'
          : 'Open the ' + hit.kind + ' page';
        link = { text: label, href: hit.href };
      }
      sayWithLink(hit.answer, link);
      defaultOptions();
    }

    function renderFallback() {
      sayWithLink(CONFIG.fallback);
      renderOptions([{ label: 'Ask a human', action: 'handoff' }]);
    }

    function answer(raw) {
      lastQuestion = raw;
      say(raw, 'me');
      var rule = matchRule(raw);
      if (LOCATOR.test(raw)) {
        lookup(raw).then(function (hit) {
          if (hit) renderHit(hit);
          else if (rule) renderRule(rule);
          else renderFallback();
        });
      } else if (rule) {
        renderRule(rule);
      } else {
        lookup(raw).then(function (hit) {
          if (hit) renderHit(hit);
          else renderFallback();
        });
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
    if (document.querySelector('.d5dog')) return;  // already mounted
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
