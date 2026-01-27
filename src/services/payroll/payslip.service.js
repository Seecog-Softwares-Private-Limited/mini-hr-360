// import Payslip from '../../models/payroll/Payslip.js';
// import PayrollRunItem from '../../models/payroll/PayrollRunItem.js';
// import { generatePayslipPdf } from './payslipPdf.service.js';



// export const generate = async (runId) => {
//   const items = await PayrollRunItem.findAll({
//     where: { payrollRunId: runId },
//   });

//   for (const item of items) {
//     await Payslip.create({
//       payrollRunId: runId,
//       employeeId: item.employeeId,
//       month: new Date().toISOString().slice(0, 7),
//       status: 'GENERATED',
//     });
//   }

//   return { count: items.length };
// };

// export const publish = async (runId) => {
//   await Payslip.update(
//     { status: 'PUBLISHED', publishedAt: new Date() },
//     { where: { payrollRunId: runId } }
//   );

//   return true;
// };


import Payslip from '../../models/payroll.Payslip.js';
import PayrollRunItem from '../../models/PayrollRunItem.js';
import PayrollRun from '../../models/payroll.PayrollRun.js';
import { generatePayslipPdf } from './payslipPdf.service.js';
import { ApiError } from '../../utils/ApiError.js';

export const generate = async (runId) => {

  // 🔒 1. LOCK VALIDATION (as per payroll flow)
  const payrollRun = await PayrollRun.findByPk(runId);

  if (!payrollRun) {
    throw new ApiError(404, 'Payroll run not found');
  }

  if (payrollRun.status !== 'LOCKED') {
    throw new ApiError(
      400,
      'Payslips can only be generated after payroll is locked'
    );
  }

  // 🛑 2. DUPLICATE PREVENTION (idempotency)
  const existingPayslipCount = await Payslip.count({
    where: { payrollRunId: runId },
  });

  if (existingPayslipCount > 0) {
    throw new ApiError(
      400,
      'Payslips have already been generated for this payroll run'
    );
  }

  // 📄 3. Fetch payroll register items
  const items = await PayrollRunItem.findAll({
    where: { payrollRunId: runId },
  });

  let generatedCount = 0;

  for (const item of items) {

    // 4️⃣ Create payslip record
    const payslip = await Payslip.create({
      payrollRunId: runId,
      employeeId: item.employeeId,
      month: new Date().toISOString().slice(0, 7),
      status: 'GENERATED',
    });

    // 5️⃣ Generate PDF using payroll register data
    const pdfPath = await generatePayslipPdf(payslip, item);

    // 6️⃣ Save PDF path (audit-safe)
    await payslip.update({ pdfPath });

    generatedCount++;
  }

  return {
    count: generatedCount,
    message: 'Payslips generated successfully',
  };
};

export const publish = async (runId) => {

  // 🔒 Optional safety: ensure payslips exist before publish
  const count = await Payslip.count({
    where: { payrollRunId: runId },
  });

  if (count === 0) {
    throw new ApiError(
      400,
      'No payslips found to publish for this payroll run'
    );
  }

  await Payslip.update(
    {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    {
      where: {
        payrollRunId: runId,
        status: 'GENERATED',
      },
    }
  );

  return true;
};
