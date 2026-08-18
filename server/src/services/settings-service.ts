import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { workspaceSettings } from "../db/schema.js";
import type { Settings, UpdateSettingsRequest } from "@docu-mind/shared";

const SETTINGS_ROW_ID = 1;

export async function getSettings(): Promise<Settings> {
  const row = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.id, SETTINGS_ROW_ID),
  });

  if (!row) {
    const [created] = await db.insert(workspaceSettings).values({ id: SETTINGS_ROW_ID }).returning();
    return toSettingsDto(created);
  }

  return toSettingsDto(row);
}

export async function updateSettings(input: UpdateSettingsRequest): Promise<Settings> {
  const [row] = await db
    .update(workspaceSettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(workspaceSettings.id, SETTINGS_ROW_ID))
    .returning();

  return toSettingsDto(row);
}

function toSettingsDto(row: typeof workspaceSettings.$inferSelect): Settings {
  return {
    workspaceName: row.workspaceName,
    showLowConfidenceWarnings: row.showLowConfidenceWarnings,
    defaultScope: row.defaultScope,
    theme: row.theme as Settings["theme"],
  };
}
