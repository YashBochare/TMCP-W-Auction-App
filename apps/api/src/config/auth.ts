interface AuthConfig {
  jwtSecret: string;
  auctioneerPassword: string;
  jwtExpiry: string;
}

let _config: AuthConfig | undefined;

export function getAuthConfig(): AuthConfig {
  if (!_config) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 characters');
    }

    const auctioneerPassword = process.env.AUCTIONEER_PASSWORD;
    if (!auctioneerPassword) {
      throw new Error('AUCTIONEER_PASSWORD must be set');
    }

    _config = {
      jwtSecret,
      auctioneerPassword,
      jwtExpiry: process.env.JWT_EXPIRY || '8h',
    };
  }
  return _config;
}
