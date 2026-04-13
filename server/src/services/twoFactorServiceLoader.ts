type TwoFactorServiceModule = typeof import('./twoFactorService.js');

let cachedService: TwoFactorServiceModule | null = null;
let loadAttempted = false;
let envStatusLogged = false;

function hasDedicatedTwoFactorKey(): boolean {
  return String(process.env.TWO_FACTOR_ENCRYPTION_KEY || '').trim().length > 0;
}

function hasFallbackJwtKey(): boolean {
  return String(process.env.JWT_SECRET || '').trim().length > 0;
}

function logTwoFactorEnvStatusOnce(): void {
  if (envStatusLogged) {
    return;
  }
  envStatusLogged = true;

  if (hasDedicatedTwoFactorKey()) {
    console.log('[2FA] TWO_FACTOR_ENCRYPTION_KEY detected.');
    return;
  }

  if (hasFallbackJwtKey()) {
    console.warn(
      '[2FA] TWO_FACTOR_ENCRYPTION_KEY is not set. Falling back to JWT_SECRET. Rotating JWT_SECRET can break existing 2FA secrets.'
    );
    return;
  }

  console.error(
    '[2FA] Missing encryption key: set TWO_FACTOR_ENCRYPTION_KEY (recommended) or JWT_SECRET. 2FA service will be unavailable.'
  );
}

export async function getTwoFactorService(): Promise<TwoFactorServiceModule | null> {
  logTwoFactorEnvStatusOnce();

  if (!hasDedicatedTwoFactorKey() && !hasFallbackJwtKey()) {
    return null;
  }

  if (cachedService) {
    return cachedService;
  }

  if (loadAttempted) {
    return null;
  }

  loadAttempted = true;

  try {
    cachedService = await import('./twoFactorService.js');
    return cachedService;
  } catch (error) {
    console.error('[2FA] Failed to initialize twoFactorService. 2FA endpoints will return 503.', error);
    return null;
  }
}
