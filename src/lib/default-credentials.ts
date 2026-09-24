import type { Role } from "./constants";

export type DefaultCredential = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId: string | null;
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

function buildCredential(
  id: string,
  role: string,
  envPrefix: string
): DefaultCredential {
  const email = requireEnv(`${envPrefix}_EMAIL`);
  const passwordHash = requireEnv(`${envPrefix}_PASSWORD_HASH`);
  const firstName = requireEnv(`${envPrefix}_FIRST_NAME`);
  const lastName = requireEnv(`${envPrefix}_LAST_NAME`);
  const roleValue = requireEnv(`${envPrefix}_ROLE`);

  if (!["admin", "lgu", "school", "barangay"].includes(roleValue)) {
    throw new Error(
      `Invalid role for default credential ${envPrefix}: ${roleValue}. ` +
        `Expected one of admin, lgu, school, barangay.`
    );
  }

  return {
    id,
    email,
    passwordHash,
    firstName,
    lastName,
    role: roleValue as Role,
    schoolId: optionalEnv(`${envPrefix}_SCHOOL_ID`),
    barangayId: optionalEnv(`${envPrefix}_BARANGAY_ID`),
  };
}

/**
 * Development-only accounts resolved without reading the users table.
 * Credentials are configured through server-only environment variables.
 * Never expose these variables through NEXT_PUBLIC_*.
 */
export const DEFAULT_CREDENTIALS: readonly DefaultCredential[] = [
  buildCredential("default-admin", "admin", "DEFAULT_ADMIN"),
  buildCredential("default-lgu", "lgu", "DEFAULT_LGU"),
  buildCredential("default-school", "school", "DEFAULT_SCHOOL"),
  buildCredential("default-barangay", "barangay", "DEFAULT_BARANGAY"),
];

export function findDefaultCredential(email: string): DefaultCredential | undefined {
  return DEFAULT_CREDENTIALS.find((credential) => credential.email === email);
}

export function isDefaultUserId(userId: string): boolean {
  return userId.startsWith("default-");
}
