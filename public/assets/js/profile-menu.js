/**
 * Global profile menu — avatar, role, theme, preferences, keyboard nav
 */
(function () {
  'use strict';

  const THEME_KEY = 'mh360:theme';
  const PREFS_KEY = 'mh360:preferences';

  let isOpen = false;
  let themeOpen = false;
  let focusableItems = [];

  function getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function savePreferences(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function formatRole(role) {
    if (!role) return 'Employee';
    if (String(role) === 'shop_owner') return 'Administrator';
    if (String(role) === 'SUPER_ADMIN') return 'Super Admin';
    if (String(role) === 'HR_MANAGER') return 'HR Manager';
    if (String(role) === 'HR_EXECUTIVE') return 'HR Executive';
    return String(role)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function resolveSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    const effective = mode === 'system' ? resolveSystemTheme() : mode;
    root.setAttribute('data-theme', effective);
    root.setAttribute('data-theme-mode', mode);

    const label = document.getElementById('profileThemeCurrent');
    if (label) {
      label.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    document.querySelectorAll('[data-theme-value]').forEach((btn) => {
      const active = btn.getAttribute('data-theme-value') === mode;
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
      btn.classList.toggle('active', active);
    });
  }

  function setTheme(mode) {
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  }

  function closeOtherOverlays() {
    window.closeNotificationCenter?.();
    document.getElementById('appShell')?.classList.remove('sidebar-open');
  }

  function getMenuItems() {
    const dropdown = document.getElementById('profileMenuDropdown');
    if (!dropdown) return [];
    const items = [...dropdown.querySelectorAll('.profile-menu-item:not(.profile-menu-item-toggle), .profile-menu-subitem, a.profile-menu-item')];
    return items.filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
  }

  function updateFocusableItems() {
    focusableItems = getMenuItems();
  }

  function openMenu() {
    const root = document.getElementById('profileMenu');
    const dropdown = document.getElementById('profileMenuDropdown');
    const trigger = document.getElementById('profileMenuTrigger');
    if (!dropdown || !trigger) return;

    closeOtherOverlays();
    dropdown.hidden = false;
    root?.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    isOpen = true;
    updateFocusableItems();
    focusableItems[0]?.focus();
  }

  function closeMenu() {
    const root = document.getElementById('profileMenu');
    const dropdown = document.getElementById('profileMenuDropdown');
    const trigger = document.getElementById('profileMenuTrigger');
    if (!dropdown) return;

    dropdown.hidden = true;
    root?.classList.remove('open');
    trigger?.setAttribute('aria-expanded', 'false');
    isOpen = false;
    closeThemeSubmenu();
    trigger?.focus();
  }

  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  function closeThemeSubmenu() {
    const submenu = document.getElementById('profileThemeSubmenu');
    const toggle = document.querySelector('[data-profile-action="theme-toggle"]');
    if (!submenu) return;
    submenu.hidden = true;
    themeOpen = false;
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.classList.remove('open');
  }

  function toggleThemeSubmenu() {
    const submenu = document.getElementById('profileThemeSubmenu');
    const toggle = document.querySelector('[data-profile-action="theme-toggle"]');
    if (!submenu || !toggle) return;

    themeOpen = !themeOpen;
    submenu.hidden = !themeOpen;
    toggle.setAttribute('aria-expanded', themeOpen ? 'true' : 'false');
    toggle.classList.toggle('open', themeOpen);
    updateFocusableItems();
    if (themeOpen) {
      submenu.querySelector('.profile-menu-subitem.active, .profile-menu-subitem[aria-checked="true"]')?.focus()
        || submenu.querySelector('.profile-menu-subitem')?.focus();
    }
  }

  function openPreferences() {
    closeMenu();
    const modalEl = document.getElementById('preferencesModal');
    if (!modalEl) return;

    const prefs = getPreferences();
    document.getElementById('prefNavExpanded') && (document.getElementById('prefNavExpanded').checked = prefs.navExpanded !== false);
    document.getElementById('prefCompactSidebar') && (document.getElementById('prefCompactSidebar').checked = !!prefs.compactSidebar);
    document.getElementById('prefReducedMotion') && (document.getElementById('prefReducedMotion').checked = !!prefs.reducedMotion);

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function savePreferencesFromModal() {
    const prefs = {
      navExpanded: document.getElementById('prefNavExpanded')?.checked !== false,
      compactSidebar: !!document.getElementById('prefCompactSidebar')?.checked,
      reducedMotion: !!document.getElementById('prefReducedMotion')?.checked,
    };
    savePreferences(prefs);
    applyPreferences(prefs);
    bootstrap.Modal.getInstance(document.getElementById('preferencesModal'))?.hide();
  }

  function applyPreferences(prefs) {
    prefs = prefs || getPreferences();
    document.documentElement.classList.toggle('pref-compact-sidebar', !!prefs.compactSidebar);
    document.documentElement.classList.toggle('pref-reduced-motion', !!prefs.reducedMotion);
    if (prefs.navExpanded === false) {
      localStorage.setItem('mh360:sidebar:submenus', JSON.stringify({}));
    }
  }

  function applyRoleVisibility() {
    const rawRole = document.getElementById('profileMenuRoleBadge')?.getAttribute('data-role')
      || localStorage.getItem('userRole')
      || '';
    const role = String(rawRole).toLowerCase();
    const billingLink = document.querySelector('[data-profile-nav="billing"]');
    const canBilling = ['admin', 'super_admin', 'shop_owner', 'finance'].includes(role);
    if (billingLink) {
      billingLink.style.display = canBilling ? '' : 'none';
    }

    const roleLabel = document.getElementById('profileMenuRoleLabel');
    const roleBadge = document.getElementById('profileMenuRoleBadge');
    const formatted = formatRole(rawRole);
    if (roleLabel) roleLabel.textContent = formatted;
    if (roleBadge) roleBadge.textContent = formatted;
  }

  function handleAction(action, el) {
    switch (action) {
      case 'theme-toggle':
        toggleThemeSubmenu();
        break;
      case 'preferences':
        openPreferences();
        break;
      case 'logout':
        closeMenu();
        if (typeof window.logout === 'function') window.logout();
        else window.location.href = '/login';
        break;
      default:
        if (el?.tagName === 'A') closeMenu();
        break;
    }
  }

  function onKeyDown(e) {
    if (!isOpen) return;

    const idx = focusableItems.indexOf(document.activeElement);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        if (themeOpen) closeThemeSubmenu();
        else closeMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (focusableItems.length) {
          const next = idx < focusableItems.length - 1 ? idx + 1 : 0;
          focusableItems[next]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusableItems.length) {
          const prev = idx > 0 ? idx - 1 : focusableItems.length - 1;
          focusableItems[prev]?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        focusableItems[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        focusableItems[focusableItems.length - 1]?.focus();
        break;
      case 'Tab':
        closeMenu();
        break;
      default:
        break;
    }
  }

  function init() {
    const trigger = document.getElementById('profileMenuTrigger');
    const dropdown = document.getElementById('profileMenuDropdown');
    if (!trigger || !dropdown) return;

    applyTheme(getStoredTheme());
    applyPreferences();
    applyRoleVisibility();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) openMenu();
      }
    });

    dropdown.querySelectorAll('[data-profile-action], a.profile-menu-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const action = el.getAttribute('data-profile-action');
        if (action) {
          e.preventDefault();
          handleAction(action, el);
        } else {
          closeMenu();
        }
      });
    });

    dropdown.querySelectorAll('[data-theme-value]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setTheme(btn.getAttribute('data-theme-value'));
        closeThemeSubmenu();
        updateFocusableItems();
      });
    });

    document.getElementById('preferencesSaveBtn')?.addEventListener('click', savePreferencesFromModal);

    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (!document.getElementById('profileMenu')?.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', onKeyDown);

    document.getElementById('preferencesModal')?.addEventListener('hidden.bs.modal', () => {
      trigger.focus();
    });
  }

  window.closeProfileMenu = closeMenu;
  window.setAppTheme = setTheme;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
