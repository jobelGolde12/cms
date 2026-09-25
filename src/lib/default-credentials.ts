import type { Role } from "./constants";

/**
 * Development/initial accounts resolved from server-only environment
 * variables (see .env.example). Credentials are NEVER hard-coded here and
 * NEVER exposed to the client — this module is imported by server code only.
 */
export type DefaultCredential = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  barangayId: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required authentication environment variable: ${name}. ` +
        `Please configure it in .env.local (development) or your hosting environment. ` +
        `Never commit real credential values to the repository.`
    );
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function buildCredential(id: string, envPrefix: string): DefaultCredential {
  const email = requireEnv(`${envPrefix}_EMAIL`);
  const passwordHash = requireEnv(`${envPrefix}_PASSWORD_HASH`);
  const firstName = requireEnv(`${envPrefix}_FIRST_NAME`);
  const lastName = requireEnv(`${envPrefix}_LAST_NAME`);
  const roleValue = requireEnv(`${envPrefix}_ROLE`);

  const allowed: Role[] = ["admin", "lgu", "barangay"];
  if (!allowed.includes(roleValue as Role)) {
    throw new Error(
      `Invalid role for default credential ${envPrefix}: ${roleValue}. ` +
        `Expected one of: ${allowed.join(", ")}. There is NO school role.`
    );
  }

  return {
    id,
    email,
    passwordHash,
    firstName,
    lastName,
    role: roleValue as Role,
    barangayId: optionalEnv(`${envPrefix}_BARANGAY_ID`),
  };
}

/**
 * Development-only accounts. The seed script also inserts these rows into the
 * users table (upsert by email) so barangay scoping works out of the box.
 */
export const DEFAULT_CREDENTIALS: readonly DefaultCredential[] = [
  buildCredential("default-admin", "DEFAULT_ADMIN"),
  buildCredential("default-lgu", "DEFAULT_LGU"),
  buildCredential("default-barangay", "DEFAULT_BARANGAY"),
];

export function findDefaultCredential(email: string): DefaultCredential | undefined {
  return DEFAULT_CREDENTIALS.find((credential) => credential.email === email);
}

export function isDefaultUserId(userId: string): boolean {
  return userId.startsWith("default-");
}
