import { supabase } from "@/integrations/supabase/client";
import type { ShipId } from "@/game/ships";

export type ShipUpgrades = { power: number; speed: number; defense: number };
export type AllUpgrades = Partial<Record<ShipId, ShipUpgrades>>;

export interface Progress {
  diamonds: number;
  coins: number;
  owned_ships: ShipId[];
  active_ship: ShipId;
  upgrades: AllUpgrades;
  max_region: number;
  max_level: number;
  best_score: number;
}

const EMPTY: Progress = {
  diamonds: 0, coins: 0,
  owned_ships: ["interceptor"],
  active_ship: "interceptor",
  upgrades: {},
  max_region: 1, max_level: 1, best_score: 0,
};

export function emptyUpgrades(): ShipUpgrades {
  return { power: 0, speed: 0, defense: 0 };
}
export function shipUpgrades(p: Progress, id: ShipId): ShipUpgrades {
  return p.upgrades[id] ?? emptyUpgrades();
}

export async function loadProgress(userId: string): Promise<Progress> {
  const { data, error } = await supabase
    .from("pilot_progress" as any)
    .select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) return EMPTY;
  return {
    diamonds: data.diamonds ?? 0,
    coins: data.coins ?? 0,
    owned_ships: (data.owned_ships ?? ["interceptor"]) as ShipId[],
    active_ship: (data.active_ship ?? "interceptor") as ShipId,
    upgrades: (data.upgrades ?? {}) as AllUpgrades,
    max_region: data.max_region ?? 1,
    max_level: data.max_level ?? 1,
    best_score: data.best_score ?? 0,
  };
}

export async function saveProgress(userId: string, patch: Partial<Progress>): Promise<void> {
  await supabase.from("pilot_progress" as any).upsert({
    user_id: userId,
    ...patch,
  }, { onConflict: "user_id" });
}