import { JWTCustomClaims, UserRole } from '../api/types';

/**
 * Pure TypeScript Base64URL decoder for JWT payloads.
 * Avoids native binary dependency issues and safely extracts user claims.
 */
export function decodeJwt(token: string): JWTCustomClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Base64URL to Base64
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64 string
    const decodedStr = atob(base64);
    const parsed = JSON.parse(decodedStr);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      id: parsed.id || '',
      email: parsed.email || '',
      role: (parsed.role as UserRole) || 'parent',
      exp: parsed.exp || 0,
      iat: parsed.iat || 0,
    };
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(claims: JWTCustomClaims | null): boolean {
  if (!claims || !claims.exp) {
    return true;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return claims.exp < currentTime;
}
