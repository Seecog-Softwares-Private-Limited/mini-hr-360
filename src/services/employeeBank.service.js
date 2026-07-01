import EmployeeBankDetail from '../models/EmployeeBankDetail.js';

const BANK_FIELDS = [
  'bankName',
  'accountNumber',
  'accountHolderName',
  'ifscCode',
  'branchName',
];

const STATUTORY_FIELDS = [
  'panNumber',
  'uanNumber',
  'esiNumber',
  'aadhaarNumber',
  'taxDeclarationStatus',
];

const ALL_FIELDS = [...BANK_FIELDS, ...STATUTORY_FIELDS];

export async function getOrCreateBankDetails(employeeId) {
  let bank = await EmployeeBankDetail.findOne({ where: { employeeId } });
  if (!bank) {
    bank = await EmployeeBankDetail.create({ employeeId });
  }
  return bank;
}

export async function getEmployeeBankDetails(employeeId) {
  const bank = await getOrCreateBankDetails(employeeId);
  return bank.get({ plain: true });
}

export async function upsertEmployeeBankDetails(employeeId, payload = {}) {
  const bank = await getOrCreateBankDetails(employeeId);
  const updates = {};

  ALL_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      updates[field] = payload[field] === '' ? null : payload[field];
    }
  });

  if (Object.keys(updates).length) {
    await bank.update(updates);
  }

  return bank.get({ plain: true });
}
