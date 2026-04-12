import crypto from 'crypto';
import pkg from 'pg';

const { Pool } = pkg;

const baseUrl = process.env.AUTH_BASE_URL || 'http://localhost:3001/api/auth';
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:BoFGapolkDlHsoPiOTzhJMhxpCibElvB@crossover.proxy.rlwy.net:32792/railway';
const captchaToken = process.env.E2E_HCAPTCHA_TOKEN || '10000000-aaaa-bbbb-cccc-000000000001';

const stamp = Date.now();
const username = `e2e_user_${stamp}`;
const email = `umjuan123+e2e${stamp}@gmail.com`;
const password = 'Str0ng!Test123';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const result = {
  username,
  email,
};

async function getCsrfContext() {
  const csrfRes = await fetch(`${baseUrl}/csrf-token`);
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfTokenFromBody = csrfBody?.csrfToken;
  const rawSetCookie = csrfRes.headers.get('set-cookie') || '';
  const cookieMatch = rawSetCookie.match(/csrf_token=[^;]+/);
  const csrfCookie = cookieMatch ? cookieMatch[0] : (csrfTokenFromBody ? `csrf_token=${csrfTokenFromBody}` : '');
  const csrfTokenFromCookie = csrfCookie.startsWith('csrf_token=') ? csrfCookie.slice('csrf_token='.length) : '';
  const csrfHeaderToken = csrfTokenFromCookie || csrfTokenFromBody || '';

  return {
    status: csrfRes.status,
    csrfTokenFromBody,
    csrfHeaderToken,
    csrfCookie,
    hasCookieHeader: !!rawSetCookie,
  };
}

async function postWithCsrf(path, payload, csrf) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrf.csrfHeaderToken,
      cookie: csrf.csrfCookie,
    },
    body: JSON.stringify(payload),
  });
}

async function main() {
  try {
    const csrf = await getCsrfContext();
    result.csrfInit = csrf;

    const registerRes = await postWithCsrf(
      '/register',
      {
        username,
        email,
        password,
        avatar: 1,
        captchaToken,
      },
      csrf
    );

    result.registerStatus = registerRes.status;
    result.registerBody = await registerRes.json().catch(() => ({ parseError: true }));

    const dbAfterRegister = await pool.query(
      `SELECT id,
              email_verified,
              is_verified,
              (verification_token IS NOT NULL) AS has_verification_token,
              verification_token_expires_at,
              verification_attempts,
              last_verification_email_sent_at
         FROM users
        WHERE email = $1`,
      [email]
    );

    result.dbAfterRegister = dbAfterRegister.rows[0] ?? null;

    const userId = dbAfterRegister.rows[0]?.id;

    if (userId) {
      try {
        const emailLogs = await pool.query(
          `SELECT status, token, sent_at
             FROM email_verification_logs
            WHERE user_id = $1
            ORDER BY sent_at DESC
            LIMIT 3`,
          [userId]
        );

        result.emailLogs = emailLogs.rows;
      } catch (err) {
        result.emailLogs = [];
        result.emailLogsError = err?.message || String(err);
      }
    } else {
      result.emailLogs = [];
    }

    const preVerifyLoginRes = await postWithCsrf(
      '/login',
      { username, password, captchaToken },
      csrf
    );

    result.preVerifyLoginStatus = preVerifyLoginRes.status;
    result.preVerifyLoginBody = await preVerifyLoginRes.json().catch(() => ({ parseError: true }));

    // Token in DB is stored hashed, so we inject a known test token hash to exercise
    // the same verification endpoint path used in production.
    const knownToken = `manualverify_${stamp}_abcdefghijklmnopqrstuvwxyz123456`;
    const hashed = crypto.createHash('sha256').update(knownToken).digest('hex');

    if (userId) {
      await pool.query(
        `UPDATE users
            SET verification_token = $1,
                verification_token_expires_at = NOW() + INTERVAL '1 hour'
          WHERE id = $2`,
        [hashed, userId]
      );
    }

    const verifyRes = await fetch(`${baseUrl}/email-verification/verify/${knownToken}`);
    result.verifyStatus = verifyRes.status;
    result.verifyBody = await verifyRes.json().catch(() => ({ parseError: true }));

    if (userId) {
      const dbAfterVerify = await pool.query(
        `SELECT email_verified, is_verified, verification_token
           FROM users
          WHERE id = $1`,
        [userId]
      );

      result.dbAfterVerify = dbAfterVerify.rows[0] ?? null;
    } else {
      result.dbAfterVerify = null;
    }

    const postVerifyLoginRes = await postWithCsrf(
      '/login',
      { username, password, captchaToken },
      csrf
    );

    result.postVerifyLoginStatus = postVerifyLoginRes.status;

    const postVerifyLoginBody = await postVerifyLoginRes
      .json()
      .catch(() => ({ parseError: true }));

    result.postVerifyLoginBody = {
      hasUser: !!postVerifyLoginBody?.user,
      requires2FA: !!postVerifyLoginBody?.requires_2fa,
      error: postVerifyLoginBody?.error,
      message: postVerifyLoginBody?.message,
    };

    // Cleanup test account best-effort to avoid polluting production data.
    if (userId) {
      const cleanupSteps = [];

      try {
        await pool.query('DELETE FROM email_verification_logs WHERE user_id = $1', [userId]);
        cleanupSteps.push('deleted_email_verification_logs');
      } catch (err) {
        cleanupSteps.push(`skip_email_verification_logs:${err?.message || String(err)}`);
      }

      try {
        await pool.query('DELETE FROM security_logs WHERE user_id = $1', [userId]);
        cleanupSteps.push('deleted_security_logs');
      } catch (err) {
        cleanupSteps.push(`skip_security_logs:${err?.message || String(err)}`);
      }

      try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        cleanupSteps.push('deleted_test_user');
      } catch (err) {
        cleanupSteps.push(`skip_user_delete:${err?.message || String(err)}`);
      }

      result.cleanup = cleanupSteps;
    } else {
      result.cleanup = 'skipped_no_user';
    }

    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 0;
  } catch (error) {
    result.error = {
      message: error?.message || String(error),
      stack: error?.stack || null,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
