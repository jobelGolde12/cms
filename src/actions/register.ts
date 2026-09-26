"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { fail, ok, zodFieldErrors, type ActionState } from "./helpers";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.email("Enter a valid email address").max(120),
  roleId: z.enum(["role-admin", "role-lgu", "role-barangay"], {
    message: "Select a valid operational role",
  }),
  barangayId: z.string().optional().or(z.literal("")),
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

  if (password !== confirmPassword) {
    return fail("Passwords do not match.");
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return fail("This email is already registered.");
  }

  const hash = await hashPassword(password);

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

  return ok("Registration complete. You may now sign in.");
}
