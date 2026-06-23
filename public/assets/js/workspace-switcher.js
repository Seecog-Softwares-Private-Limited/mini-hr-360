/**
 * Workspace switcher — multi-tenant context
 */
(function () {
  const STORAGE_ID = 'mh360:workspaceId';
  const STORAGE_RECENT = 'mh360:recentWorkspaces';
  const MAX_RECENT = 5;

  function getRecentIds() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_RECENT) || '[]');
      return Array.isArray(raw) ? raw.map(Number).filter((n) => n > 0) : [];
    } catch {
      return [];
    }
  }

  function pushRecent(workspaceId) {
    const id = Number(workspaceId);
    if (!id) return;
    let recent = getRecentIds().filter((r) => r !== id);
    recent.unshift(id);
    recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(recent));
  }

  function persistWorkspaceId(workspaceId) {
    localStorage.setItem(STORAGE_ID, String(workspaceId));
    document.cookie = `mh360_workspace_id=${encodeURIComponent(workspaceId)}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
  }

  function renderOption(workspace, isActive) {
    const sub = [workspace.category, workspace.country].filter(Boolean).join(' · ');
    return `
      <button type="button" class="workspace-option ${isActive ? 'active' : ''}" data-workspace-id="${workspace.id}" role="option" aria-selected="${isActive}">
        <div class="workspace-option-avatar">${escapeHtml(workspace.initials || 'WS')}</div>
        <div class="workspace-option-meta">
          <div class="workspace-option-name">${escapeHtml(workspace.name || 'Workspace')}</div>
          ${sub ? `<div class="workspace-option-sub">${escapeHtml(sub)}</div>` : ''}
        </div>
        ${isActive ? '<i class="fa-solid fa-check" style="opacity:0.7;font-size:12px;"></i>' : ''}
      </button>
    `;
  }

  function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function updateTrigger(workspace) {
    const avatar = document.getElementById('workspaceAvatar');
    const name = document.getElementById('workspaceName');
    if (!workspace) {
      if (avatar) avatar.textContent = '—';
      if (name) name.textContent = 'No workspace';
      return;
    }
    if (avatar) avatar.textContent = workspace.initials || 'WS';
    if (name) name.textContent = workspace.name || 'Workspace';
  }

  function bindOptionClicks(container) {
    container?.querySelectorAll('[data-workspace-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-workspace-id'));
        if (id) switchWorkspace(id);
      });
    });
  }

  async function switchWorkspace(workspaceId) {
    if (!workspaceId || !window.apiCall) return;

    try {
      const res = await apiCall('/workspaces/switch', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });

      const payload = res?.data || res;
      const ws = payload.workspace || payload;
      const id = payload.workspaceId || ws?.id || workspaceId;

      persistWorkspaceId(id);
      pushRecent(id);
      closeDropdown();

      window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { workspaceId: id, workspace: ws } }));

      window.location.reload();
    } catch (e) {
      console.error('Workspace switch failed:', e);
    }
  }

  function openDropdown() {
    const root = document.getElementById('workspaceSwitcher');
    const dropdown = document.getElementById('workspaceDropdown');
    const trigger = document.getElementById('workspaceTrigger');
    if (!dropdown || !root) return;
    dropdown.hidden = false;
    root.classList.add('open');
    trigger?.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    const root = document.getElementById('workspaceSwitcher');
    const dropdown = document.getElementById('workspaceDropdown');
    const trigger = document.getElementById('workspaceTrigger');
    if (!dropdown || !root) return;
    dropdown.hidden = true;
    root.classList.remove('open');
    trigger?.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdown() {
    const dropdown = document.getElementById('workspaceDropdown');
    if (!dropdown) return;
    if (dropdown.hidden) openDropdown();
    else closeDropdown();
  }

  async function loadWorkspaces() {
    if (!document.getElementById('workspaceSwitcher') || typeof apiCall !== 'function') return;

    try {
      const res = await apiCall('/workspaces');
      const payload = res?.data || res;
      const workspaces = payload.workspaces || [];
      let current = payload.current || null;
      const currentId = payload.currentId || current?.id || null;

      if (currentId) {
        persistWorkspaceId(currentId);
        pushRecent(currentId);
      }

      if (!current && currentId) {
        current = workspaces.find((w) => w.id === currentId) || null;
      }

      updateTrigger(current);

      const topbarWs = document.getElementById('topbarWorkspaceName');
      if (topbarWs) {
        topbarWs.textContent = current?.name ? `Workspace · ${current.name}` : '';
      }

      const currentSlot = document.getElementById('workspaceCurrentSlot');
      const recentList = document.getElementById('workspaceRecentList');
      const recentSection = document.getElementById('workspaceRecentSection');
      const allList = document.getElementById('workspaceAllList');

      if (currentSlot) {
        currentSlot.innerHTML = current
          ? renderOption(current, true)
          : '<div class="workspace-empty">No workspace selected</div>';
        bindOptionClicks(currentSlot);
      }

      const recentIds = getRecentIds().filter((id) => id !== currentId && workspaces.some((w) => w.id === id));
      const recentWorkspaces = recentIds
        .map((id) => workspaces.find((w) => w.id === id))
        .filter(Boolean);

      if (recentList && recentSection) {
        if (recentWorkspaces.length) {
          recentSection.style.display = '';
          recentList.innerHTML = recentWorkspaces.map((w) => renderOption(w, false)).join('');
          bindOptionClicks(recentList);
        } else {
          recentSection.style.display = 'none';
          recentList.innerHTML = '';
        }
      }

      if (allList) {
        if (!workspaces.length) {
          const createHint = canCreateWorkspace()
            ? 'Create your first workspace using the button below.'
            : 'Ask an administrator to create a workspace for you.';
          allList.innerHTML = `<div class="workspace-empty">${createHint}</div>`;
        } else {
          allList.innerHTML = workspaces.map((w) => renderOption(w, w.id === currentId)).join('');
          bindOptionClicks(allList);
        }
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e);
      updateTrigger(null);
      const name = document.getElementById('workspaceName');
      if (name) name.textContent = 'Unavailable';
    }
  }

  window.getWorkspaceId = function getWorkspaceId() {
    const fromStorage = localStorage.getItem(STORAGE_ID);
    if (fromStorage) return fromStorage;
    const match = document.cookie.match(/(?:^|;\s*)mh360_workspace_id=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  function canCreateWorkspace() {
    const role = String(localStorage.getItem('userRole') || '').toLowerCase();
    if (['admin', 'super_admin', 'shop_owner'].includes(role)) return true;
    return role.includes('admin');
  }

  async function initCreateWorkspace() {
    const createBtn = document.getElementById('workspaceCreateOpenBtn');
    if (!createBtn) return;

    let allowed = canCreateWorkspace();
    if (!allowed) {
      try {
        const res = await apiCall('/workspaces/permissions');
        const payload = res?.data || res;
        allowed = !!payload.canCreate;
      } catch {
        allowed = false;
      }
    }

    if (allowed) {
      createBtn.style.display = 'flex';
      createBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCreateWorkspaceModal();
      });
    }

    document.getElementById('createWorkspaceForm')?.addEventListener('submit', submitCreateWorkspace);
  }

  function dismissShellOverlays() {
    document.getElementById('appShell')?.classList.remove('sidebar-open');
    closeDropdown();
    window.closeProfileMenu?.();
  }

  function openCreateWorkspaceModal() {
    dismissShellOverlays();

    const modalEl = document.getElementById('createWorkspaceModal');
    if (!modalEl) return;

    document.getElementById('createWorkspaceAlert')?.classList.add('d-none');
    document.getElementById('createWorkspaceForm')?.reset();
    const country = document.getElementById('wsCountry');
    if (country) country.value = 'India';

    // Remove orphaned backdrops from prior failed opens
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    // Focus first field after animation
    setTimeout(() => document.getElementById('wsBusinessName')?.focus(), 200);
  }

  async function submitCreateWorkspace(e) {
    e.preventDefault();
    const alertEl = document.getElementById('createWorkspaceAlert');
    const submitBtn = document.getElementById('createWorkspaceSubmitBtn');
    const businessName = document.getElementById('wsBusinessName')?.value?.trim();
    const category = document.getElementById('wsCategory')?.value;
    const country = document.getElementById('wsCountry')?.value?.trim();

    if (!businessName) {
      alertEl.textContent = 'Workspace name is required.';
      alertEl.classList.remove('d-none');
      return;
    }

    alertEl.classList.add('d-none');
    const originalHtml = submitBtn?.innerHTML;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating…';
    }

    try {
      const res = await apiCall('/workspaces/create', {
        method: 'POST',
        body: JSON.stringify({ businessName, category, country }),
      });

      const payload = res?.data || res;
      const workspace = payload.workspace;
      const id = payload.workspaceId || workspace?.id;

      if (!id) throw new Error('Workspace created but no id returned');

      persistWorkspaceId(id);
      pushRecent(id);

      bootstrap.Modal.getInstance(document.getElementById('createWorkspaceModal'))?.hide();
      window.location.reload();
    } catch (err) {
      const msg = err?.message || 'Failed to create workspace';
      if (alertEl) {
        alertEl.textContent = msg;
        alertEl.classList.remove('d-none');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml || '<i class="fa-solid fa-plus me-1"></i>Create &amp; switch';
      }
    }
  }

  window.dismissShellOverlays = dismissShellOverlays;
  window.openCreateWorkspaceModal = openCreateWorkspaceModal;
  window.openWorkspaceSwitcher = openDropdown;
  window.closeWorkspaceSwitcher = closeDropdown;

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('workspaceSwitcher')) return;

    document.getElementById('workspaceTrigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    document.getElementById('workspaceDropdownClose')?.addEventListener('click', closeDropdown);

    document.addEventListener('click', (e) => {
      const root = document.getElementById('workspaceSwitcher');
      if (root && !root.contains(e.target)) closeDropdown();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDropdown();
    });

    loadWorkspaces();
    initCreateWorkspace();
  });
})();
