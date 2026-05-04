document.addEventListener('DOMContentLoaded', function () {
  const track = document.querySelector('.carousel-track');
  if (!track) return;

  const items = Array.from(track.querySelectorAll('.carousel-item'));
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const openBtn = document.getElementById('open-current');
  let current = 0;

  function setActive(index) {
    index = Math.max(0, Math.min(items.length - 1, index));
    current = index;
    items.forEach((it, i) => {
      const active = i === index;
      it.classList.toggle('active', active);
      it.setAttribute('aria-selected', active ? 'true' : 'false');
      it.tabIndex = active ? 0 : -1;
    });
    const el = items[index];
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    // focus the active item so keyboard Enter activates it
    if (el) {
      try { el.focus(); } catch (err) {}
      if (openBtn) {
        openBtn.href = el.href;
        openBtn.classList.add('visible');
      }
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => setActive(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => setActive(current + 1));

  items.forEach((it, i) => {
    it.addEventListener('click', (e) => {
      // Single-click selects and opens the product (allow default anchor navigation)
      setActive(i);
      // no e.preventDefault() — clicking the anchor will navigate immediately
    });
  });

  // keyboard navigation when carousel has focus
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(current - 1); }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); }
  });

  // Global arrows also control carousel (unless focus is in an input)
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) return;
    if (e.key === 'ArrowRight') { setActive(current + 1); }
    if (e.key === 'ArrowLeft') { setActive(current - 1); }
  });

  // Basic pointer drag to scroll support
  let isDown = false, startX = 0, scrollLeft = 0;
  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    track.setPointerCapture(e.pointerId);
    startX = e.clientX;
    scrollLeft = track.scrollLeft;
    track.classList.add('dragging');
  });
  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const walk = (startX - e.clientX);
    track.scrollLeft = scrollLeft + walk;
  });
  track.addEventListener('pointerup', (e) => {
    isDown = false;
    try { track.releasePointerCapture(e.pointerId); } catch (err) {}
    track.classList.remove('dragging');
  });
  track.addEventListener('pointerleave', () => { isDown = false; track.classList.remove('dragging'); });

  // Initialize
  setActive(0);
});
