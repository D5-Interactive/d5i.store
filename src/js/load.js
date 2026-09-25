/* load.js — complete version with preview cards and modal */

/* Resolve a path found in a markdown file against that file's own URL, so
   `bin/headshot.jpg` inside src/staff/Jane/Jane.md renders correctly even
   though the page injecting it lives in a different directory. */
function resolveAsset(path, baseUrl) {
  if (!path || !baseUrl) return path;
  try { return new URL(path, baseUrl).href; } catch (e) { return path; }
}

function md(raw, baseUrl) {
  let out = '', list = 0;
  const esc = s => s
    .replace(/!\[(.*?)\]\((.*?)\)/g, (m, alt, src) => `<img src="${resolveAsset(src, baseUrl)}" alt="${alt}" class="img-fluid mb-3" style="border:1px solid #ccc" onerror="this.onerror=null;this.src=initialsAvatar(this.alt)">`)
    .replace(/\[video\]\((.*?)\)/g, (m, src) => `<div class="ratio ratio-16x9 my-2"><video controls src="${resolveAsset(src, baseUrl)}"></video></div>`)
    .replace(/\[gif\]\((.*?)\)/g, (m, src) => `<img src="${resolveAsset(src, baseUrl)}" alt="GIF" class="img-fluid">`)
    .replace(/\[(.+?)\]\((.+?)\)/g, (m, label, href) => `<a href="${href}" class="text-decoration-none fw-semibold">${label}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  for (const line of raw.trim().split('\n')) {
    const t = line.trim();
    if (!t) {
      if (list) { out += '</ul>'; list = 0; }
      continue;
    }
    const s = esc(t);
    if (/^#{1,4} /.test(t)) {
      if (list) { out += '</ul>'; list = 0; }
      const level = Math.min(t.match(/^#+/)[0].length, 4);
      const tag = `h${level + 1}`;
      out += `<${tag} class="fw-bold">${s.replace(/^#+ /, '')}</${tag}>`;
    } else if (t.startsWith('- ')) {
      if (!list) { out += '<ul class="ps-3 mb-2">'; list = 1; }
      out += `<li class="mb-1">${s.slice(2)}</li>`;
    } else {
      if (list) { out += '</ul>'; list = 0; }
      out += `<p class="mb-2">${s}</p>`;
    }
  }
  if (list) out += '</ul>';
  return out;
}

/* ── Initials avatar ──────────────────────────────────────────────────
   Drawn locally as an inline SVG so a member without a headshot never
   costs a third-party image request. Shade is derived from the name so
   the grid reads as varied rather than a wall of identical grey. */
function initialsOf(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function initialsAvatar(name, size) {
  const initials = initialsOf(name);
  let hash = 0;
  for (const ch of String(name)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  const bg = `hsl(${hash} 28% 82%)`;
  const fg = `hsl(${hash} 45% 22%)`;
  const px = size || 400;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">`
    + `<rect width="100" height="100" fill="${bg}"/>`
    + `<text x="50" y="50" fill="${fg}" font-family="Courier New,Courier,monospace" `
    + `font-size="38" font-weight="700" text-anchor="middle" dominant-baseline="central">`
    + `${initials}</text></svg>`;
  // Apostrophes survive encodeURIComponent, which would break the inline
  // onerror handlers that embed this string in a quoted attribute.
  return 'data:image/svg+xml;charset=utf-8,'
    + encodeURIComponent(svg).replace(/'/g, '%27');
}

function extractStaffMetadata(mdText, mdUrl) {
  const nameMatch = mdText.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : 'Staff Member';
  const imgMatch = mdText.match(/!\[.*?\]\((.*?)\)/);
  const headshot = imgMatch ? resolveAsset(imgMatch[1], mdUrl) : '';
  const roleMatch = mdText.match(/\*\*Position:\*\*\s*(.+)/);
  const teamsMatch = mdText.match(/\*\*Teams:\*\*\s*(.+)/);
  // Cards lead with Position, falling back to the member's team list.
  const role = (roleMatch ? roleMatch[1].trim() : '') || (teamsMatch ? teamsMatch[1].trim() : '');
  const teams = teamsMatch
    ? teamsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];
  return { headshot, name, role, teams, initials: initialsAvatar(name) };
}

/* "Walker_Caskey" -> "Walker Caskey". The manifest already names every
   member folder, so the grid can be drawn from that alone before a single
   markdown file is fetched. */
function nameFromSlug(slug) {
  return String(slug).replace(/_/g, ' ').trim();
}

async function loadStaffIndex(manifestPath, basePath, element) {
  try {
    const resp = await fetch(manifestPath);
    if (!resp.ok) throw new Error(`manifest ${resp.status}`);
    const files = await resp.json();

    const paint = (items) => {
      element.innerHTML = `
      <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
        ${items.map(item => `
          <div class="col">
            <a href="STAFF.html?member=${encodeURIComponent(item.memberSlug)}" class="staff-card${item.pending ? ' is-pending' : ''}">
              <img src="${item.initials ? escapeHtml(item.headshot || item.initials) : ''}"
                   alt="${escapeHtml(item.name)}"
                   class="staff-card-img"
                   ${item.headshot ? `onerror="this.onerror=null;this.src='${item.initials}'"` : ''}
                   loading="lazy">
              <div class="staff-card-body">
                <h3 class="staff-card-name">${escapeHtml(item.name)}</h3>
                ${item.teams && item.teams.length
                  ? `<div class="staff-card-tags">${item.teams.map(t => `<span class="d5tag">${escapeHtml(t)}</span>`).join('')}</div>`
                  : (item.role ? `<p class="staff-card-role">${escapeHtml(item.role)}</p>` : '')}
              </div>
            </a>
          </div>
        `).join('')}
      </div>
    `;
      const countEl = element.closest('.container')?.querySelector('.page-count');
      if (countEl) countEl.textContent = `${items.length} entries`;
    };

    /* First paint, immediately, from the manifest alone. Under a normal
       connection this puts names on screen in about a tenth of a second
       instead of leaving a blank "loading..." for the best part of a second
       while 24 files come back. */
    paint(files.map(f => {
      const memberSlug = f.includes('/') ? f.split('/')[0] : f.replace(/\.md$/i, '');
      const name = nameFromSlug(memberSlug);
      return { memberSlug, name, pending: true };
    }));

    /* Second paint, once the real metadata has arrived. Fetched in parallel:
       sequentially it was 24 round trips, which cost ~3.5s on a normal
       connection — nearly all latency, not payload. */
    const results = await Promise.all(files.map(async (f) => {
      try {
        const r = await fetch(basePath + f);
        if (!r.ok) throw new Error(`missing ${f}`);
        const text = await r.text();
        const { headshot, name, role, teams, initials } = extractStaffMetadata(text, r.url);
        let memberSlug = f;
        if (memberSlug.includes('/')) memberSlug = memberSlug.split('/')[0];
        else memberSlug = memberSlug.replace(/\.md$/i, '');
        return { memberSlug, name, role, teams, headshot, initials };
      } catch (e) { console.warn(`failed ${f}:`, e); return null; }
    }));
    paint(results.filter(Boolean));
  } catch (err) {
    element.innerHTML = `<div class="alert alert-danger p-3">✗ failed to load: ${err.message}</div>`;
    console.error(err);
  }
}

async function loadCards(manifestPath, basePath, element) {
  try {
    const resp = await fetch(manifestPath);
    if (!resp.ok) throw new Error(`manifest ${resp.status}`);
    const files = await resp.json();
    /* Parallel, for the same reason as loadStaffIndex. */
    const results = await Promise.all(files.map(async (f) => {
      try {
        const r = await fetch(basePath + f);
        if (!r.ok) throw new Error(`missing ${f}`);
        const text = await r.text();
        return { file: f, html: md(text, r.url) };
      } catch (e) {
        console.warn(`failed ${f}:`, e);
        return { file: f, html: `<div class="alert alert-danger p-2 small">⚠️ could not load ${f}</div>` };
      }
    }));
    const items = results;
    element.innerHTML = `
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        ${items.map(item => `
          <div class="col">
            <div class="card h-100 border-0 shadow-none p-3" style="border:1px solid #000 !important; border-radius:0">
              ${item.html}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    const countEl = element.closest('.container')?.querySelector('.page-count');
    if (countEl) countEl.textContent = `${items.length} entries`;
  } catch (err) {
    element.innerHTML = `<div class="alert alert-danger p-3">✗ failed to load: ${err.message}</div>`;
    console.error(err);
  }
}

async function loadSingleStaffMember(basePath, memberFolder, element) {
  const mdPath = `${basePath}${memberFolder}/${memberFolder}.md`;
  try {
    const resp = await fetch(mdPath);
    if (!resp.ok) throw new Error(`Staff file not found: ${mdPath}`);
    const text = await resp.text();
    element.innerHTML = `<div class="mb-5 p-3 staff-bio" style="border-left:4px solid #000;">${md(text, resp.url)}</div>`;
  } catch (err) {
    element.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return '&#39;';
  });
}

function getTitle(mdText) {
  const match = mdText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function getPreviewDescription(mdText, maxLength = 120) {
  let plain = mdText.replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*\n/gm, '')
    .trim();
  if (plain.length > maxLength) plain = plain.slice(0, maxLength) + '…';
  return plain || 'No description';
}

const sectionIcons = { products: '📦', blogs: '📝', research: '🔬' };

async function loadStaffModularContent(memberFolder, element) {
  const sections = ['products', 'blogs', 'research'];
  let html = '';
  for (const section of sections) {
    const manifestPath = `../staff/${memberFolder}/${section}/manifest.json`;
    const basePath = `../staff/${memberFolder}/${section}/`;
    try {
      const resp = await fetch(manifestPath);
      if (!resp.ok) continue;
      const files = await resp.json();
      if (!files.length) continue;
      const items = (await Promise.all(files.map(async (f) => {
        try {
          const fileResp = await fetch(basePath + f);
          if (!fileResp.ok) throw new Error(`missing ${basePath+f}`);
          const fullMd = await fileResp.text();
          return {
            title: getTitle(fullMd),
            description: getPreviewDescription(fullMd),
            filePath: basePath + f,
            icon: sectionIcons[section] || '📄'
          };
        } catch (e) { console.warn(`Failed ${section}/${f}:`, e); return null; }
      }))).filter(Boolean);
      if (items.length) {
        html += `<div class="mt-5 pt-3 border-top"><h3 class="text-uppercase small fw-bold mb-3">${section}</h3>`;
        html += `<div class="row row-cols-1 row-cols-md-2 g-4">`;
        items.forEach(item => {
          html += `
            <div class="col">
              <div class="card preview-card border border-dark rounded-0 h-100" data-filepath="${escapeHtml(item.filePath)}" style="cursor:pointer;">
                <div class="card-body">
                  <div class="d-flex align-items-center mb-2">
                    <span class="fs-3 me-2">${item.icon}</span>
                    <h5 class="card-title fw-bold mb-0">${escapeHtml(item.title)}</h5>
                  </div>
                  <p class="card-text small text-muted">${escapeHtml(item.description)}</p>
                </div>
              </div>
            </div>
          `;
        });
        html += `</div></div>`;
      }
    } catch (e) { console.log(`No ${section} for ${memberFolder}`); }
  }
  if (html) {
    element.insertAdjacentHTML('beforeend', html);
    // Attach modal click handlers
    document.querySelectorAll('.preview-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const filePath = card.getAttribute('data-filepath');
        if (filePath) {
          try {
            const resp = await fetch(filePath);
            if (!resp.ok) throw new Error('Failed to load');
            const fullMd = await resp.text();
            const modalBody = document.getElementById('mdModalBody');
            if (modalBody) {
              modalBody.innerHTML = md(fullMd, resp.url);
              const modalTitle = document.getElementById('mdModalLabel');
              if (modalTitle) modalTitle.innerText = getTitle(fullMd);
              const modal = new bootstrap.Modal(document.getElementById('mdModal'));
              modal.show();
            }
          } catch (err) {
            console.error('Modal error:', err);
            alert('Could not load content.');
          }
        }
      });
    });
  } else {
    element.insertAdjacentHTML('beforeend', '<p class="text-muted mt-4">No products, blogs, or research added yet.</p>');
  }
}

async function loadStaffDetail(memberFolder, element) {
  element.innerHTML = '<div class="text-center p-5">Loading staff profile...</div>';
  await loadSingleStaffMember('../staff/', memberFolder, element);
  await loadStaffModularContent(memberFolder, element);
}