import EmployeeAsset from '../models/EmployeeAsset.js';

const ASSET_TYPES = ['Laptop', 'Mobile', 'Access Card', 'Monitor', 'Headset', 'Other'];
const ASSET_STATUSES = ['Assigned', 'Returned', 'Lost', 'Damaged'];

export async function listEmployeeAssets(employeeId, businessId) {
  const rows = await EmployeeAsset.findAll({
    where: { employeeId, businessId },
    order: [['assignedDate', 'DESC'], ['createdAt', 'DESC']],
  });
  return rows.map((r) => r.get({ plain: true }));
}

export async function getEmployeeAssetSummary(employeeId, businessId) {
  const assets = await listEmployeeAssets(employeeId, businessId);
  return {
    total: assets.length,
    assigned: assets.filter((a) => a.status === 'Assigned').length,
    returned: assets.filter((a) => a.status === 'Returned').length,
    other: assets.filter((a) => !['Assigned', 'Returned'].includes(a.status)).length,
  };
}

export async function assignEmployeeAsset(employeeId, businessId, payload = {}, actorUserId = null) {
  const assetName = String(payload.assetName || '').trim();
  if (!assetName) {
    const err = new Error('Asset name is required');
    err.statusCode = 400;
    throw err;
  }

  const assetType = ASSET_TYPES.includes(payload.assetType) ? payload.assetType : 'Other';

  const asset = await EmployeeAsset.create({
    businessId,
    employeeId,
    assetType,
    assetName,
    assetTag: payload.assetTag?.trim() || null,
    brand: payload.brand?.trim() || null,
    model: payload.model?.trim() || null,
    assignedDate: payload.assignedDate || new Date().toISOString().split('T')[0],
    status: 'Assigned',
    notes: payload.notes?.trim() || null,
    assignedByUserId: actorUserId || null,
  });

  return asset.get({ plain: true });
}

export async function returnEmployeeAsset(assetId, employeeId, businessId, payload = {}) {
  const asset = await EmployeeAsset.findOne({
    where: { id: assetId, employeeId, businessId },
  });

  if (!asset) {
    const err = new Error('Asset not found');
    err.statusCode = 404;
    throw err;
  }

  const status = ASSET_STATUSES.includes(payload.status) ? payload.status : 'Returned';
  const returnedDate = payload.returnedDate || new Date().toISOString().split('T')[0];
  const noteLine = payload.notes?.trim();

  await asset.update({
    status,
    returnedDate,
    notes: noteLine
      ? [asset.notes, noteLine].filter(Boolean).join('\n')
      : asset.notes,
  });

  return asset.get({ plain: true });
}
