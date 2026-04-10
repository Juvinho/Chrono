/**
 * hCaptcha verification service
 * Validates hCaptcha tokens on the backend
 */

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

/**
 * Verify hCaptcha token
 * @param token The hCaptcha token from the frontend
 * @returns Promise with verification result
 */
export async function verifyHCaptcha(token: string): Promise<{
  success: boolean;
  challenge_ts: string;
  hostname: string;
  error_codes?: string[];
}> {
  const secret = process.env.HCAPTCHA_SECRET;

  if (!secret) {
    console.error('HCAPTCHA_SECRET not set in environment variables');
    throw new Error('hCaptcha configuration error');
  }

  if (!token) {
    throw new Error('hCaptcha token is required');
  }

  try {
    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secret,
        response: token,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`hCaptcha verification failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      challenge_ts: string;
      hostname: string;
      error_codes?: string[];
    };
    return data;
  } catch (error) {
    console.error('hCaptcha verification error:', error);
    throw new Error('Failed to verify hCaptcha token');
  }
}

/**
 * Validate hCaptcha token and check success status
 * Throws error if verification fails or token is invalid
 */
export async function validateHCaptcha(token: string): Promise<boolean> {
  try {
    const result = await verifyHCaptcha(token);
    
    if (!result.success) {
      console.warn('hCaptcha verification failed:', result.error_codes);
      return false;
    }

    return true;
  } catch (error) {
    console.error('hCaptcha validation error:', error);
    return false;
  }
}
