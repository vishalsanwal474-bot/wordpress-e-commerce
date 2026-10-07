document.addEventListener('click', (e) => {
  if (e.target.closest('[data-menu]')) {
    document.querySelector('.nav')?.classList.toggle('open');
  }
  if (e.target.closest('[data-admin-menu]')) {
    document.querySelector('.admin-side')?.classList.toggle('open');
  }
  if (!e.target.closest('.search')) {
    const box = document.getElementById('searchSuggest');
    if (box) box.hidden = true;
  }
});

(function setupSearch() {
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggest');
  if (!input || !box) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const hits = await res.json();
        if (!hits.length) {
          box.hidden = true;
          return;
        }
        box.innerHTML = hits.map((h) => `
          <a href="/product/${h.slug}">
            <img src="${h.image}" alt="">
            <span><b>${h.name}</b><small>${h.brand}</small></span>
            <span>₹${Number(h.price).toLocaleString('en-IN')}</span>
          </a>
        `).join('');
        box.hidden = false;
      } catch (_) {
        box.hidden = true;
      }
    }, 180);
  });
})();
