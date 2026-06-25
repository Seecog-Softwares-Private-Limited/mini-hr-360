/**
 * Remove all leave requests and approvals; reset balance used/pending.
 * Usage: node database/scripts/clear-leave-requests.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../property.env') });

async function main() {
  const { sequelize } = await import('../../src/db/index.js');
  const { LeaveRequest, LeaveApproval, LeaveBalance } = await import('../../src/models/index.js');

  await sequelize.authenticate();
  console.log('Connected to database');

  const requestCount = await LeaveRequest.count({ paranoid: false });
  const approvalCount = await LeaveApproval.count();

  await sequelize.transaction(async (t) => {
    await LeaveApproval.destroy({ where: {}, transaction: t });
    await LeaveRequest.destroy({ where: {}, force: true, transaction: t });
    await LeaveBalance.update(
      { used: 0, pending: 0 },
      { where: {}, transaction: t }
    );
  });

  console.log(`Deleted ${approvalCount} leave approval(s)`);
  console.log(`Deleted ${requestCount} leave request(s)`);
  console.log('Reset leave balance used/pending to 0');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
