(function () {
  async function loadSetupBanner() {
    const container = document.getElementById('setupBannerContainer');
    if (!container) return;

    const role = localStorage.getItem('userRole') || '';
    const allowed = ['admin', 'SUPER_ADMIN', 'shop_owner', 'HR_MANAGER', 'HR_EXECUTIVE'].includes(role);
    if (!allowed) return;

    try {
      const token = localStorage.getItem('accessToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const orgId = typeof getOrganizationId === 'function' ? getOrganizationId() : localStorage.getItem('mh360:organizationId');
      if (orgId) headers['x-business-id'] = orgId;

      const res = await fetch('/api/setup/status', { credentials: 'include', headers });
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      if (data.setupCompleted) return;

      const critical = (data.missingItems || []).filter((m) => m.severity === 'critical');
      container.classList.remove('d-none');
      container.innerHTML = `
        <div class="setup-banner">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
            <div>
              <strong><i class="fas fa-wand-magic-sparkles me-2 text-primary"></i>Company setup is ${data.score || 0}% complete</strong>
              <div class="small text-muted mt-1">Complete setup to unlock payroll readiness.</div>
            </div>
            <a href="/admin/setup" class="btn btn-primary btn-sm">Continue Setup</a>
          </div>
          <div class="setup-progress-bar mb-2"><div class="setup-progress-fill" style="width:${data.score || 0}%"></div></div>
          ${critical.length ? `<div class="small"><strong>Missing critical items:</strong><ul class="mb-0 ps-3">${critical.map((m) => `<li>${m.message}</li>`).join('')}</ul></div>` : ''}
        </div>
        <div class="setup-health-card mb-4 d-none" id="setupHealthCard">
          <div class="d-flex justify-content-between"><span class="fw-semibold">Setup Health</span><span class="badge bg-primary">${data.score || 0}%</span></div>
        </div>`;

      if (['admin', 'SUPER_ADMIN', 'shop_owner', 'HR_MANAGER'].includes(role)) {
        document.getElementById('setupHealthCard')?.classList.remove('d-none');
      }

      // Redirect owner/admin on first visit if setup very incomplete
      if (['admin', 'SUPER_ADMIN', 'shop_owner'].includes(role) && (data.score || 0) < 25 && !sessionStorage.getItem('setupRedirected')) {
        sessionStorage.setItem('setupRedirected', '1');
        if (window.location.pathname === '/dashboard') {
          // Soft prompt only — don't force redirect to avoid disrupting returning users
        }
      }
    } catch (e) {
      console.warn('Setup banner failed', e);
    }
  }

  document.addEventListener('DOMContentLoaded', loadSetupBanner);
})();
