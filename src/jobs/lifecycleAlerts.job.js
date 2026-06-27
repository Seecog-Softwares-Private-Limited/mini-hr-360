import { Business } from '../models/Business.js';
import DocumentApprovalRequest from '../models/DocumentApprovalRequest.js';
import {
  getProbationEndingSoon,
  getContractEndingSoon,
  getExitsInProgress,
} from '../services/lifecycleAlerts.service.js';
import { notifyLifecycleAlert } from '../services/lifecycleNotification.service.js';
import { sendDocumentEmail } from '../utils/emailService.js';
import { buildLifecycleDigestEmail } from '../services/lifecycleEmail.service.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const lastRunByBusiness = new Map();

function shouldNotify(businessId, alertKey) {
  const key = `${businessId}:${alertKey}`;
  const last = lastRunByBusiness.get(key);
  const now = Date.now();
  if (last && now - last < MS_PER_DAY) return false;
  lastRunByBusiness.set(key, now);
  return true;
}

async function processBusinessAlerts(businessId) {
  const business = await Business.findByPk(businessId, { attributes: ['id', 'businessName'] });
  const digestItems = [];

  const [probation, contracts] = await Promise.all([
    getProbationEndingSoon(businessId, 14),
    getContractEndingSoon(businessId, 30),
  ]);

  for (const emp of contracts.filter((e) => e.daysRemaining <= 14)) {
    if (!shouldNotify(businessId, `contract-${emp.id}`)) continue;
    const title = `Contract ending: ${emp.empName}`;
    const message = `${emp.employeeType} contract ends on ${emp.contractEndDate} (${emp.daysRemaining} days). Renew or start non-renewal exit.`;
    const link = `/contract-workflow/${emp.id}`;
    digestItems.push({ title, message, link });
    await notifyLifecycleAlert({
      businessId,
      title,
      message,
      link,
      priority: emp.daysRemaining <= 7 ? 'HIGH' : 'MEDIUM',
      metadata: { event: 'contract_expiry_alert', employeeId: emp.id },
    }).catch(() => {});
  }

  for (const emp of probation.filter((e) => e.daysRemaining <= 7)) {
    if (!shouldNotify(businessId, `probation-${emp.id}`)) continue;
    const title = `Probation ending: ${emp.empName}`;
    const message = `Probation ends ${emp.probationEndDate}. Confirm employee or plan next steps.`;
    const link = `/onboarding-workflow/${emp.id}`;
    digestItems.push({ title, message, link });
    await notifyLifecycleAlert({
      businessId,
      title,
      message,
      link,
      priority: 'MEDIUM',
      metadata: { event: 'probation_end_alert', employeeId: emp.id },
    }).catch(() => {});
  }

  const pendingOffers = await DocumentApprovalRequest.count({
    where: { businessId, status: 'pending' },
  });
  if (pendingOffers > 0 && shouldNotify(businessId, 'pending-offer-approvals')) {
    const title = `${pendingOffers} offer letter(s) pending approval`;
    const message = 'Review and approve queued offer letters before they can be emailed to candidates.';
    digestItems.push({ title, message, link: '/document-approvals' });
    await notifyLifecycleAlert({
      businessId,
      title,
      message,
      link: '/document-approvals',
      priority: 'HIGH',
      metadata: { event: 'pending_offer_approvals', count: pendingOffers },
    }).catch(() => {});
  }

  const exits = await getExitsInProgress(businessId, 20);
  for (const emp of exits) {
    if (!emp.lastWorkingDay) continue;
    const lwd = new Date(emp.lastWorkingDay);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    lwd.setHours(0, 0, 0, 0);
    const days = Math.ceil((lwd - now) / (1000 * 60 * 60 * 24));
    if (days > 7 || days < 0) continue;
    if (!shouldNotify(businessId, `exit-lwd-${emp.id}`)) continue;
    const title = `Exit LWD approaching: ${emp.empName}`;
    const message = `Last working day ${emp.lastWorkingDay} (${days} days). Complete exit documents and clearance.`;
    const link = emp.href || `/exit-workflow/${emp.id}`;
    digestItems.push({ title, message, link });
    await notifyLifecycleAlert({
      businessId,
      title,
      message,
      link,
      priority: days <= 3 ? 'HIGH' : 'MEDIUM',
      metadata: { event: 'exit_lwd_alert', employeeId: emp.id, days },
    }).catch(() => {});
  }

  if (digestItems.length && process.env.HR_CC_EMAIL && process.env.SMTP_USER) {
    const digestKey = `digest-email-${businessId}`;
    if (shouldNotify(businessId, digestKey)) {
      const { subject, html } = buildLifecycleDigestEmail({
        businessName: business?.businessName,
        items: digestItems,
      });
      await sendDocumentEmail({
        to: process.env.HR_CC_EMAIL,
        subject,
        html,
      }).catch((e) => console.warn('Lifecycle digest email failed:', e.message));
    }
  }
}

export async function runLifecycleAlertsOnce() {
  const businesses = await Business.findAll({
    attributes: ['id'],
    raw: true,
  });

  for (const b of businesses) {
    try {
      await processBusinessAlerts(b.id);
    } catch (err) {
      console.warn(`Lifecycle alerts failed for business ${b.id}:`, err.message);
    }
  }
}

/** Daily lifecycle alert digest (contract expiry, probation end) */
export function startLifecycleAlertsJob() {
  const intervalMs = Number(process.env.LIFECYCLE_ALERTS_INTERVAL_MS) || MS_PER_DAY;

  setTimeout(() => {
    runLifecycleAlertsOnce().catch((e) => console.warn('Lifecycle alerts job:', e.message));
  }, 60_000);

  setInterval(() => {
    runLifecycleAlertsOnce().catch((e) => console.warn('Lifecycle alerts job:', e.message));
  }, intervalMs);

  console.log(`📅 Lifecycle alerts job scheduled (every ${Math.round(intervalMs / MS_PER_DAY)} day(s))`);
}
