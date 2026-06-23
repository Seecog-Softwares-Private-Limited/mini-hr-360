import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '2d';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

/**
 * Generate employee-specific tokens with employeeId claim
 */
export function buildEmployeeTokenPair(employeeId, businessId) {
  const accessToken = jwt.sign(
    { employeeId: employeeId.toString(), businessId: businessId?.toString(), type: 'employee' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = jwt.sign(
    { employeeId: employeeId.toString(), businessId: businessId?.toString(), type: 'employee' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  const decoded = jwt.decode(refreshToken);
  const refreshExp = decoded?.exp ?? null;

  return { accessToken, refreshToken, refreshExp };
}
