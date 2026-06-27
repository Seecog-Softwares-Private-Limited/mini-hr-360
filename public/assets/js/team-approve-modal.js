/**
 * Shared approval modal for manager team actions (leave, corrections, etc.)
 */
(function () {
  'use strict';

  const MODAL_ID = 'teamApproveModal';
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
      <div class="modal fade team-approve-modal" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header team-approve-modal__header">
              <div class="team-approve-modal__icon" aria-hidden="true">
                <i class="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <h5 class="modal-title mb-0" id="teamApproveModalTitle">Approve request</h5>
                <p class="team-approve-modal__subtitle mb-0" id="teamApproveModalSubtitle"></p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3">
              <div class="team-approve-modal__context" id="teamApproveModalContext"></div>
              <label class="form-label fw-semibold" for="teamApproveModalMessage">
                Note to employee <span class="text-muted fw-normal">(optional)</span>
              </label>
              <textarea
                class="form-control team-approve-modal__textarea"
                id="teamApproveModalMessage"
                rows="3"
                maxlength="500"
                placeholder="Add a short note for the employee, e.g. coverage plan or handover reminder…"
              ></textarea>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">The employee will be notified of the approval.</small>
                <small class="text-muted"><span id="teamApproveModalCharCount">0</span>/500</small>
              </div>
              <div class="team-approve-modal__quick" id="teamApproveModalQuick"></div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-success" id="teamApproveModalConfirm">
                <i class="fa-solid fa-check me-1"></i>
                <span id="teamApproveModalConfirmLabel">Approve request</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);
    modalEl = document.getElementById(MODAL_ID);

    const messageEl = document.getElementById('teamApproveModalMessage');
    const charCountEl = document.getElementById('teamApproveModalCharCount');
    messageEl.addEventListener('input', () => {
      charCountEl.textContent = String(messageEl.value.length);
    });

    document.getElementById('teamApproveModalConfirm').addEventListener('click', async () => {
      const btn = document.getElementById('teamApproveModalConfirm');
      const label = document.getElementById('teamApproveModalConfirmLabel');
      const message = messageEl.value.trim();
      if (typeof onConfirm !== 'function') return;

      btn.disabled = true;
      const original = label.textContent;
      label.textContent = 'Approving…';

      try {
        await onConfirm(message || null);
        modalInstance?.hide();
      } catch (err) {
        alert(err?.message || 'Failed to approve request');
      } finally {
        btn.disabled = false;
        label.textContent = original;
      }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      messageEl.value = '';
      charCountEl.textContent = '0';
      onConfirm = null;
      document.getElementById('teamApproveModalConfirm').disabled = false;
    });
  }

  function renderContext(items) {
    const container = document.getElementById('teamApproveModalContext');
    if (!items?.length) {
      container.innerHTML = '';
      container.classList.add('d-none');
      return;
    }
    container.classList.remove('d-none');
    container.innerHTML = items
      .map(
        (item) => `
          <div class="team-approve-modal__context-row">
            <span class="team-approve-modal__context-label">${escapeHtml(item.label)}</span>
            <span class="team-approve-modal__context-value">${escapeHtml(item.value)}</span>
          </div>
        `
      )
      .join('');
  }

  function renderQuickNotes(notes) {
    const container = document.getElementById('teamApproveModalQuick');
    const messageEl = document.getElementById('teamApproveModalMessage');
    if (!notes?.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="team-approve-modal__quick-label">Quick notes</div>
      <div class="team-approve-modal__quick-chips">
        ${notes
          .map(
            (note) =>
              `<button type="button" class="team-approve-modal__chip" data-note="${escapeHtml(note)}">${escapeHtml(note)}</button>`
          )
          .join('')}
      </div>
    `;
    container.querySelectorAll('.team-approve-modal__chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const note = chip.dataset.note || '';
        const current = messageEl.value.trim();
        messageEl.value = current ? `${current}\n${note}` : note;
        document.getElementById('teamApproveModalCharCount').textContent = String(messageEl.value.length);
        messageEl.focus();
      });
    });
  }

  window.openTeamApproveModal = function openTeamApproveModal(options = {}) {
    buildModal();
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
    }

    document.getElementById('teamApproveModalTitle').textContent = options.title || 'Approve request';
    document.getElementById('teamApproveModalSubtitle').textContent =
      options.subtitle || 'Confirm approval and optionally leave a note for the employee.';
    document.getElementById('teamApproveModalConfirmLabel').textContent =
      options.confirmLabel || 'Approve request';

    renderContext(options.contextItems || []);
    renderQuickNotes(options.quickNotes || []);
    onConfirm = options.onConfirm || null;

    modalInstance.show();
    setTimeout(() => document.getElementById('teamApproveModalMessage')?.focus(), 200);
  };
})();
