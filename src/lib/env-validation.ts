/**
 * Production environment validation — server-side only.
 * This runs at module load time so missing variables cause a clear
 * startup/build error instead of silent runtime failures.
 */

function requireEnvServer(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[ENV VALIDATION] Missing required server environment variable: ${name}. ` +
        `Configure it in your production environment or .env.local for development. ` +
        `Do not expose real secrets in .env.example.`
    );
  }
  return value;
}

export function validateProductionEnv(): void {
  // Database
  requireEnvServer("LIBSQL_URL");

  // Authentication environment variables (if using default accounts)
  try {
    requireEnvServer("DEFAULT_ADMIN_EMAIL");
    requireEnvServer("DEFAULT_ADMIN_PASSWORD_HASH");
  } catch {
    // Default credentials are development-only; skip strict validation
    // in production if the application relies only on DB users.
  }

  // Session cookie security
  if (process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "true") {
    console.warn(
      "[ENV WARNING] SESSION_COOKIE_SECURE is not set to 'true' in production. " +
        "Session cookies will not use the Secure flag."
    );
  }
}
