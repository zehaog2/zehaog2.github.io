(function () {
  const MOUNT_ID = 'experience-mount';

  function escapeHtml(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** Calendar year used for grouping & connector color (end date; ongoing → start year fallback). */
  function endYearEntry(entry) {
    const end = parseDate(entry.end);
    if (end) return end.getFullYear();
    const start = parseDate(entry.start);
    if (start) return start.getFullYear();
    return new Date().getFullYear();
  }

  /** Distinct hue per year for spine + connectors. */
  function yearHue(year) {
    const palette = [43, 162, 205, 278, 318, 148, 28, 198, 92, 305, 18, 232];
    return palette[Math.abs(year) % palette.length];
  }

  function assetVersion() {
    const el = document.querySelector('script[src*="experience.js"]');
    const src = el && el.getAttribute('src');
    const m = src && src.match(/[?&]v=(\d+)/);
    return m ? m[1] : '';
  }

  function jsonUrl() {
    let path = 'experience.json';
    const v = assetVersion();
    if (v) path += '?v=' + encodeURIComponent(v);
    return path;
  }

  function renderDivider(label) {
    return `<div class="exp-divider exp-divider--jobs" role="presentation" aria-hidden="true">
      <span class="exp-divider-line"></span>
      <span class="exp-divider-label">${escapeHtml(label)}</span>
      <span class="exp-divider-line"></span>
    </div>`;
  }

  function renderChipBody(entry, extraClass) {
    const id = escapeHtml(entry.id);
    const title = escapeHtml(entry.title);
    const org = escapeHtml(entry.org);
    const range = escapeHtml(entry.rangeDisplay || '');
    const detailRaw = entry.detail != null ? String(entry.detail) : '';
    const detail = escapeHtml(detailRaw).replace(/\n/g, '<br>');
    const edu = entry.education ? '<span class="exp-chip-kind">Education</span>' : '';

    return `<button type="button" class="exp-chip${extraClass ? ' ' + extraClass : ''}" aria-expanded="false" aria-controls="exp-detail-${id}" id="exp-trigger-${id}">
      <span class="visually-hidden">${range}. </span>
      ${edu}
      <span class="exp-chip-title">${title}</span>
      <span class="exp-chip-org">${org}</span>
      <span class="exp-chip-hint" aria-hidden="true">···</span>
    </button>
    <div class="exp-detail" id="exp-detail-${id}" role="region" aria-labelledby="exp-trigger-${id}">
      <p class="exp-detail-range">${range}</p>
      <div class="exp-detail-text">${detail}</div>
    </div>`;
  }

  function renderEducationEntry(entry) {
    const id = escapeHtml(entry.id);
    return `<div class="exp-entry exp-entry--education-only" data-exp-id="${id}">
      <div class="exp-entry__body">${renderChipBody(entry, '')}</div>
    </div>`;
  }

  /** Horizontal connector (end-year color) + chip. */
  function renderJobRow(entry, yearNum) {
    const id = escapeHtml(entry.id);
    const h = yearHue(yearNum);
    const connectorStyle = `background: hsl(${h}, 52%, 52%); box-shadow: 0 0 12px hsla(${h}, 70%, 55%, 0.35);`;

    return `<div class="exp-job-row" data-exp-id="${id}" data-end-year="${yearNum}">
      <div class="exp-job-connector" style="${connectorStyle}" aria-hidden="true"></div>
      <div class="exp-job-body exp-entry" data-exp-id="${id}">
        ${renderChipBody(entry, '')}
      </div>
    </div>`;
  }

  function renderSpineSegment(year, flexWeight) {
    const h = yearHue(year);
    const bg = `hsla(${h}, 44%, 22%, 0.92)`;
    const fg = `hsla(${h}, 72%, 88%, 1)`;
    const border = `hsla(${h}, 58%, 46%, 0.95)`;

    return `<div class="exp-spine-segment" style="flex: ${flexWeight} 1 auto; background: ${bg}; border-right: 3px solid ${border};">
      <span class="exp-spine-year-text" style="color: ${fg}">${year}</span>
    </div>`;
  }

  function renderSpineDividerSpacer() {
    return `<div class="exp-spine-row exp-spine-row--divider-spacer" aria-hidden="true"></div>`;
  }

  /**
   * Jobs only; chunks consecutive entries with same end year (JSON order).
   * Dividers preserved in sequence.
   */
  function buildJobSegments(ordered) {
    const segments = [];
    let i = 0;

    while (i < ordered.length) {
      const e = ordered[i];
      if (e.education) {
        i++;
        continue;
      }

      if (e.divider) {
        segments.push({ divider: true, label: e.label || '' });
        i++;
        continue;
      }

      const y = endYearEntry(e);
      const chunk = [];
      while (i < ordered.length) {
        const cur = ordered[i];
        if (cur.education) {
          i++;
          continue;
        }
        if (cur.divider) break;
        if (endYearEntry(cur) !== y) break;
        chunk.push(cur);
        i++;
      }

      segments.push({ divider: false, year: y, jobs: chunk });
    }

    return segments;
  }

  /** Spine rows for calendar years strictly between two end-year clusters (e.g. 2026 → 2024 inserts 2025). */
  function buildTracks(ordered) {
    const segments = buildJobSegments(ordered);
    const spineParts = [];
    const jobParts = [];
    let lastJobYear = null;

    for (const seg of segments) {
      if (seg.divider) {
        spineParts.push(renderSpineDividerSpacer());
        jobParts.push(renderDivider(seg.label));
        continue;
      }

      if (lastJobYear !== null && lastJobYear > seg.year) {
        for (let gapY = lastJobYear - 1; gapY > seg.year; gapY--) {
          spineParts.push(renderSpineSegment(gapY, 1));
          jobParts.push(
            '<div class="exp-jobs-year-cluster exp-jobs-year-cluster--gap" style="flex: 1 1 auto" aria-hidden="true"></div>'
          );
        }
      }

      const flex = Math.max(seg.jobs.length, 1);
      spineParts.push(renderSpineSegment(seg.year, flex));
      const rows = seg.jobs.map((job) => renderJobRow(job, seg.year)).join('');
      jobParts.push(`<div class="exp-jobs-year-cluster" style="flex: ${flex} 1 auto">${rows}</div>`);
      lastJobYear = seg.year;
    }

    return { spineParts, jobParts };
  }

  function bindInteractions(root) {
    function clearPinned() {
      root.querySelectorAll('.exp-entry--pinned').forEach((entryEl) => {
        entryEl.classList.remove('exp-entry--pinned');
        const b = entryEl.querySelector('.exp-chip');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    root.querySelectorAll('.exp-chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const host =
          btn.closest('.exp-entry--education-only') ||
          btn.closest('.exp-job-body');
        if (!host) return;
        const wasPinned = host.classList.contains('exp-entry--pinned');
        clearPinned();
        if (!wasPinned) {
          host.classList.add('exp-entry--pinned');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.experience-rail')) return;
      clearPinned();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') clearPinned();
    });
  }

  async function init() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    let data;
    try {
      const res = await fetch(jsonUrl(), { credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      data = await res.json();
    } catch {
      mount.innerHTML =
        '<p class="exp-error">Experience could not be loaded. Try refreshing.</p>';
      return;
    }

    const ordered = Array.isArray(data.entries) ? data.entries : [];
    const educationItems = ordered.filter((e) => e.education && !e.divider);
    educationItems.sort((a, b) => {
      const tb = parseDate(b.end) || new Date();
      const ta = parseDate(a.end) || new Date();
      return tb - ta;
    });

    const { spineParts, jobParts } = buildTracks(ordered);

    const eduHtml = educationItems.map(renderEducationEntry).join('');
    const spineHtml = `<div class="exp-spine-track">${spineParts.join('')}</div>`;
    const jobsHtml = `<div class="exp-jobs-track">${jobParts.join('')}</div>`;

    mount.innerHTML = `<div class="exp-layout">
      <div class="exp-education-col">${eduHtml}</div>
      <div class="exp-spine-col">${spineHtml}</div>
      <div class="exp-jobs-col">${jobsHtml}</div>
    </div>`;

    bindInteractions(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
