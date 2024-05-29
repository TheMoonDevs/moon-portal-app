"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRoot() {
  revalidatePath("/quicklinks", "layout");
}

export async function dynamicRevalidate(
  path: string,
  type?: "layout" | "page" | undefined
) {
  revalidatePath(path, type);
}
