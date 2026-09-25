

(function (global) {
  'use strict';

  var CFG = {

    base: (function () {
      try {
        var s = document.currentScript;
        if (s && s.src) return new URL('../../', s.src).href;
      } catch (e) {  }
      return '';
    })(),

    threshold: 0.29,

    minMargin: 0.045,
    maxResults: 3
  };

  function asset(rel) { return CFG.base + rel; }
  CFG.index = asset('src/data/search-index.json');
  CFG.engine = asset('src/bin/ternlight/tern_engine.js');
  CFG.wasm = asset('src/bin/ternlight/tern_engine_bg.wasm');

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    return norm(s).split(' ').filter(function (t) { return t.length > 1; });
  }

  function stem(w) {
    return w.length > 4 ? w.replace(/(ing|ers|ed|es|s)$/, '') : w;
  }

  var ASK = /\b(where|find|locate|show|look for|link|go|page|who is|who's|what is|whats|point me)\b/;

  var KIND_WORDS = [
    { kind: 'page',     re: /\b(sign ?up|signup|register|registration|form|page|home)\b/ },
    { kind: 'product',  re: /\b(products?|tools?|apps?|shipped|starsec|dbgc|cli)\b/ },
    { kind: 'service',  re: /\b(services?|consult|consulting|hire|hireing|work with)\b/ },
    { kind: 'blog',     re: /\b(blogs?|posts?|articles?|writings?)\b/ },
    { kind: 'research', re: /\b(research|papers?|publications?|studies)\b/ },
    { kind: 'staff',    re: /\b(staff|team|people|members?|folks?|members|who)\b/ }
  ];

  var TEAM_WORDS = {
    security: 'Security', website: 'Website', minecraft: 'Minecraft',
    hardware: 'Hardware', starsec: 'StarSec', management: 'Management',
    business: 'Business', advisor: 'Advisor'
  };

  function detectTeam(q, index) {
    var n = norm(q);
    for (var w in TEAM_WORDS) {
      if (n.indexOf(w) !== -1) return TEAM_WORDS[w];
    }

    if (index && index.entities) {
      var qTokens = tokens(q);
      for (var i = 0; i < qTokens.length; i++) {
        var t = qTokens[i];
        if (t.length < 5) continue;
        for (var name in TEAM_WORDS) {
          if (Math.abs(name.length - t.length) > 2) continue;
          if (lev(t, name, 2) <= 2) {
            var exists = index.entities.some(function (e) {
              return e.k === 'staff' && (e.tm || []).indexOf(TEAM_WORDS[name]) !== -1;
            });
            if (exists) return TEAM_WORDS[name];
          }
        }
      }
    }
    return null;
  }

  function detectKind(q) {
    var n = ' ' + norm(q) + ' ';
    for (var i = 0; i < KIND_WORDS.length; i++) {
      if (KIND_WORDS[i].re.test(n)) return KIND_WORDS[i].kind;
    }
    return null;
  }

  function personScore(qTokens, e) {
    if (e.k !== 'staff') return 0;
    var best = 0;
    var names = tokens(e.t);
    var all = (e.pa || []).map(norm);

    var qn = qTokens.join(' ');
    if (names.length > 1 && (' ' + qn + ' ').indexOf(' ' + names.join(' ') + ' ') !== -1) return 1;
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      if (a.length < 3) continue;
      for (var j = 0; j < qTokens.length; j++) {
        var qt = qTokens[j];
        if (qt === a) { best = Math.max(best, 0.95); continue; }
        if (a.length >= 4 && qt.length >= 3 &&
            (a.indexOf(qt) === 0 || qt.indexOf(a) === 0)) {
          best = Math.max(best, 0.8);
        }
      }
    }
    return best;
  }

  var STOP = {
    where: 1, is: 1, are: 1, am: 1, be: 1, the: 1, a: 1, an: 1, of: 1, to: 1,
    for: 1, on: 1, in: 1, at: 1, do: 1, does: 1, did: 1, i: 1, me: 1, my: 1,
    you: 1, your: 1, we: 1, us: 1, can: 1, could: 1, would: 1, should: 1,
    find: 1, show: 1, look: 1, see: 1, get: 1, go: 1, want: 1, need: 1,
    what: 1, whats: 1, who: 1, whos: 1, which: 1, any: 1, some: 1, there: 1,
    page: 1, link: 1, stuff: 1, thing: 1, things: 1, want: 1, please: 1
  };

  function contentTokens(toks) {
    return toks.filter(function (t) { return t.length > 2 && !STOP[t]; });
  }

  function titleScore(qn, e) {
    var t = norm(e.t);
    if (!t) return 0;
    if (qn.indexOf(t) !== -1) return 1;

    var qt = qTokensOf(qn);
    var et = tokens(e.t);
    if (!et.length) return 0;

    var hay = ' ' + norm(e.t + ' ' + (e.al || []).join(' ')) + ' ';
    var hayTokens = {};
    qTokensOf(hay.replace(/ /g, ' ')).forEach(function (x) { hayTokens[x] = 1; hayTokens[stem(x)] = 1; });

    var titleHit = 0;
    et.forEach(function (w) {
      var s = stem(w);
      for (var i = 0; i < qt.length; i++) {
        if (qt[i] === w || stem(qt[i]) === s) { titleHit++; return; }
      }
    });
    var titleCov = titleHit / et.length;

    var content = contentTokens(qt);
    var contentHit = 0;
    content.forEach(function (w) {
      if (hayTokens[w] || hayTokens[stem(w)]) contentHit++;
    });
    var queryCov = content.length ? contentHit / content.length : 0;

    if (content.length && queryCov >= 0.99) return 0.92;
    return Math.max(titleCov, queryCov * 0.85);
  }

  var qTokensOf = function (qn) { return qn.split(' ').filter(Boolean); };

  function lexicalAnswer(query, index) {
    var qn = norm(query);
    var qTokens = tokens(query);
    if (!qTokens.length) return null;

    var kind = detectKind(query);
    var team = detectTeam(query, index);
    var isPersonQuery = /\b(who|whose|person|anyone|somebody|guy|person)\b/.test(qn) || !kind;

    var scored = index.entities.map(function (e) {
      var s = 0;
      if (e.k === 'staff') {
        s = personScore(qTokens, e);
      } else {
        s = titleScore(qn, e);
        if (s > 0 && e.al) {
          for (var i = 0; i < e.al.length; i++) {
            var a = norm(e.al[i]);
            if (a.length > 2 && qn.indexOf(a) !== -1) s = Math.max(s, 0.9);
          }
        }
      }

      if (s > 0 && kind && e.k === kind) s += 0.05;
      if (s > 0 && isPersonQuery && e.k === 'staff') s += 0.05;
      return { e: e, s: s };
    }).filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; });

    if (scored.length && scored[0].s >= 0.8) {
      return {
        kind: scored[0].e.k, title: scored[0].e.t, href: scored[0].e.h,
        answer: scored[0].e.a, score: scored[0].s, how: 'lexical'
      };
    }

    if (team) {
      var members = index.entities.filter(function (e) {
        return e.k === 'staff' && (e.tm || []).indexOf(team) !== -1;
      });
      var namesAPerson = members.some(function (e) { return personScore(qTokens, e) >= 0.8; });
      if (members.length && !namesAPerson) {
        return {
          kind: 'team',
          title: team,
          team: team,
          members: members,
          score: 0.9,
          href: 'src/pages/STAFF.html',
          answer: members.length + ' people are on ' + team + ': ' +
            members.map(function (m) { return m.t; }).join(', ') + '.',
        };
      }
    }

    if (!scored.length) {

      var none = fuzzyAnswer(qTokens, index);
      if (none) return none;
      return null;
    }
    var top = scored[0];

    var fz = fuzzyAnswer(qTokens, index);
    if (fz) return fz;
    return { ambiguous: true, best: top.s, candidates: scored.slice(0, CFG.maxResults) };
  }

  function lev(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = new Array(b.length + 1), cur = new Array(b.length + 1), i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      var best = cur[0];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      var t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }

  function fuzzyAnswer(qTokens, index) {
    if (!qTokens.length) return null;

    if (!contentTokens(qTokens).length) return null;
    var budget = qTokens.length <= 2 ? 2 : 1;
    var best = null;
    for (var i = 0; i < index.entities.length; i++) {
      var e = index.entities[i];
      if (e.k !== 'staff' && e.k !== 'product' && e.k !== 'service' &&
          e.k !== 'page' && e.k !== 'blog' && e.k !== 'research') continue;
      var cands = [norm(e.t)].concat(e.pa || []);
      for (var c = 0; c < cands.length; c++) {
        var target = norm(cands[c]);
        if (!target) continue;
        var parts = target.split(' ');

        for (var p = 0; p < parts.length; p++) {
          if (parts[p].length < 4) continue;
          for (var q = 0; q < qTokens.length; q++) {
            if (qTokens[q].length < 4) continue;
            var d = lev(qTokens[q], parts[p], budget);
            if (d <= budget) {
              var conf = 1 - (d / (budget + 1)) * 0.25;
              if (!best || conf > best.conf) {
                best = { e: e, conf: conf, d: d, matched: parts[p] };
              }
            }
          }
        }
      }
    }
    if (!best) return null;
    return {
      kind: best.e.k, title: best.e.t, href: best.e.h, answer: best.e.a,
      score: 0.78, how: 'fuzzy',
      note: 'closest match for "' + best.matched + '"'
    };
  }

  var enginePromise = null;
  var indexPromise = null;

  function loadEngine() {
    if (enginePromise) return enginePromise;
    enginePromise = (function () {
      if (!global.WebAssembly) return Promise.reject(new Error('no WebAssembly'));

      return import( new URL(CFG.engine, location.href).href).then(function (mod) {
        var init = mod.default || mod.init;

        return Promise.resolve(init({ module_or_path: new URL(CFG.wasm, location.href).href })).then(function () {
          return mod;
        });
      });
    })();
    return enginePromise;
  }

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(CFG.index).then(function (r) {
      if (!r.ok) throw new Error('index ' + r.status);
      return r.json();
    });
    return indexPromise;
  }

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function semanticAnswer(query, index) {
    return Promise.all([loadEngine(), loadIndex()]).then(function (res) {
      var mod = res[0];
      var idx = res[1];
      if (!idx || !idx.vectors || !idx.vectors.length) return null;
      if (mod.embed && idx.dim && idx.vectors[0].length !== idx.dim) return null;

      var qv = mod.embed(query);
      var kind = detectKind(query);

      var ranked = idx.entities.map(function (e, i) {
        var s = dot(qv, Float32Array.from(idx.vectors[i]));
        if (kind && e.k === kind) s += 0.08;
        return { e: e, s: s };
      }).sort(function (a, b) { return b.s - a.s; });

      if (!ranked.length) return null;
      var top = ranked[0];
      var second = ranked[1];

      if (top.s < CFG.threshold) return null;
      if (second && (top.s - second.s) < CFG.minMargin) return null;

      return {
        kind: top.e.k, title: top.e.t, href: top.e.h, answer: top.e.a,
        score: top.s, how: 'semantic'
      };
    }).catch(function () {
      return null;
    });
  }

  function resolve(query) {
    return loadIndex().then(function (index) {
      var lex = lexicalAnswer(query, index);
      if (lex && lex.kind === 'team') return lex;
      if (lex && !lex.ambiguous) return lex;
      return semanticAnswer(query, index);
    }).catch(function () { return null; });
  }

  function configure(opts) {
    for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) CFG[k] = opts[k];
    if (opts.base) {
      CFG.index = asset('src/data/search-index.json');
      CFG.engine = asset('src/bin/ternlight/tern_engine.js');
      CFG.wasm = asset('src/bin/ternlight/tern_engine_bg.wasm');
    }
  }

  global.D5Tern = {
    resolve: resolve,
    configure: configure,
    config: CFG,
    _lexicalAnswer: lexicalAnswer,
    _personScore: personScore,
    _fuzzyAnswer: fuzzyAnswer,
    _detectKind: detectKind,
    _detectTeam: detectTeam,
    _norm: norm
  };
})(typeof window !== 'undefined' ? window : globalThis);
