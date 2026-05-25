import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Profile {
  id: string;
  name: string;
  description: string;
  language?: string;
  created_at: string;
}

const DIR = join(homedir(), ".presend");
const FILE = join(DIR, "profiles.json");

function ensure(): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, "[]", "utf8");
}

function load(): Profile[] {
  ensure();
  try {
    const raw = readFileSync(FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save(list: Profile[]): void {
  ensure();
  writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

export function listProfiles(): Profile[] {
  return load();
}

export function getProfile(id: string): Profile | undefined {
  return load().find((p) => p.id === id);
}

export function upsertProfile(input: {
  id: string;
  name: string;
  description: string;
  language?: string;
}): Profile {
  const list = load();
  const idx = list.findIndex((p) => p.id === input.id);
  const profile: Profile = {
    id: input.id,
    name: input.name,
    description: input.description,
    language: input.language,
    created_at: idx >= 0 ? list[idx].created_at : new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = profile;
  else list.push(profile);
  save(list);
  return profile;
}

export function deleteProfile(id: string): boolean {
  const list = load();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
}

export function formatProfileList(list: Profile[]): string {
  if (list.length === 0) return "No saved profiles.";
  return list
    .map(
      (p) =>
        `• ${p.id} — ${p.name}${p.language ? ` [${p.language}]` : ""}\n  ${p.description}`,
    )
    .join("\n\n");
}
