#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { embed, engineInfo } from '@ternlight/mini';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = '@ternlight/mini';const PAGES = [
  { slug: 'index.html',            href: 'index.html',                   title: 'Home',                blurb: 'Landing page for D5-Interactive, the developer and hacker collective.' },
  { slug: 'STAFF',                 href: 'src/pages/STAFF.html',         title: 'Staff',               blurb: 'The team roster. Everyone at D5-Interactive, grouped by team: security, hardware, website, Minecraft and StarSec. Individual staff profiles and bios live here.' },
  { slug: 'SERVICES',              href: 'src/pages/SERVICES.html',      title: 'Services',            blurb: 'Consulting and development. Architecture review, technical due diligence, DevSecOps mentorship, full-stack development, API design and CI/CD.' },
  { slug: 'PRODUCTS',              href: 'src/pages/PRODUCTS.html',      title: 'Products',            blurb: 'Tools we build and ship: StarSec, the 3D simulated cyber warfare range, and DBGC, the Debug Commander debugging tool.' },
  { slug: 'STARSEC-SIGNUP',        href: 'src/pages/STARSEC-SIGNUP.html',title: 'StarSec Signup',      blurb: 'Sign up to compete in the StarSec cyber competition showcase at Rowdy CyberCon, November 6-7 2026. Team training is Friday November 6 and the competition is Saturday November 7, both required, at SP1 San Pedro 1 in the Weston Conference Center on the UTSA Downtown Campus. Captain or Operator role signup form.' },
];
function manifest(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}
function field(md, key) {
  const m = md.match(new RegExp('^\\*\\*' + key + ':\\*\\*\\s*(.+)$', 'm'));
  return m ? m[1].trim() : '';
}

function sectionOf(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

const entities = [];for (const entry of manifest('src/staff/manifest.json')) {
  const member = entry.split('/')[0];
  if (member.startsWith('_')) continue;
  const p = join(ROOT, 'src/staff', entry);
  if (!existsSync(p)) continue;
  const md = readFileSync(p, 'utf8');
  const name = sectionOf(md);
  const position = field(md, 'Position');
  const teams = field(md, 'Teams');
  const skills = field(md, 'Skills / Focus');
  const nickname = field(md, 'Nickname');
  const github = field(md, 'GitHub');
  const uni = field(md, 'University');

  const bits = [name];
  if (nickname) bits.push('"' + nickname + '"');
  if (position) bits.push(position);
  if (teams) bits.push('teams: ' + teams.split(',').map(t => t.trim()).join(', '));
  if (skills) bits.push(skills);
  if (uni) bits.push(uni);

  const teamList = teams ? teams.split(',').map(t => t.trim()).filter(Boolean) : [];
  entities.push({
    kind: 'staff',
    title: name,
    aliases: [nickname, github, ...name.split(/\s+/), ...teamList]
      .filter(Boolean).map(s => String(s).toLowerCase()),

    personAliases: [nickname, github, ...name.split(/\s+/)]
      .filter(Boolean).map(s => String(s).toLowerCase()),
    teams: teamList,
    href: 'src/pages/STAFF.html?member=' + encodeURIComponent(member),
    answer: 'Find ' + name + ' on the staff page' + (position ? ': ' + position : '') + '.',
    text: bits.join('. '),
  });

  const SECTION_KIND = { blogs: 'blog', products: 'product', research: 'research' };
  for (const [section, label] of [['blogs', 'blog post'], ['products', 'product'], ['research', 'research paper']]) {
    for (const file of manifest(`src/staff/${member}/${section}/manifest.json`)) {
      const mp = join(ROOT, 'src/staff', member, section, file);
      if (!existsSync(mp)) continue;
      const body = readFileSync(mp, 'utf8');
      const title = sectionOf(body);
      const extra = [field(body, 'Date'), field(body, 'Published'), field(body, 'Venue'), field(body, 'Status'), field(body, 'Version')].filter(Boolean).join(', ');
      const blurb = (body.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('**') && !l.startsWith('- ')) || '');
      entities.push({
        kind: SECTION_KIND[section],
        title: title,
        aliases: [title.split(/\s+/)[0], member.replace(/_/g, ' '), SECTION_KIND[section]]
          .filter(Boolean).map(s => String(s).toLowerCase()),
        href: 'src/pages/STAFF.html?member=' + encodeURIComponent(member),
        answer: name + (position ? ' (' + position + ')' : '') + ' wrote "' + title + '", a ' + label + ' on their staff profile.',
        text: [title, label + ' by ' + name, extra, blurb].filter(Boolean).join('. '),
      });
    }
  }
}for (const [dir, kind, verb] of [
  ['src/products', 'product', 'ship'],
  ['src/services', 'service', 'offer'],
]) {
  for (const entry of manifest(`${dir}/manifest.json`)) {
    const p = join(ROOT, dir, entry);
    if (!existsSync(p)) continue;
    const md = readFileSync(p, 'utf8');
    const title = sectionOf(md);
    const meta = ['Status', 'Version', 'License', 'Type', 'Rate', 'Availability', 'Stack']
      .map(k => field(md, k)).filter(Boolean).join(', ');
    const blurb = (md.split('\n').map(l => l.trim())
      .find(l => l && !l.startsWith('#') && !l.startsWith('![') && !l.startsWith('**') && !l.startsWith('- ')) || '');
    const bullets = md.split('\n').filter(l => l.trim().startsWith('- '))
      .map(l => l.replace(/^-\s*|\*\*/g, '').replace(/\[|\]\(.*?\)/g, '')).slice(0, 4).join(', ');
    entities.push({
      kind: kind,
      title: title,
      aliases: [title, kind].map(s => String(s).toLowerCase()),
      href: 'src/pages/' + (kind === 'product' ? 'PRODUCTS' : 'SERVICES') + '.html',
      answer: title + ' is a ' + kind + ' we ' + verb + '. Find it on the ' + (kind === 'product' ? 'Products' : 'Services') + ' page.',
      text: [title + ', ' + kind, meta, blurb, bullets].filter(Boolean).join('. '),
    });
  }
}for (const pg of PAGES) {
  entities.push({
    kind: 'page',
    title: pg.title,
    aliases: [pg.title, pg.slug].map(s => String(s).toLowerCase()),
    href: pg.href,
    answer: 'The ' + pg.title + ' page.',
    text: pg.title + '. ' + pg.blurb,
  });
}
function embedText(t) {
  return String(t).slice(0, 400);
}

let dim = 0;
const vectors = entities.map(e => {
  const v = embed(embedText(e.text));
  dim = v.length;
  return Array.from(v, x => Math.round(x * 10000) / 10000);
});

const out = {
  model: MODEL,
  engine: engineInfo(),
  dim: dim,
  count: entities.length,

  entities: entities.map(e => ({
    k: e.kind, t: e.title, h: e.href, a: e.answer, al: e.aliases,

    ...(e.personAliases ? { pa: e.personAliases } : {}),
    ...(e.teams ? { tm: e.teams } : {}),
  })),
  vectors: vectors,
};

const dest = join(ROOT, 'src/data/search-index.json');
writeFileSync(dest, JSON.stringify(out));
const kb = (readFileSync(dest).length / 1024).toFixed(1);
console.log(`wrote ${dest}`);
console.log(`  model   ${MODEL}`);
console.log(`  engine  ${out.engine}`);
console.log(`  dim     ${dim}`);
console.log(`  records ${out.count}  (${kb} KB)`);
const byKind = {};
for (const e of entities) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
console.log('  by kind ' + JSON.stringify(byKind));
