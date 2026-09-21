"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { countOtherActiveAdmins, getAuthorizedUser, hashPassword } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { userFormSchema } from "@/lib/schemas";
import type { Role } from "@/lib/constants";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/** Create a new system user (admin only). */
export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("users.manage");
  const { ip } = await sessionMetadata();
  if (!user || user.role !== "admin") return fail("Only administrators can manage users.");

  const parsed = userFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const data = parsed.data;

  const role: Role = data.role;
  if (role === "admin" && user.role !== "admin") return fail("Cannot create an administrator.");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length > 0) return fail("A user with this email already exists.");

  if (!data.password) return fail("A password is required when creating a user.");

  const newId = crypto.randomUUID();
  await db.insert(users).values({
    id: newId,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    firstName: data.firstName,
    lastName: data.lastName,
    role,
    schoolId: data.schoolId || null,
    barangayId: data.barangayId || null,
    isActive: data.isActive ?? true,
  });

  await notify({
    userId: newId,
    type: "system",
    title: "Account created",
    body: "Your account has been created. Sign in with the email and password provided by your administrator.",
    link: "/login",
  });

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "user.create",
    entity: "user",
    entityId: newId,
    result: "success",
    metadata: { email: data.email, role },
    ip,
  });

  revalidatePath("/users");
  return ok("User created.");
}

/** Update a system user (admin only). Blank password = keep existing. */
export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.manage");
  const { ip } = await sessionMetadata();
  if (!actor || actor.role !== "admin") return fail("Only administrators can manage users.");

  const userId = String(formData.get("userId") ?? "");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target) return fail("User not found.");
  if (target.role === "admin" && actor.id === target.id) {
    // Self-edits by the acting admin: role/active must not lock out the last admin.
  }

  const parsed = userFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const data = parsed.data;

  const targetRole = data.role as Role;

  // Prevent demoting/deactivating the last active admin.
  const demoting = targetRole !== "admin" && target.role === "admin";
  const deactivating = !(data.isActive ?? true) && target.isActive === true;
  if ((demoting || deactivating) && target.role === "admin") {
    const others = await countOtherActiveAdmins(target.id);
    if (others === 0) return fail("Cannot change the last active administrator.");
  }

  const emailConflict = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, data.email), eq(users.id, target.id)))
    .limit(1);
  void emailConflict; // email uniqueness is enforced by the DB; we update only this row.

  await db
    .update(users)
    .set({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: targetRole,
      schoolId: data.schoolId || null,
      barangayId: data.barangayId || null,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id));

  if (data.password) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(data.password) })
      .where(eq(users.id, target.id));
  }

  await logAudit({
    userId: actor.id,
    userRole: actor.role,
    action: "user.update",
    entity: "user",
    entityId: target.id,
    result: "success",
    metadata: { email: data.email, role: targetRole, resetPassword: Boolean(data.password) },
    ip,
  });

  revalidatePath("/users");
  return ok("User updated.");
}