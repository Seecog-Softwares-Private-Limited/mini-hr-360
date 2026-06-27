/**
 * Shared rejection modal for manager team actions (leave, corrections, etc.)
 */
(function () {
  'use strict';

  const MODAL_ID = 'teamRejectModal';
  let modalEl = null;
  let modalInstance = null;
  let onConfirm = null;

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildModal() {
    if (document.getElementById(MODAL_ID)) {
      modalEl = document.getElementById(MODAL_ID);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="modal fade team-reject-modal" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header team-reject-modal__header">
              <div class="team-reject-modal__icon" aria-hidden="true">
                <i class="fa-solid fa-circle-xmark"></i>
              </div>
              <div>
                <h5 class="modal-title mb-0" id="teamRejectModalTitle">Reject request</h5>
                <p class="team-reject-modal__subtitle mb-0" id="teamRejectModalSubtitle"></p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3">
              <div class="team-reject-modal__context" id="teamRejectModalContext"></div>
              <label class="form-label fw-semibold" for="teamRejectModalMessage">
                Message to employee <span class="text-muted fw-normal">(optional)</span>
              </label>
              <textarea
                class="form-control team-reject-modal__textarea"
                id="teamRejectModalMessage"
                rows="4"
                maxlength="500"
                placeholder="Explain why this request is being rejected so the employee can take action…"
              ></textarea>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">This note will be shared with the employee.</small>
                <small class="text-muted"><span id="teamRejectModalCharCount">0</span>/500</small>
              </div>
              <div class="team-reject-modal__quick" id="teamRejectModalQuick"></div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="teamRejectModalConfirm">
                <i class="fa-solid fa-ban me-1"></i>
                <span id="teamRejectModalConfirmLabel">Reject request</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);
    modalEl = document.getElementById(MODAL_ID);

    const messageEl = document.getElementById('teamRejectModalMessage');
    const charCountEl = document.getElementById('teamRejectModalCharCount');
    messageEl.addEventListener('input', () => {
      charCountEl.textContent = String(messageEl.value.length);
    });

    document.getElementById('teamRejectModalConfirm').addEventListener('click', async () => {
      const btn = document.getElementById('teamRejectModalConfirm');
      const label = document.getElementById('teamRejectModalConfirmLabel');
      const message = messageEl.value.trim();
      if (typeof onConfirm !== 'function') return;

      btn.disabled = true;
      const original = label.textContent;
      label.textContent = 'Rejecting…';

      try {
        await onConfirm(message || null);
        modalInstance?.hide();
      } catch (err) {
        alert(err?.message || 'Failed to reject request');
      } finally {
        btn.disabled = false;
        label.textContent = original;
      }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      messageEl.value = '';
      charCountEl.textContent = '0';
      onConfirm = null;
      document.getElementById('teamRejectModalConfirm').disabled = false;
    });
  }

  function renderContext(items) {
    const container = document.getElementById('teamRejectModalContext');
    if (!items?.length) {
      container.innerHTML = '';
      container.classList.add('d-none');
      return;
    }
    container.classList.remove('d-none');
    container.innerHTML = items
      .map(
        (item) => `
          <div class="team-reject-modal__context-row">
            <span class="team-reject-modal__context-label">${escapeHtml(item.label)}</span>
            <span class="team-reject-modal__context-value">${escapeHtml(item.value)}</span>
          </div>
        `
      )
      .join('');
  }

  function renderQuickReasons(reasons) {
    const container = document.getElementById('teamRejectModalQuick');
    const messageEl = document.getElementById('teamRejectModalMessage');
    if (!reasons?.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="team-reject-modal__quick-label">Quick reasons</div>
      <div class="team-reject-modal__quick-chips">
        ${reasons
          .map(
            (reason) =>
              `<button type="button" class="team-reject-modal__chip" data-reason="${escapeHtml(reason)}">${escapeHtml(reason)}</button>`
          )
          .join('')}
      </div>
    `;
    container.querySelectorAll('.team-reject-modal__chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const reason = chip.dataset.reason || '';
        const current = messageEl.value.trim();
        messageEl.value = current ? `${current}\n${reason}` : reason;
        document.getElementById('teamRejectModalCharCount').textContent = String(messageEl.value.length);
        messageEl.focus();
      });
    });
  }

  window.openTeamRejectModal = function openTeamRejectModal(options = {}) {
    buildModal();
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
    }

    document.getElementById('teamRejectModalTitle').textContent = options.title || 'Reject request';
    document.getElementById('teamRejectModalSubtitle').textContent =
      options.subtitle || 'The employee will be notified about this decision.';
    document.getElementById('teamRejectModalConfirmLabel').textContent =
      options.confirmLabel || 'Reject request';

    renderContext(options.contextItems || []);
    renderQuickReasons(options.quickReasons || []);
    onConfirm = options.onConfirm || null;

    modalInstance.show();
    setTimeout(() => document.getElementById('teamRejectModalMessage')?.focus(), 200);
  };
})();
