"use server";

import { db } from "@/db";
import { barangays } from "@/db/schema";

export async function getBarangays(): Promise<{ id: string; name: string }[]> {
  const rows = await db.select({ id: barangays.id, name: barangays.name }).from(barangays).orderBy(barangays.name);
  return rows;
}
