/**
 * Employee Portal — sidebar groups, live timer, heatmap helpers
 */
(function () {
  'use strict';

  function initSidebarGroups() {
    document.querySelectorAll('[data-emp-nav-toggle]').forEach((btn) => {
      const targetId = btn.getAttribute('data-emp-nav-toggle');
      const panel = document.getElementById(targetId);
      if (!panel) return;

      const storageKey = `emp-nav-${targetId}`;
      const hasActiveChild = panel.querySelector('.nav-link.active');
      const saved = localStorage.getItem(storageKey);
      const expanded = hasActiveChild || saved === 'open';

      panel.style.display = expanded ? 'block' : 'none';
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

      btn.addEventListener('click', () => {
        const isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        localStorage.setItem(storageKey, isOpen ? 'closed' : 'open');
      });
    });
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }

  let timerInterval = null;

  function initLiveTimer() {
    const el = document.getElementById('liveWorkTimer');
    const ring = document.getElementById('punchStatusRing');
    if (!el) return;

    const checkInIso = el.dataset.checkIn;
    const isWorking = el.dataset.working === 'true';

    if (!isWorking || !checkInIso) {
      el.textContent = '00:00:00';
      if (ring) ring.classList.add('out');
      return;
    }

    if (ring) {
      ring.classList.remove('out');
      ring.classList.add('working');
    }

    const checkIn = new Date(checkInIso).getTime();

    function tick() {
      el.textContent = formatDuration(Date.now() - checkIn);
    }

    tick();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  function initGeoBadge() {
    const badge = document.getElementById('geoStatusBadge');
    if (!badge || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      () => {
        badge.classList.remove('off');
        badge.innerHTML = '<i class="fa-solid fa-location-dot"></i> Location enabled';
      },
      () => {
        badge.classList.add('off');
        badge.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Enable location for geo attendance';
      },
      { timeout: 8000 }
    );
  }

  function initMethodTabs() {
    document.querySelectorAll('.emp-method-tab:not(.disabled)').forEach((tab) => {
      tab.addEventListener('click', () => {
        const group = tab.closest('.emp-method-tabs');
        if (!group) return;
        group.querySelectorAll('.emp-method-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const panelId = tab.dataset.panel;
        if (panelId) {
          document.querySelectorAll('[data-method-panel]').forEach((p) => {
            p.style.display = p.dataset.methodPanel === panelId ? 'block' : 'none';
          });
        }
      });
    });
  }

  function buildHeatmap(containerId, monthData, year, month) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    const statusMap = {};
    (monthData || []).forEach((d) => {
      statusMap[d.date] = d;
    });

    const today = new Date().toISOString().split('T')[0];
    let html = '';

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dow = new Date(year, month - 1, day).getDay();
      const summary = statusMap[dateStr];
      let cls = 'emp-heatmap-cell';

      if (dateStr > today) {
        cls += ' future';
      } else if (dow === 0 || dow === 6) {
        cls += ' weekend';
      } else if (summary?.status === 'ABSENT') {
        cls += ' absent';
      } else if (summary?.status === 'LEAVE' || summary?.status === 'ON_LEAVE') {
        cls += ' leave';
      } else if (summary?.status === 'PRESENT' || summary?.status === 'HALF_DAY') {
        const mins = summary.workMinutes || summary.totalWorkMinutes || 480;
        const level = mins >= 480 ? 4 : mins >= 360 ? 3 : mins >= 240 ? 2 : 1;
        cls += ` level-${level}`;
      } else {
        cls += ' level-0';
      }

      const title = summary
        ? `${dateStr}: ${summary.status}${summary.workMinutes ? ` (${summary.workMinutes}m)` : ''}`
        : dateStr;
      html += `<div class="${cls}" title="${title}"></div>`;
    }

    container.innerHTML = html;
  }

  window.empBuildHeatmap = buildHeatmap;

  document.addEventListener('DOMContentLoaded', () => {
    initSidebarGroups();
    initLiveTimer();
    initGeoBadge();
    initMethodTabs();
  });

  window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
  });
})();
