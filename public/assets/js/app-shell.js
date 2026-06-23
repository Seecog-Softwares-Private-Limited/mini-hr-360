/**
 * mini-hr-360 Application Shell
 * Sidebar collapse, responsive drawer, persistent workspace state
 */
(function () {
  const STORAGE_WORKSPACE = 'mh360:sidebar:workspaceOpen';
  const STORAGE_SUBMENUS = 'mh360:sidebar:submenus';

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

  function isWorkspaceOpen() {
    const stored = localStorage.getItem(STORAGE_WORKSPACE);
    if (stored === null) return true;
    return stored === 'true';
  }

  function setWorkspaceOpen(open) {
    localStorage.setItem(STORAGE_WORKSPACE, String(open));
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

  window.toggleWorkspace = function toggleWorkspace() {
    const submenu = document.getElementById('workspace-submenu');
    const toggle = document.querySelector('[data-menu-toggle="workspace-submenu"]');
    const arrow = toggle?.querySelector('.nav-chevron');
    if (!submenu) return;

    const willOpen = !submenu.classList.contains('show');
    submenu.classList.toggle('show', willOpen);
    arrow?.classList.toggle('open', willOpen);
    toggle?.classList.toggle('collapsed', !willOpen);
    setWorkspaceOpen(willOpen);
  };

  function initSidebarState() {
    const workspace = document.getElementById('workspace-submenu');
    const workspaceToggle = document.querySelector('[data-menu-toggle="workspace-submenu"]');
    if (workspace) {
      const open = isWorkspaceOpen();
      workspace.classList.toggle('show', open);
      workspaceToggle?.querySelector('.nav-chevron')?.classList.toggle('open', open);
      workspaceToggle?.classList.toggle('collapsed', !open);
    }

    document.querySelectorAll('.sidebar-submenu').forEach((el) => {
      if (el.id === 'workspace-submenu') return;
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
    highlightActiveRoutes();
  });
})();
