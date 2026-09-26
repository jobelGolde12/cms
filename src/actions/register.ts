"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, barangays } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { fail, ok, zodFieldErrors, type ActionState } from "./helpers";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  roleId: z.enum(["role-admin", "role-lgu", "role-barangay"], {
    message: "Select a valid operational role",
  }),
  barangayId: z.string().min(1, "Select an assigned barangay."),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(8, "Confirm password is required").max(128),
});

export async function registerUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return fail("Check the form fields.", zodFieldErrors(parsed.error.issues));
  }

  const { firstName, lastName, email, roleId, barangayId, password, confirmPassword } = parsed.data;

  // Server-side enforcement of privacy agreement (not just client-side checkbox)
  const agreedRaw = raw.agreed;
  const agreed = String(agreedRaw ?? "").toLowerCase() === "on" || String(agreedRaw ?? "") === "true";
  if (!agreed) {
    return fail("You must agree to the privacy and protection policy to register.");
  }

  if (password !== confirmPassword) {
    return fail("Passwords do not match.");
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return fail("This email is already registered.");
  }

  if (!barangayId || barangayId === "") {
    return fail("Select an assigned barangay.", { barangayId: "Select an assigned barangay." });
  }

  const validBarangay = await db.select().from(barangays).where(eq(barangays.id, barangayId)).limit(1);
  if (!validBarangay[0]) {
    return fail("Invalid barangay selected.", { barangayId: "Invalid barangay selected." });
  }

  const hash = await hashPassword(password);

  try {
    await db.insert(users).values({
      id: randomUUID(),
      roleId,
      barangayId: barangayId || null,
      firstName,
      lastName,
      email,
      passwordHash: hash,
      isActive: true,
    });
  } catch (dbError: unknown) {
    // Handle DB-level unique constraint violation (race condition on duplicate email)
    const message = String(dbError ?? "");
    if (message.includes("users_email_uq") || message.includes("UNIQUE constraint failed") || message.includes("unique")) {
      return fail("This email is already registered.");
    }
    console.error("[register] unexpected DB error during user creation", dbError);
    return fail("Something went wrong during registration. Please try again.");
  }

  return ok("Registration complete. You may now sign in.");
}
