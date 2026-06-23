import { User } from '../models/User.js';
import {
  buildTokenPair,
  hashToken,
  verifyRefreshToken,
} from '../utils/token.util.js';

export async function rotateUserSession(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('invalid or expired refresh token');
    err.code = 'INVALID_REFRESH';
    throw err;
  }

  const user = await User.findByPk(decoded.sub);
  if (!user || !user.refreshTokens) {
    const err = new Error('no active session');
    err.code = 'NO_SESSION';
    throw err;
  }

  const now = new Date();
  if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt <= now) {
    const err = new Error('refresh token expired');
    err.code = 'REFRESH_EXPIRED';
    throw err;
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== user.refreshTokens) {
    user.refreshTokens = null;
    user.refreshTokenExpiresAt = null;
    await user.save();
    const err = new Error('refresh token mismatch; session revoked');
    err.code = 'REFRESH_MISMATCH';
    throw err;
  }

  const { accessToken, refreshToken: newRefresh, refreshExp } = buildTokenPair(user.id);

  user.refreshTokens = hashToken(newRefresh);
  user.refreshTokenExpiresAt = refreshExp ? new Date(refreshExp * 1000) : null;
  await user.save();

  return { accessToken, refreshToken: newRefresh, refreshExp, user };
}
