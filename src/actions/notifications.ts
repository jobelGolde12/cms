"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, type ActionState } from "./helpers";

/** Mark the given notifications as read (owned by the current user). */
export async function markNotificationsRead(
  _prev: ActionState,
  ids: string[],
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");
  if (!ids.length) return ok();

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), inArray(notifications.id, ids)));

  revalidatePath("/notifications");
  return ok();
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.userId, user.id));

  revalidatePath("/notifications");
  return ok();
}
