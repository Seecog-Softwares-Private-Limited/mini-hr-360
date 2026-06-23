/**
 * Employee Documents Vault — categories, preview, download, expiry
 */
(function () {
  'use strict';

  let activeCategory = 'ALL';

  function updateCategoryCounts() {
    const summary = window.DOC_VAULT_SUMMARY;
    if (!summary?.byCategory) return;

    Object.entries(summary.byCategory).forEach(([key, count]) => {
      const el = document.querySelector(`[data-cat-count="${key}"]`);
      if (el) {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    });
  }

  function filterDocuments(category) {
    activeCategory = category;
    const cards = document.querySelectorAll('.emp-doc-card');
    const grid = document.getElementById('documentsGrid');
    const filterEmpty = document.getElementById('documentsFilterEmpty');
    let visible = 0;

    document.querySelectorAll('.emp-doc-category').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    cards.forEach((card) => {
      const match = category === 'ALL' || card.dataset.category === category;
      card.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });

    if (filterEmpty && grid) {
      const hasAny = cards.length > 0;
      filterEmpty.classList.toggle('d-none', !hasAny || visible > 0);
      grid.classList.toggle('d-none', hasAny && visible === 0);
    }
  }

  function scrollToExpiring() {
    const first = document.querySelector('.emp-doc-card[data-expiring="true"], .emp-doc-card[data-expired="true"]');
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.classList.add('emp-doc-card-highlight');
      setTimeout(() => first.classList.remove('emp-doc-card-highlight'), 2000);
    }
  }

  function openPreview(btn) {
    const id = btn.dataset.previewId;
    const type = btn.dataset.previewType;
    const previewUrl = btn.dataset.previewUrl;
    const title = btn.dataset.docTitle || 'Document';
    const modalEl = document.getElementById('docPreviewModal');
    const body = document.getElementById('docPreviewBody');
    const titleEl = document.getElementById('docPreviewTitle');
    const downloadEl = document.getElementById('docPreviewDownload');

    if (!modalEl || !body) return;

    titleEl.innerHTML = `<i class="fa-solid fa-file me-2"></i> ${title}`;
    downloadEl.href = `/employee/documents/${id}/download`;

    if (type === 'pdf') {
      body.innerHTML = `<iframe src="${previewUrl}" title="${title}" class="emp-doc-preview-frame"></iframe>`;
    } else if (type === 'image') {
      body.innerHTML = `<div class="emp-doc-preview-image-wrap"><img src="${previewUrl}" alt="${title}" class="emp-doc-preview-image"></div>`;
    } else if (type === 'external') {
      body.innerHTML = `
        <div class="emp-doc-preview-fallback text-center py-5">
          <i class="fa-solid fa-up-right-from-square fa-2x mb-3 text-primary"></i>
          <p>This document is hosted externally.</p>
          <a href="${previewUrl}" target="_blank" rel="noopener" class="btn emp-btn-primary">Open in new tab</a>
        </div>`;
    } else {
      body.innerHTML = `
        <div class="emp-doc-preview-fallback text-center py-5">
          <i class="fa-solid fa-file-arrow-down fa-2x mb-3 text-muted"></i>
          <p>Preview is not available for this file type.</p>
          <a href="/employee/documents/${id}/download" class="btn emp-btn-primary">Download instead</a>
        </div>`;
    }

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function bindEvents() {
    document.getElementById('docCategories')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.emp-doc-category');
      if (!btn) return;
      filterDocuments(btn.dataset.category || 'ALL');
    });

    document.getElementById('documentsGrid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.emp-doc-preview-btn');
      if (btn) openPreview(btn);
    });

    document.getElementById('scrollToExpiring')?.addEventListener('click', scrollToExpiring);
  }

  function init() {
    if (!document.getElementById('documentsGrid')) return;
    updateCategoryCounts();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
