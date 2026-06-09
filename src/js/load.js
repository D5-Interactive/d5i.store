/* load.js — complete version with preview cards and modal */

function md(raw) {
  let out = '', list = 0;
  const esc = s => s
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="img-fluid mb-3" style="border:1px solid #ccc">')
    .replace(/\[video\]\((.*?)\)/g, '<div class="ratio ratio-16x9 my-2"><video controls src="$1"></video></div>')
    .replace(/\[gif\]\((.*?)\)/g, '<img src="$1" alt="GIF" class="img-fluid">')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-decoration-none fw-semibold">$1</a>')
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

function extractStaffMetadata(mdText) {
  const imgMatch = mdText.match(/!\[.*?\]\((.*?)\)/);
  const headshot = imgMatch ? imgMatch[1] : 'https://placehold.co/400x400?text=No+Image';
  const nameMatch = mdText.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : 'Staff Member';
  const roleMatch = mdText.match(/\*\*Position:\*\*\s*(.+)/);
  const role = roleMatch ? roleMatch[1].trim() : '';
  return { headshot, name, role };
}

async function loadStaffIndex(manifestPath, basePath, element) {
  try {
    const resp = await fetch(manifestPath);
    if (!resp.ok) throw new Error(`manifest ${resp.status}`);
    const files = await resp.json();
    const items = [];
    for (const f of files) {
      try {
        const r = await fetch(basePath + f);
        if (!r.ok) throw new Error(`missing ${f}`);
        const text = await r.text();
        const { headshot, name, role } = extractStaffMetadata(text);
        let memberSlug = f;
        if (memberSlug.includes('/')) memberSlug = memberSlug.split('/')[0];
        else memberSlug = memberSlug.replace(/\.md$/i, '');
        items.push({ memberSlug, name, role, headshot });
      } catch (e) { console.warn(`failed ${f}:`, e); }
    }
    element.innerHTML = `
      <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        ${items.map(item => `
          <div class="col">
            <div class="card h-100 border-0 shadow-none p-3" style="border:1px solid #000 !important; border-radius:0">
              <img src="${item.headshot}" alt="${item.name}" class="img-fluid mb-3" style="aspect-ratio:1/1; object-fit:cover; border:1px solid #ccc">
              <h3 class="h5 fw-bold">${escapeHtml(item.name)}</h3>
              ${item.role ? `<p class="small text-muted">${escapeHtml(item.role)}</p>` : ''}
              <div class="mt-3">
                <a href="STAFF.html?member=${encodeURIComponent(item.memberSlug)}" class="btn btn-sm btn-outline-dark rounded-0 w-100">View profile →</a>
              </div>
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

async function loadCards(manifestPath, basePath, element) {
  try {
    const resp = await fetch(manifestPath);
    if (!resp.ok) throw new Error(`manifest ${resp.status}`);
    const files = await resp.json();
    const items = [];
    for (const f of files) {
      try {
        const r = await fetch(basePath + f);
        if (!r.ok) throw new Error(`missing ${f}`);
        const text = await r.text();
        items.push({ file: f, html: md(text) });
      } catch (e) {
        console.warn(`failed ${f}:`, e);
        items.push({ file: f, html: `<div class="alert alert-danger p-2 small">⚠️ could not load ${f}</div>` });
      }
    }
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
    element.innerHTML = `<div class="mb-5 p-3" style="border-left:4px solid #000;">${md(text)}</div>`;
  } catch (err) {
    element.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
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
      const items = [];
      for (const f of files) {
        try {
          const fileResp = await fetch(basePath + f);
          if (!fileResp.ok) throw new Error(`missing ${basePath+f}`);
          const fullMd = await fileResp.text();
          const title = getTitle(fullMd);
          const description = getPreviewDescription(fullMd);
          items.push({
            title,
            description,
            filePath: basePath + f,
            icon: sectionIcons[section] || '📄'
          });
        } catch (e) { console.warn(`Failed ${section}/${f}:`, e); }
      }
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
              modalBody.innerHTML = md(fullMd);
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