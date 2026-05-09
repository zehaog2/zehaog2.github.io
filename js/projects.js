(function () {
  let projectsList = [];
  let lastFocusedElement = null;
  let lastOpenIndex = null;
  let projectOrder = [];

  function currentLang() {
    if (typeof window !== 'undefined' && typeof window.__lang === 'string') return window.__lang;
    return 'en';
  }

  function tr(key, fallback) {
    if (window.__i18n && typeof window.__i18n.t === 'function') {
      const v = window.__i18n.t(key);
      if (v) return v;
    }
    return fallback;
  }

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

  function safePopupFilename(name) {
    if (!name || typeof name !== 'string') return null;
    const base = name.replace(/^.*[/\\]/, '').trim();
    if (!base || base === '.' || base === '..') return null;
    if (!/\.html$/i.test(base)) return null;
    return base;
  }

  function githubLinkHtml(url) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return '';
    const safeUrl = escapeHtml(url.trim());
    const label = escapeHtml(tr('modal.viewGithub', 'View on GitHub'));
    return `<a class="github-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
      ${label}
    </a>`;
  }

  function fallbackPopupBody(p) {
    const overview =
      p && p.overview != null && String(p.overview).trim()
        ? `<p class="modal-overview">${escapeHtml(String(p.overview).trim())}</p>`
        : `<p class="modal-overview">${escapeHtml(tr('modal.unavailable', 'Project details are temporarily unavailable.'))}</p>`;
    const details =
      p && Array.isArray(p.details) && p.details.length
        ? `<ul class="detail-list">${p.details
            .filter((d) => d != null && String(d).trim())
            .map((d) => `<li>${escapeHtml(String(d).trim())}</li>`)
            .join('')}</ul>`
        : '';
    const tags =
      p && Array.isArray(p.tags) && p.tags.length
        ? `<div class="modal-tags">${p.tags
            .filter((t) => t != null && String(t).trim())
            .map((t) => `<span class="modal-tag">${escapeHtml(String(t).trim())}</span>`)
            .join('')}</div>`
        : '';
    return `<div class="project-popup-content">
      <div class="modal-section">
        <div class="modal-section-label">${escapeHtml(tr('modal.overview', 'Overview'))}</div>
        ${overview}
      </div>
      ${
        details
          ? `<div class="modal-section"><div class="modal-section-label">${escapeHtml(tr('modal.highlights', 'Highlights'))}</div>${details}</div>`
          : ''
      }
      ${
        tags
          ? `<div class="modal-section"><div class="modal-section-label">${escapeHtml(tr('modal.stack', 'Stack'))}</div>${tags}</div>`
          : ''
      }
      ${githubLinkHtml(p.github)}
    </div>`;
  }

  function initBostonUhiInteractive() {
    const mapEl = document.getElementById('boston-uhi-map');
    const controls = document.getElementById('boston-uhi-controls');
    if (!mapEl || !controls || !window.L) return;
    if (mapEl.dataset.initialized === 'true') return;
    mapEl.dataset.initialized = 'true';

    const map = L.map(mapEl, {
      crs: L.CRS.Simple,
      zoomControl: true,
      attributionControl: false,
      minZoom: -1,
      maxZoom: 3,
      dragging: true,
      keyboard: false,
      boxZoom: false,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: false,
    });

    const bounds = [[0, 0], [1000, 1000]];
    const layerDefs = {
      'uhi-lst': 'project_popups/assets/boston-uhi/uhi-01-heat-gradient.png',
      'uhi-land-cover': 'project_popups/assets/boston-uhi/uhi-02-land-cover.png',
      'uhi-ndvi': 'project_popups/assets/boston-uhi/uhi-03-ndvi.png',
      'uhi-zone': 'project_popups/assets/boston-uhi/uhi-04-zone-class.png',
      'uhi-tract': 'project_popups/assets/boston-uhi/uhi-05-tract-heat.png',
    };
    const layers = {};
    Object.keys(layerDefs).forEach((id) => {
      layers[id] = L.imageOverlay(layerDefs[id], bounds, { opacity: 0.78 });
    });

    map.fitBounds(bounds, { padding: [56, 56], animate: false });
    map.setMaxBounds(bounds);

    // Keep the map frame static while zooming toward cursor position.
    mapEl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + dir));
        map.setZoomAround(map.mouseEventToContainerPoint(e), nextZoom);
      },
      { passive: false }
    );

    const contextCards = Array.from(document.querySelectorAll('#boston-uhi-context .uhi-context-card'));
    const inputs = Array.from(controls.querySelectorAll('input[type="checkbox"][data-layer]'));
    const opacityPanel = document.getElementById('boston-uhi-opacity');
    const sliderRows = opacityPanel
      ? Array.from(opacityPanel.querySelectorAll('.uhi-opacity-row[data-layer-id]'))
      : [];
    const sliders = opacityPanel
      ? Array.from(opacityPanel.querySelectorAll('input[type="range"][data-opacity-layer]'))
      : [];
    function syncContext(layerId, enabled) {
      const card = contextCards.find((n) => n.dataset.layerId === layerId);
      if (!card) return;
      card.classList.toggle('active', enabled);
    }

    function updateLayerOpacities() {
      const activeIds = inputs
        .filter((n) => n.checked)
        .map((n) => n.dataset.layer)
        .filter(Boolean);
      Object.keys(layers).forEach((id) => {
        const slider = sliders.find((s) => s.dataset.opacityLayer === id);
        const sliderOpacity = slider ? Number(slider.value) / 100 : 0.9;
        layers[id].setOpacity(sliderOpacity);
      });
      if (activeIds.length >= 1) {
        const topLayer = layers[activeIds[activeIds.length - 1]];
        if (topLayer) topLayer.bringToFront();
      }
    }

    function syncOpacityRows() {
      const activeSet = new Set(
        inputs.filter((n) => n.checked).map((n) => n.dataset.layer).filter(Boolean)
      );
      sliderRows.forEach((row) => {
        row.classList.toggle('active', activeSet.has(row.dataset.layerId));
      });
      if (opacityPanel) {
        opacityPanel.style.display = activeSet.size ? '' : 'none';
      }
    }

    inputs.forEach((input) => {
      const layerId = input.dataset.layer;
      const layer = layers[layerId];
      if (!layer) return;
      if (input.checked) {
        layer.addTo(map);
      }
      syncContext(layerId, input.checked);
      input.addEventListener('change', () => {
        const checkedCount = inputs.filter((n) => n.checked).length;
        if (checkedCount > 2) {
          input.checked = false;
          return;
        }
        if (input.checked) {
          layer.addTo(map);
        } else {
          map.removeLayer(layer);
        }
        syncContext(layerId, input.checked);
        syncOpacityRows();
        updateLayerOpacities();
      });
    });

    sliders.forEach((slider) => {
      slider.addEventListener('input', updateLayerOpacities);
    });

    syncOpacityRows();
    updateLayerOpacities();
    setTimeout(() => map.invalidateSize(), 0);
  }

  function getFocusableInModal() {
    const modal = document.getElementById('modal-content');
    if (!modal) return [];
    return Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');
  }

  function buildLocalizedPopupCandidates(popupFile) {
    const candidates = [];
    const lang = currentLang();
    if (lang === 'zh') {
      const dot = popupFile.lastIndexOf('.');
      if (dot > 0) {
        candidates.push(popupFile.slice(0, dot) + '.zh' + popupFile.slice(dot));
      }
    }
    candidates.push(popupFile);
    return candidates;
  }

  async function fetchPopupOnce(popupFile) {
    let path = 'project_popups/' + encodeURIComponent(popupFile);
    if (assetVersion) path += '?v=' + encodeURIComponent(assetVersion);
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('not ok');
    return await res.text();
  }

  async function loadPopupBodyHtml(p) {
    const popupFile = safePopupFilename(p.popupFile);
    if (!popupFile) return fallbackPopupBody(p);
    const candidates = buildLocalizedPopupCandidates(popupFile);
    for (const file of candidates) {
      try {
        return await fetchPopupOnce(file);
      } catch {
        // try next candidate
      }
    }
    return fallbackPopupBody(p);
  }

  async function fetchProjectJson(id) {
    const lang = currentLang();
    const candidates = [];
    if (lang === 'zh') candidates.push(`projects/${id}.zh.json`);
    candidates.push(`projects/${id}.json`);
    for (const path of candidates) {
      try {
        const r = await fetch(path, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch {
        // try next
      }
    }
    throw new Error(`project ${id} unavailable`);
  }

  async function openModal(index) {
    const p = projectsList[index];
    if (!p) return;

    const overlay = document.getElementById('modal-overlay');
    const labelText = p.label != null && String(p.label).trim() ? String(p.label).trim() : '';
    const statusTagText = p.statusTag != null && String(p.statusTag).trim() ? String(p.statusTag).trim() : '';
    const isPublished = p.published !== false;
    const hideModalHeading = p.id === 'boston-uhi';
    const modalHeaderClass =
      'modal-header' +
      (hideModalHeading ? ' modal-header--minimal' : '') +
      (p.id === 'lobster' ? ' modal-header--lobster' : '') +
      (p.id === 'db' ? ' modal-header--db' : '');
    const modalHeadingHtml = hideModalHeading
      ? ''
      : `
        ${labelText ? `<div class="modal-label">${escapeHtml(labelText)}</div>` : ''}
        <div class="modal-title">${escapeHtml(p.title)}</div>
        ${p.period ? `<div class="modal-period">${escapeHtml(p.period)}</div>` : ''}
        ${statusTagText ? `<span class="modal-status-tag modal-status-tag--corner">${escapeHtml(statusTagText)}</span>` : ''}
      `;

    const closeLabel = escapeHtml(tr('modal.close', 'Close project details'));

    if (!isPublished) {
      document.getElementById('modal-content').innerHTML = `
      <div class="${modalHeaderClass}">
        <button type="button" class="modal-close" onclick="closeModal()" aria-label="${closeLabel}">✕</button>
        ${modalHeadingHtml}
      </div>
      <div class="modal-body">
        ${fallbackPopupBody(p)}
      </div>
    `;

      lastOpenIndex = index;
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      return;
    }

    const popupBodyHtml = await loadPopupBodyHtml(p);

    document.getElementById('modal-content').innerHTML = `
      <div class="${modalHeaderClass}">
        <button type="button" class="modal-close" onclick="closeModal()" aria-label="${closeLabel}">✕</button>
        ${modalHeadingHtml}
      </div>
      <div class="modal-body">
        ${popupBodyHtml}
      </div>
    `;
    lastOpenIndex = index;

    if (p.id === 'boston-uhi') {
      initBostonUhiInteractive();
    }
    const modal = document.getElementById('modal-content');
    const title = modal ? modal.querySelector('.modal-title') : null;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
    if (modal) {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      if (title && title.id !== 'modal-title') title.id = 'modal-title';
      modal.setAttribute('aria-labelledby', 'modal-title');
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const focusables = getFocusableInModal();
    if (focusables.length) {
      focusables[0].focus();
    } else if (modal) {
      modal.setAttribute('tabindex', '-1');
      modal.focus();
    }
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    overlay.setAttribute('aria-hidden', 'true');
    lastOpenIndex = null;
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
  }

  function handleOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  }

  let cardListenersBound = false;

  function renderProjectCards(grid, list) {
    grid.innerHTML = list
      .map((p, i) => {
        const bgStyle = cardBackgroundStyle(p);
        const cls = cardClass(p);
        const footerRaw = p.cardFooterTag != null ? String(p.cardFooterTag).trim() : '';
        const footerHtml = footerRaw
          ? `<div class="card-tags card-tags--footer"><span class="tag">${escapeHtml(footerRaw)}</span></div>`
          : '';
        return `<div class="${cls}" data-index="${i}" role="button" tabindex="0" ${
          bgStyle ? `style="${bgStyle}"` : ''
        }>
      <div class="card-title">${escapeHtml(p.cardTitle)}</div>
      ${footerHtml}
      <div class="card-arrow">↗</div>
    </div>`;
      })
      .join('');

    if (cardListenersBound) return;
    cardListenersBound = true;

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

  function showProjectsError(grid) {
    const fileHelp =
      location.protocol === 'file:'
        ? tr(
            'projects.error.fileHelp',
            ' Opening this file directly (file://) blocks loading project data in most browsers. From the site folder run a local server, e.g. python3 -m http.server 8000, then open http://localhost:8000'
          )
        : '';
    const msg = tr('projects.error', 'Projects could not be loaded. Try refreshing the page.') + fileHelp;
    grid.innerHTML =
      '<p class="projects-error" style="color:var(--muted);font-size:13px;line-height:1.65;grid-column:1/-1;max-width:42em;">' +
      escapeHtml(msg) +
      '</p>';
  }

  async function loadAllProjects(order) {
    return Promise.all(order.map((id) => fetchProjectJson(id)));
  }

  async function initProjects() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    try {
      if (!projectOrder.length) {
        const orderRes = await fetch('projects/order.json', { cache: 'no-store' });
        if (!orderRes.ok) throw new Error('order.json');
        projectOrder = await orderRes.json();
      }
      projectsList = await loadAllProjects(projectOrder);
      renderProjectCards(grid, projectsList);
    } catch {
      showProjectsError(grid);
    }
  }

  async function rerenderProjects() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;
    try {
      if (!projectOrder.length) {
        const orderRes = await fetch('projects/order.json', { cache: 'no-store' });
        if (!orderRes.ok) throw new Error('order.json');
        projectOrder = await orderRes.json();
      }
      projectsList = await loadAllProjects(projectOrder);
      renderProjectCards(grid, projectsList);
    } catch {
      showProjectsError(grid);
      return;
    }

    const overlay = document.getElementById('modal-overlay');
    if (overlay && overlay.classList.contains('active') && lastOpenIndex != null) {
      const idx = lastOpenIndex;
      await openModal(idx);
    }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.handleOverlayClick = handleOverlayClick;
  window.rerenderProjects = rerenderProjects;

  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('modal-overlay');
    if (e.key === 'Tab' && overlay && overlay.classList.contains('active')) {
      const focusables = getFocusableInModal();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') closeModal();
  });

  initProjects();
})();
