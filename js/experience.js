(function () {
  const MOUNT_ID = 'experience-mount';
  const LIFE_ENTRIES = [];

  function escapeHtml(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }

  function renderImage(item) {
    const image = item && item.image ? String(item.image) : '';
    if (!image) {
      return '<div class="life-card-media life-card-media--placeholder">Photo coming soon</div>';
    }
    return `<img class="life-card-media" src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'life-card-media life-card-media--placeholder',textContent:'Photo coming soon'}))">`;
  }

  function renderLifeCard(item) {
    const title = escapeHtml(item && item.title ? item.title : 'Personal Moment');
    const description = escapeHtml(item && item.description ? item.description : 'Description coming soon.');
    return `<article class="life-card">
      ${renderImage(item)}
      <div class="life-card-body">
        <h3 class="life-card-title">${title}</h3>
        <p class="life-card-desc">${description}</p>
      </div>
    </article>`;
  }

  function init() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const items = LIFE_ENTRIES.slice(0, 3);
    if (!items.length) {
      mount.innerHTML =
        '<p class="exp-error">Personal life photos are not available yet.</p>';
      return;
    }

    mount.innerHTML = `<div class="life-gallery">${items.map(renderLifeCard).join('')}</div>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
