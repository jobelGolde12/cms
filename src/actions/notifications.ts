"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, type ActionState } from "./helpers";
import { z } from "zod";

const notificationReadSchema = z.object({
  ids: z.array(z.string().min(1, "Invalid notification ID").max(36)).min(1).optional(),
});

/** Mark the given notifications as read (owned by the current user). */
export async function markNotificationsRead(
  _prev: ActionState,
  ids: string[],
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You must be signed in.");

  const parsed = notificationReadSchema.safeParse({ ids });
  if (!parsed.success) {
    return fail("Invalid notification selection.");
  }
  const validIds = parsed.data.ids ?? ids;
  if (!validIds.length) return ok();

  // Security: only allow IDs that are UUID-like (prevent injection)
  const sanitized = validIds.filter((id) => /^[a-zA-Z0-9\-]+$/.test(id));
  if (sanitized.length === 0) return fail("Invalid notification IDs.");

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), inArray(notifications.id, sanitized)));

  revalidatePath("/notifications");
  return ok();
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.userId, user.id));

  revalidatePath("/notifications");
}
