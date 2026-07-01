/**
 * mini-hr-360 Application Shell
 * Sidebar collapse, responsive drawer, organization context
 */
(function () {
  const STORAGE_SUBMENUS = 'mh360:sidebar:submenus';
  const STORAGE_FOCUS_MODE = 'mh360:focusMode';
  const ORG_STORAGE_KEY = 'mh360:organizationId';

  function getStoredSubmenus() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_SUBMENUS) || '{}');
    } catch {
      return {};
    }
  }

  function setStoredSubmenu(id, open) {
    const state = getStoredSubmenus();
    state[id] = open;
    localStorage.setItem(STORAGE_SUBMENUS, JSON.stringify(state));
  }

  window.getOrganizationId = function getOrganizationId() {
    const stored = localStorage.getItem(ORG_STORAGE_KEY) || localStorage.getItem('mh360:workspaceId');
    if (stored) return stored;

    const match = document.cookie.match(/(?:^|;\s*)mh360_(?:organization|workspace)_id=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // Backward-compatible alias used by apiCall in main layout
  window.getWorkspaceId = window.getOrganizationId;

  function applyActiveOrganizationToPage() {
    const orgId = getOrganizationId();
    if (!orgId) return;

    const selectors = [
      'select[name="businessId"]',
      '#formBusinessId',
      '#employeeBusinessSelect',
      '#customerBusiness',
      '#editCustomerBusiness',
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el.disabled) return;
        const hasOption = Array.from(el.options || []).some(
          (opt) => String(opt.value) === String(orgId)
        );
        if (!hasOption) return;
        if (!el.value || el.value === '') {
          el.value = String(orgId);
        }
      });
    });

    document.querySelectorAll('[data-auto-organization="true"]').forEach((el) => {
      if (!el.value) el.value = orgId;
    });
  }

  window.applyActiveOrganizationToPage = applyActiveOrganizationToPage;

  function persistOrganizationId(organizationId) {
    if (!organizationId) return;
    const id = String(organizationId);
    localStorage.setItem(ORG_STORAGE_KEY, id);
    document.cookie = `mh360_organization_id=${encodeURIComponent(id)}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    document.cookie = `mh360_workspace_id=${encodeURIComponent(id)}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
  }

  async function initOrganizationContext() {
    if (typeof window.apiCall !== 'function') return;

    try {
      const data = await window.apiCall('/business', { skipWorkspace: true });
      const organizations = data?.organizations || [];
      if (!organizations.length) return;

      const current = getOrganizationId();
      const allowed = new Set(organizations.map((o) => String(o.id)));
      if (current && allowed.has(String(current))) {
        applyActiveOrganizationToPage();
        return;
      }

      const preferred = organizations.find((o) => o.membershipType === 'owner') || organizations[0];
      if (preferred?.id) persistOrganizationId(preferred.id);
      applyActiveOrganizationToPage();
    } catch (err) {
      console.warn('Could not initialize organization context:', err?.message || err);
    }
  }

  window.toggleMenu = function toggleMenu(menuId) {
    const submenu = document.getElementById(menuId);
    if (!submenu) return;

    const toggle = document.querySelector(`[data-menu-toggle="${menuId}"]`);
    const arrow = toggle?.querySelector('.nav-chevron');

    const willOpen = !submenu.classList.contains('show');
    submenu.classList.toggle('show', willOpen);
    toggle?.classList.toggle('collapsed', !willOpen);
    arrow?.classList.toggle('open', willOpen);
    setStoredSubmenu(menuId, willOpen);
  };

  function initSidebarState() {
    document.querySelectorAll('.sidebar-submenu').forEach((el) => {
      const id = el.id;
      const serverOpen = el.classList.contains('show');
      const stored = getStoredSubmenus();
      if (id in stored) {
        const open = stored[id];
        el.classList.toggle('show', open);
        const toggle = document.querySelector(`[data-menu-toggle="${id}"]`);
        toggle?.querySelector('.nav-chevron')?.classList.toggle('open', open);
      } else if (serverOpen) {
        setStoredSubmenu(id, true);
      }
    });
  }

  function initResponsiveSidebar() {
    const shell = document.getElementById('appShell');
    const overlay = document.getElementById('sidebarOverlay');
    const menuBtn = document.getElementById('topbarMenuBtn');

    function closeSidebar() {
      shell?.classList.remove('sidebar-open');
    }

    menuBtn?.addEventListener('click', () => {
      shell?.classList.toggle('sidebar-open');
    });

    overlay?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.app-sidebar .sidebar-link[href]').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) closeSidebar();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992) closeSidebar();
    });
  }

  function isFocusModeEnabled() {
    return localStorage.getItem(STORAGE_FOCUS_MODE) === 'true';
  }

  function applyFocusMode(enabled) {
    const shell = document.getElementById('appShell');
    const btn = document.getElementById('topbarFocusModeBtn');
    const icon = btn?.querySelector('i');

    localStorage.setItem(STORAGE_FOCUS_MODE, enabled ? 'true' : 'false');

    if (enabled) {
      document.documentElement.setAttribute('data-focus-mode', 'true');
      shell?.classList.add('focus-mode');
    } else {
      document.documentElement.removeAttribute('data-focus-mode');
      shell?.classList.remove('focus-mode');
    }

    if (btn) {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.setAttribute('aria-label', enabled ? 'Exit focus mode' : 'Enter focus mode');
      btn.title = enabled ? 'Exit focus mode' : 'Focus mode';
      btn.classList.toggle('is-active', enabled);
    }

    if (icon) {
      icon.className = enabled ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    }
  }

  function initFocusMode() {
    const btn = document.getElementById('topbarFocusModeBtn');
    if (!btn) return;

    applyFocusMode(isFocusModeEnabled());

    btn.addEventListener('click', () => {
      applyFocusMode(!isFocusModeEnabled());
    });
  }

  function highlightActiveRoutes() {
    const path = window.location.pathname;
    document.querySelectorAll('.app-sidebar .sidebar-link[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href === '/') return;
      if (path === href) {
        link.classList.add('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('appShell')) return;
    initSidebarState();
    initResponsiveSidebar();
    initFocusMode();
    highlightActiveRoutes();
    initOrganizationContext().finally(() => applyActiveOrganizationToPage());

    document.addEventListener('shown.bs.modal', () => applyActiveOrganizationToPage());
  });
})();
