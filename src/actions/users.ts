"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { countOtherActiveAdmins, getAuthorizedUser, hashPassword } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { userFormSchema } from "@/lib/schemas";
import { ROLE_IDS } from "./helpers";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | null | undefined): string | null =>
  value && value.trim() ? value.trim() : null;

/** Create a new system user (users.create permission). */
export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.create");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only administrators can manage users.");

  const parsed = userFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const data = parsed.data;

  // Role escalation guard: only admins may create admins.
  if (data.roleId === ROLE_IDS.admin && actor.role !== "admin") {
    return fail("Cannot create an administrator.");
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  if (existing.length > 0) return fail("A user with this email already exists.");

  if (!data.password) return fail("A password is required when creating a user.");

  const newId = crypto.randomUUID();
  await db.insert(users).values({
    id: newId,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    firstName: data.firstName,
    middleName: scrub(data.middleName),
    lastName: data.lastName,
    roleId: data.roleId,
    barangayId: scrub(data.barangayId),
    phone: scrub(data.phone),
    isActive: data.isActive ?? true,
  });

  await notify({
    userId: newId,
    type: "system",
    title: "Account created",
    message:
      "Your account has been created. Sign in with the email and password provided by your administrator.",
    link: "/login",
  });

  await logAudit({
    userId: actor.id,
    action: "CREATE_USER",
    entityType: "user",
    entityId: newId,
    newValues: { email: data.email, roleId: data.roleId },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok("User created.");
}

/** Update a system user (users.update permission). Blank password = keep existing. */
export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only administrators can manage users.");

  const userId = String(formData.get("userId") ?? "");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target) return fail("User not found.");

  const parsed = userFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const data = parsed.data;

  // Prevent demoting/deactivating the last active admin.
  const demoting = data.roleId !== ROLE_IDS.admin && target.roleId === ROLE_IDS.admin;
  const deactivating = !(data.isActive ?? true) && target.isActive === true;
  if (demoting || deactivating) {
    const others = await countOtherActiveAdmins(target.id);
    if (others === 0) return fail("Cannot change the last active administrator.");
  }

  // Email uniqueness (excluding this row).
  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, data.email), ne(users.id, target.id)))
    .limit(1);
  if (conflict.length > 0) return fail("A user with this email already exists.");

  await db
    .update(users)
    .set({
      email: data.email,
      firstName: data.firstName,
      middleName: scrub(data.middleName),
      lastName: data.lastName,
      roleId: data.roleId,
      barangayId: scrub(data.barangayId),
      phone: scrub(data.phone),
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
    action: "UPDATE_USER",
    entityType: "user",
    entityId: target.id,
    oldValues: { roleId: target.roleId, isActive: target.isActive },
    newValues: { roleId: data.roleId, isActive: data.isActive ?? true, resetPassword: Boolean(data.password) },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok("User updated.");
}

/** Deactivate (never delete) a user (users.disable permission). */
export async function deactivateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getAuthorizedUser("users.disable");
  const { ip, userAgent } = await sessionMetadata();
  if (!actor) return fail("Only administrators can manage users.");

  const userId = String(formData.get("userId") ?? "");
  if (userId === actor.id) return fail("You cannot deactivate your own account.");

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = rows[0];
  if (!target) return fail("User not found.");

  if (target.roleId === ROLE_IDS.admin && target.isActive) {
    const others = await countOtherActiveAdmins(target.id);
    if (others === 0) return fail("Cannot deactivate the last active administrator.");
  }

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, target.id));

  await logAudit({
    userId: actor.id,
    action: "DISABLE_USER",
    entityType: "user",
    entityId: target.id,
    oldValues: { isActive: target.isActive },
    newValues: { isActive: false },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/users");
  return ok("User deactivated. Historical records are preserved.");
}
