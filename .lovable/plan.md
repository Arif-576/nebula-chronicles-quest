## What I'll build

### 1. Stay-logged-in
Session already persists in localStorage. The slow part is the auth screen re-checking on every cold load. I'll hydrate the saved session synchronously on app start so returning verified users skip the login screen entirely (no flash, no refetch).

### 2. Cloud progress (per account)
New table `pilot_progress` keyed to the user with:
- `diamonds`, `coins`
- `owned_ships` (array of ship ids, defaults to `["interceptor"]`)
- `active_ship`
- `upgrades` (JSON: `{power, speed, defense}` per ship)
- `max_region`, `max_level`, `best_score`

Loaded once after login, written after each run / purchase / upgrade. RLS scoped to `auth.uid()`.

### 3. World: 6 regions × 10 levels (60 stages)
```text
R1 Nebula Reach    L1-10
R2 Crimson Belt    L11-20
R3 Ion Storm       L21-30
R4 Void Spires     L31-40
R5 Ashen Expanse   L41-50
R6 Star Devourer   L51-60
```
Each region: unique palette, parallax tint, enemy palette, mini-boss every 5 levels, region boss at level 10. Region unlocks when previous region's boss is cleared. Difficulty curve raises enemy HP, speed, fire-rate, and spawn density per level — markedly harder than today.

### 4. Reward box after every boss
Animated chest opens with:
- Diamonds (5–40, scales with region)
- Coins (50–500, scales with region)
- Small chance of a one-run buff
Banner + sound, then auto-collect into cloud progress.

### 5. Hangar page (`/hangar`)
Protected route. Grid of 9 ships: 1 free + 8 locked behind diamond costs (e.g. 25, 60, 120, 200, 350, 500, 750, 1200). Each card shows stats, lock state, "Buy" / "Equip" actions, and an Upgrade panel for the active ship:
- Power (damage) — coins
- Speed — coins
- Defense (max HP) — coins
Upgrade cost ramps per level, capped at level 10 per stat.

### 6. Menu integration
Main menu shows: pilot name, diamonds, coins, current region/level, "Hangar" button, "Resume from L#" button.

## Technical notes

- New file `src/routes/hangar.tsx` (route-guarded by checking session; redirects to `/` if signed out).
- `src/lib/progress.ts` — client helper around supabase queries (get, save, purchase, upgrade) — RLS-scoped so the browser client is fine, no server fn needed.
- Refactor `src/routes/index.tsx`:
  - Pull `SHIPS`, `BOSSES`, `WEAPONS` into `src/game/data.ts`
  - Add `REGIONS` config + difficulty multipliers
  - Reward-box overlay component
  - Apply ship upgrades to damage/speed/HP at run start
- Migration adds `pilot_progress` table with GRANTs and RLS.
- Auth screen: synchronous session check on mount so verified users land on menu instantly.

After your approval I'll ship it in one pass (migration first, then code).