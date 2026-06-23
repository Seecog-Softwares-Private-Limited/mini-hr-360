import Employee from '../models/Employee.js';
import { hashToken, verifyRefreshToken } from '../utils/token.util.js';
import { buildEmployeeTokenPair } from '../utils/employeeToken.util.js';

export async function rotateEmployeeSession(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('invalid or expired refresh token');
    err.code = 'INVALID_REFRESH';
    throw err;
  }

  if (!decoded?.employeeId || decoded?.type !== 'employee') {
    const err = new Error('invalid employee refresh token');
    err.code = 'INVALID_REFRESH';
    throw err;
  }

  const employee = await Employee.findByPk(decoded.employeeId);
  if (!employee || !employee.employeeRefreshToken) {
    const err = new Error('no active session');
    err.code = 'NO_SESSION';
    throw err;
  }

  const now = new Date();
  if (employee.employeeRefreshTokenExpiresAt && employee.employeeRefreshTokenExpiresAt <= now) {
    const err = new Error('refresh token expired');
    err.code = 'REFRESH_EXPIRED';
    throw err;
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== employee.employeeRefreshToken) {
    employee.employeeRefreshToken = null;
    employee.employeeRefreshTokenExpiresAt = null;
    await employee.save();
    const err = new Error('refresh token mismatch; session revoked');
    err.code = 'REFRESH_MISMATCH';
    throw err;
  }

  const { accessToken, refreshToken: newRefresh, refreshExp } = buildEmployeeTokenPair(
    employee.id,
    employee.businessId
  );

  employee.employeeRefreshToken = hashToken(newRefresh);
  employee.employeeRefreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
  await employee.save();

  return { accessToken, refreshToken: newRefresh, refreshExp, employee };
}
