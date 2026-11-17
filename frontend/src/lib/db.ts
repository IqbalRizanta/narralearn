import Dexie, { type Table } from "dexie";

import type {
  Module,
  ModuleContent,
  OfflineModule,
  SpeakerProfile,
  StyleMode,
} from "./types";

class NarraLearnDB extends Dexie {
  speakerProfiles!: Table<SpeakerProfile, number>;
  offlineModules!: Table<OfflineModule, string>;

  constructor() {
    super("narralearn");
    this.version(1).stores({
      speakerProfiles: "++id, label, createdAt, provider",
      offlineModules: "id, sessionId, styleMode, savedAt",
    });
  }
}

export const db = new NarraLearnDB();

export async function saveProfile(
  profile: Omit<SpeakerProfile, "id">,
): Promise<number> {
  return db.speakerProfiles.add(profile);
}

export async function deleteProfile(id: number): Promise<void> {
  await db.speakerProfiles.delete(id);
}

export async function renameProfile(id: number, label: string): Promise<void> {
  await db.speakerProfiles.update(id, { label });
}

export async function cacheModule(
  module: Module,
  sessionTitle: string,
): Promise<void> {
  const content = module.content_json as ModuleContent;
  if (!content?.sections?.length) return;
  const entry: OfflineModule = {
    id: `${module.session_id}:${module.style_mode}`,
    sessionId: module.session_id,
    sessionTitle,
    styleMode: module.style_mode,
    content,
    savedAt: new Date().toISOString(),
  };
  await db.offlineModules.put(entry);
}

export async function getCachedModule(
  sessionId: string,
  styleMode: StyleMode,
): Promise<OfflineModule | undefined> {
  return db.offlineModules.get(`${sessionId}:${styleMode}`);
}

export async function deleteCachedModule(
  sessionId: string,
  styleMode: StyleMode,
): Promise<void> {
  await db.offlineModules.delete(`${sessionId}:${styleMode}`);
}

export async function clearOfflineModules(): Promise<void> {
  await db.offlineModules.clear();
}

export async function exportProfiles(): Promise<string> {
  const profiles = await db.speakerProfiles.toArray();
  return JSON.stringify(
    {
      app: "narralearn",
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles,
    },
    null,
    2,
  );
}

export async function importProfiles(raw: string): Promise<number> {
  const parsed: unknown = JSON.parse(raw);
  const records =
    parsed && typeof parsed === "object" && "profiles" in parsed
      ? (parsed as { profiles: unknown }).profiles
      : parsed;
  if (!Array.isArray(records)) {
    throw new Error("Format file tidak dikenali.");
  }

  let imported = 0;
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const item = record as Partial<SpeakerProfile>;
    if (
      typeof item.label !== "string" ||
      typeof item.embedding !== "string" ||
      item.embedding.length === 0
    ) {
      continue;
    }
    await db.speakerProfiles.add({
      label: item.label.slice(0, 60) || "Profil suara",
      embedding: item.embedding,
      dimension: typeof item.dimension === "number" ? item.dimension : 0,
      provider: typeof item.provider === "string" ? item.provider : "unknown",
      score: typeof item.score === "number" ? item.score : 0,
      createdAt:
        typeof item.createdAt === "string"
          ? item.createdAt
          : new Date().toISOString(),
    });
    imported += 1;
  }
  return imported;
}
