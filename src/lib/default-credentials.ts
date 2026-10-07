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

function buildCredential(id: string, envPrefix: string, role: Role): DefaultCredential {
  return {
    id,
    email: requireEnv(`${envPrefix}_EMAIL`),
    passwordHash: requireEnv(`${envPrefix}_PASSWORD_HASH`),
    firstName: requireEnv(`${envPrefix}_FIRST_NAME`),
    lastName: requireEnv(`${envPrefix}_LAST_NAME`),
    role,
  };
}

/**
 * Development-only accounts. The seed script also inserts these rows into the
 * users table (upsert by email) so role scoping works out of the box.
 */
export const DEFAULT_CREDENTIALS: readonly DefaultCredential[] = [
  buildCredential("default-admin", "DEFAULT_ADMIN", "admin"),
  buildCredential("default-school-admin", "DEFAULT_SCHOOL_ADMIN", "school_admin"),
  buildCredential("default-teacher", "DEFAULT_TEACHER", "teacher"),
  buildCredential("default-records", "DEFAULT_RECORDS", "records"),
  buildCredential("default-guidance", "DEFAULT_GUIDANCE", "guidance"),
];

export function findDefaultCredential(email: string): DefaultCredential | undefined {
  return DEFAULT_CREDENTIALS.find((credential) => credential.email === email);
}

export function isDefaultUserId(userId: string): boolean {
  return userId.startsWith("default-");
}
