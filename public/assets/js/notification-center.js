/**
 * Global Notification Center — bell, badge, categories, mark read, load more
 */
(function () {
  'use strict';

  const PAGE_SIZE = 15;
  const POLL_MS = 45000;

  const state = {
    open: false,
    category: 'all',
    offset: 0,
    hasMore: false,
    loading: false,
    items: [],
  };

  const CATEGORY_META = {
    all: { label: 'All', icon: 'fa-bell' },
    system: { label: 'System', icon: 'fa-gear' },
    payroll: { label: 'Payroll', icon: 'fa-money-bill-wave' },
    approval: { label: 'Approval', icon: 'fa-check-double' },
    attendance: { label: 'Attendance', icon: 'fa-fingerprint' },
  };

  function getWorkspaceBusinessId() {
    try {
      const raw = localStorage.getItem('mh360_recent_workspaces');
      if (!raw) return null;
      const list = JSON.parse(raw);
      return list?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor((now - date) / 3600000);
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function categoryIcon(category) {
    return CATEGORY_META[category]?.icon || 'fa-bell';
  }

  function categoryColor(category) {
    const map = {
      system: '#6366f1',
      payroll: '#22c55e',
      approval: '#f59e0b',
      attendance: '#0ea5e9',
    };
    return map[category] || '#64748b';
  }

  async function fetchNotifications({ reset = false } = {}) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
      state.offset = 0;
      state.items = [];
    }

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(state.offset),
    });
    if (state.category && state.category !== 'all') {
      params.set('category', state.category);
    }
    const businessId = getWorkspaceBusinessId();
    if (businessId) params.set('businessId', String(businessId));

    const listEl = document.getElementById('ncList');
    const loadBtn = document.getElementById('ncLoadMoreBtn');
    if (reset && listEl) {
      listEl.innerHTML = '<div class="nc-loading"><div class="spinner-border spinner-border-sm text-primary"></div></div>';
    }
    if (loadBtn) loadBtn.disabled = true;

    try {
      const response = await apiCall(`/notifications?${params.toString()}`);
      const data = response.data || response;
      const notifications = data.notifications || [];
      state.hasMore = !!data.hasMore;
      state.offset += notifications.length;
      state.items = reset ? notifications : [...state.items, ...notifications];
      renderList();
    } catch (e) {
      console.error('Notification load error:', e);
      if (listEl) {
        listEl.innerHTML = '<div class="nc-empty nc-error"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load notifications</p></div>';
      }
    } finally {
      state.loading = false;
      if (loadBtn) {
        loadBtn.disabled = !state.hasMore;
        loadBtn.style.display = state.hasMore ? 'inline-flex' : 'none';
      }
    }
  }

  function renderList() {
    const listEl = document.getElementById('ncList');
    if (!listEl) return;

    if (!state.items.length) {
      listEl.innerHTML = `
        <div class="nc-empty">
          <i class="fa-solid fa-inbox"></i>
          <p>No notifications${state.category !== 'all' ? ' in this category' : ''}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = state.items.map((n) => `
      <button type="button" class="nc-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}">
        <div class="nc-item-icon" style="background:${categoryColor(n.category)}1a;color:${categoryColor(n.category)}">
          <i class="fa-solid ${categoryIcon(n.category)}"></i>
        </div>
        <div class="nc-item-body">
          <div class="nc-item-top">
            <span class="nc-item-title">${escapeHtml(n.title)}</span>
            ${n.priority === 'HIGH' || n.priority === 'URGENT' ? '<span class="nc-priority">!</span>' : ''}
          </div>
          ${n.message ? `<p class="nc-item-msg">${escapeHtml(n.message)}</p>` : ''}
          <div class="nc-item-meta">
            <span class="nc-cat-badge">${CATEGORY_META[n.category]?.label || 'System'}</span>
            <span class="nc-time">${formatTime(n.createdAt)}</span>
          </div>
        </div>
        ${!n.isRead ? '<span class="nc-unread-dot" aria-hidden="true"></span>' : ''}
      </button>
    `).join('');

    listEl.querySelectorAll('.nc-item').forEach((btn) => {
      btn.addEventListener('click', () => handleItemClick(btn.dataset.id));
    });
  }

  function renderTabs() {
    const tabsEl = document.getElementById('ncCategoryTabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = Object.entries(CATEGORY_META).map(([key, meta]) => `
      <button type="button" class="nc-tab ${state.category === key ? 'active' : ''}" data-category="${key}">
        <i class="fa-solid ${meta.icon}"></i> ${meta.label}
      </button>
    `).join('');

    tabsEl.querySelectorAll('.nc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.category = tab.dataset.category;
        renderTabs();
        fetchNotifications({ reset: true });
      });
    });
  }

  async function handleItemClick(id) {
    const item = state.items.find((n) => String(n.id) === String(id));
    const link = item?.link;

    try {
      await apiCall(`/notifications/${id}/read`, { method: 'PUT' });
      if (item) item.isRead = true;
      renderList();
      loadNotificationCount();
    } catch (e) {
      console.error('Mark read failed:', e);
    }

    if (link) {
      closeNotificationCenter();
      window.location.href = link;
    }
  }

  async function loadNotificationCount() {
    try {
      const params = new URLSearchParams();
      const businessId = getWorkspaceBusinessId();
      if (businessId) params.set('businessId', String(businessId));

      const response = await apiCall(`/notifications/count?${params.toString()}`);
      const data = response.data || response;
      const count = data.count || 0;

      ['sidebarNotificationBadge', 'topbarNotificationBadge'].forEach((id) => {
        const badge = document.getElementById(id);
        if (!badge) return;
        if (count > 0) {
          badge.style.display = 'inline-grid';
          badge.textContent = count > 99 ? '99+' : count;
        } else {
          badge.style.display = 'none';
        }
      });
    } catch (e) {
      // silent — table may not exist yet
    }
  }

  async function markAllNotificationsRead() {
    try {
      const params = new URLSearchParams();
      const businessId = getWorkspaceBusinessId();
      if (businessId) params.set('businessId', String(businessId));

      await apiCall(`/notifications/read-all?${params.toString()}`, { method: 'PUT' });
      state.items.forEach((n) => { n.isRead = true; });
      renderList();
      loadNotificationCount();
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  }

  function openNotificationCenter() {
    if (typeof dismissShellOverlays === 'function') dismissShellOverlays();
    document.getElementById('appShell')?.classList.remove('sidebar-open');

    const panel = document.getElementById('notificationCenter');
    const backdrop = document.getElementById('notificationCenterBackdrop');
    if (!panel) return;

    panel.classList.add('open');
    backdrop?.classList.add('open');
    backdrop?.setAttribute('aria-hidden', 'false');
    panel.setAttribute('aria-hidden', 'false');
    state.open = true;

    renderTabs();
    fetchNotifications({ reset: true });
  }

  function closeNotificationCenter() {
    const panel = document.getElementById('notificationCenter');
    const backdrop = document.getElementById('notificationCenterBackdrop');
    panel?.classList.remove('open');
    backdrop?.classList.remove('open');
    backdrop?.setAttribute('aria-hidden', 'true');
    panel?.setAttribute('aria-hidden', 'true');
    state.open = false;
    window.closeProfileMenu?.();
  }

  function init() {
    const bell = document.getElementById('topbarNotificationsBtn');
    const sidebarBtn = document.querySelector('[data-nav="notifications"]');
    const closeBtn = document.getElementById('ncCloseBtn');
    const backdrop = document.getElementById('notificationCenterBackdrop');
    const loadMore = document.getElementById('ncLoadMoreBtn');
    const markAll = document.getElementById('ncMarkAllBtn');

    bell?.addEventListener('click', (e) => {
      e.preventDefault();
      openNotificationCenter();
    });

    sidebarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      openNotificationCenter();
    });

    closeBtn?.addEventListener('click', closeNotificationCenter);
    backdrop?.addEventListener('click', closeNotificationCenter);
    loadMore?.addEventListener('click', () => fetchNotifications({ reset: false }));
    markAll?.addEventListener('click', markAllNotificationsRead);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) closeNotificationCenter();
    });

    loadNotificationCount();
    setInterval(loadNotificationCount, POLL_MS);
  }

  window.showNotifications = openNotificationCenter;
  window.openNotificationCenter = openNotificationCenter;
  window.closeNotificationCenter = closeNotificationCenter;
  window.loadNotificationCount = loadNotificationCount;
  window.markAllNotificationsRead = markAllNotificationsRead;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
