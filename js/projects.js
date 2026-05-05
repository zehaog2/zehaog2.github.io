(function () {
  let projectsList = [];

  /** Matches `?v=` on `projects.js` so card photos refresh when you bump the script version in index.html */
  const assetVersion = (function () {
    const el = document.querySelector('script[src*="projects.js"]');
    const src = el && el.getAttribute('src');
    const m = src && src.match(/[?&]v=(\d+)/);
    return m ? m[1] : '';
  })();

  function escapeHtml(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }

  /** Only the filename; strips paths so JSON cannot reference files outside Project_Background */
  function safeBackgroundFilename(name) {
    if (!name || typeof name !== 'string') return null;
    const base = name.replace(/^.*[/\\]/, '').trim();
    if (!base || base === '.' || base === '..') return null;
    return base;
  }

  /** Grid cards only; openModal never applies this (popup uses solid --surface). */
  function cardBackgroundStyle(p) {
    const file = safeBackgroundFilename(p.backgroundImage);
    if (!file) return '';
    let path = 'Project_Background/' + encodeURIComponent(file);
    if (assetVersion) path += '?v=' + encodeURIComponent(assetVersion);
    /* Single-quoted url() so outer HTML style="..." is not broken by nested double quotes */
    return `--card-bg-image:url('${path}');`;
  }

  function cardClass(p) {
    return safeBackgroundFilename(p.backgroundImage) ? 'card card-with-bg' : 'card';
  }

  function renderImagePlaceholders(count) {
    const n = Math.max(1, Number(count) || 2);
    const imgIcon =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
    const cells = Array.from(
      { length: n },
      () =>
        `<div class="img-placeholder">${imgIcon}<span>Screenshot / Chart</span></div>`
    ).join('');
    return `<div class="img-grid">${cells}</div>`;
  }

  function openModal(index) {
    const p = projectsList[index];
    if (!p) return;

    const overlay = document.getElementById('modal-overlay');
    const labelText = p.label != null && String(p.label).trim() ? String(p.label).trim() : '';
    const isPublished = p.published !== false;

    if (!isPublished) {
      const periodHtml = p.period
        ? `<div class="modal-period">${escapeHtml(p.period)}</div>`
        : '';
      const gh =
        p.github &&
        String(p.github).trim() &&
        /^https?:\/\//i.test(String(p.github).trim())
          ? `<a class="github-link" href="${escapeHtml(p.github.trim())}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>`
          : '';

      document.getElementById('modal-content').innerHTML = `
      <div class="modal-header">
        <button type="button" class="modal-close" onclick="closeModal()">✕</button>
        ${labelText ? `<div class="modal-label">${escapeHtml(labelText)}</div>` : ''}
        <div class="modal-title">${escapeHtml(p.title)}</div>
        ${periodHtml}
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <p class="modal-under-construction">Under construction</p>
          <p class="modal-overview">Case study content will appear here when this project is ready.</p>
        </div>
        ${gh}
      </div>
    `;

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      return;
    }

    const metricsHTML = (p.metrics || [])
      .map(
        (m) => `
      <div class="metric">
        <div class="metric-value">${escapeHtml(m.value)}</div>
        <div class="metric-label">${escapeHtml(m.label)}</div>
      </div>
    `
      )
      .join('');

    const imgsHTML = renderImagePlaceholders(p.images);
    const detailsHTML = (p.details || [])
      .map((d) => `<li>${escapeHtml(d)}</li>`)
      .join('');
    const tagsHTML = (p.tags || [])
      .map((t) => `<span class="modal-tag">${escapeHtml(t)}</span>`)
      .join('');

    const periodFullHtml = p.period
      ? `<div class="modal-period">${escapeHtml(p.period)}</div>`
      : '';

    document.getElementById('modal-content').innerHTML = `
      <div class="modal-header">
        <button type="button" class="modal-close" onclick="closeModal()">✕</button>
        ${labelText ? `<div class="modal-label">${escapeHtml(labelText)}</div>` : ''}
        <div class="modal-title">${escapeHtml(p.title)}</div>
        ${periodFullHtml}
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <div class="modal-section-label">Overview</div>
          <p class="modal-overview">${escapeHtml(p.overview)}</p>
        </div>
        <div class="modal-section">
          <div class="modal-section-label">Key Results</div>
          <div class="metrics">${metricsHTML}</div>
        </div>
        <div class="modal-section">
          <div class="modal-section-label">Visuals</div>
          ${imgsHTML}
        </div>
        <div class="modal-section">
          <div class="modal-section-label">Technical Highlights</div>
          <ul class="detail-list">${detailsHTML}</ul>
        </div>
        <div class="modal-section">
          <div class="modal-section-label">Stack</div>
          <div class="modal-tags">${tagsHTML}</div>
        </div>
        <a class="github-link" href="${escapeHtml(p.github)}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          View on GitHub
        </a>
      </div>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  }

  function renderProjectCards(grid, list) {
    grid.innerHTML = list
      .map((p, i) => {
        const tags = (p.cardTags || [])
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join('');
        const bgStyle = cardBackgroundStyle(p);
        const cls = cardClass(p);
        return `<div class="${cls}" data-index="${i}" role="button" tabindex="0" ${
          bgStyle ? `style="${bgStyle}"` : ''
        }>
      <div class="card-title">${escapeHtml(p.cardTitle)}</div>
      <div class="card-desc">${escapeHtml(p.cardDesc)}</div>
      <div class="card-tags">${tags}</div>
      <div class="card-arrow">↗</div>
    </div>`;
      })
      .join('');

    grid.addEventListener('click', function onGridClick(e) {
      const card = e.target.closest('.card');
      if (!card) return;
      openModal(Number(card.dataset.index));
    });

    grid.addEventListener('keydown', function onGridKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.card');
      if (!card) return;
      e.preventDefault();
      openModal(Number(card.dataset.index));
    });
  }

  async function initProjects() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    try {
      const fetchOpts = { cache: 'no-store' };
      const orderRes = await fetch('projects/order.json', fetchOpts);
      if (!orderRes.ok) throw new Error('order.json');
      const order = await orderRes.json();

      const loaded = await Promise.all(
        order.map((id) =>
          fetch(`projects/${id}.json`, fetchOpts).then((r) => {
            if (!r.ok) throw new Error(id);
            return r.json();
          })
        )
      );

      projectsList = loaded;
      renderProjectCards(grid, projectsList);
    } catch {
      const fileHelp =
        location.protocol === 'file:'
          ? ' Opening this file directly (file://) blocks loading project data in most browsers. From the site folder run a local server, e.g. python3 -m http.server 8000, then open http://localhost:8000'
          : '';
      const msg = 'Projects could not be loaded. Try refreshing the page.' + fileHelp;
      grid.innerHTML =
        '<p class="projects-error" style="color:var(--muted);font-size:13px;line-height:1.65;grid-column:1/-1;max-width:42em;">' +
        escapeHtml(msg) +
        '</p>';
    }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.handleOverlayClick = handleOverlayClick;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  initProjects();
})();
