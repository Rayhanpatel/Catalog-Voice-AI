# Premium Boutique SPZ Preset

This file captures the tuned room-shell setup that currently feels right in this repo, and explains the pattern so it can be reused in another project.

Code preset:

- [premiumBoutiqueSpzPreset.ts](../src/config/presets/premiumBoutiqueSpzPreset.ts)

Default export used by this app:

- [tuningDefaults.ts](../src/config/tuningDefaults.ts)

## What This Preset Encodes

The preset is not just a spawn point. It packages the full room-shell behavior:

- first-person spawn just inside the boutique entrance
- fixed human eye height
- slow floor-only movement
- clamped look pitch
- room bounds
- walkable corridor zones
- blocked zones for shelving, bar, and doorway exit control
- sommelier anchor and talk radius
- presentation-mode defaults for the room itself

## Reusable Idea

The main idea is to treat a premium boutique as a guided interior corridor, not as a free-roam game world.

Use this pattern when you want:

- a compact first-person luxury interior
- elegant, controlled movement
- simple, understandable collision logic
- a scene shell that stays separate from a future recommendation or voice layer

## Pattern To Reuse In Another Project

Copy these pieces together:

1. Asset layer
- keep the real room asset behind a wrapper component such as [WorldAssetMount.tsx](../src/features/world/WorldAssetMount.tsx)
- keep scene logic independent from the asset format

2. Tuning layer
- store room behavior in a single preset object rather than scattering values through components
- keep spawn, bounds, walkable zones, blocked zones, and NPC anchor in one place

3. Movement layer
- use yaw-only movement so `W` never moves the player upward when looking up
- clamp camera height to a fixed eye level
- clamp vertical look angles for a natural boutique feel

4. Collision layer
- use a simple `XZ` planar model
- combine outer room bounds with allowed walkable zones
- layer blocked zones on top for shelves, bars, pedestals, and exit blockers

5. Interaction seam
- keep the NPC presence, prompt, and interaction trigger in this shell project
- attach future voice or commerce logic only at the interaction boundary

## Current Tuned Intent

This preset assumes:

- the player begins just inside the front door looking inward
- the accessible path is the main boutique floor, not the shelving or behind-bar zones
- the doorway is visually open but behaviorally blocked for v1
- the sommelier is visible and reachable without exploring a large world

## How To Port It

If you want to reuse this in another project:

1. Copy [premiumBoutiqueSpzPreset.ts](../src/config/presets/premiumBoutiqueSpzPreset.ts).
2. Copy the shared types from [types.ts](../src/lib/types.ts) if the target project does not already have equivalent types.
3. Reuse the planar collision helpers from [bounds2d.ts](../src/lib/bounds2d.ts).
4. Reuse the controller logic from [FirstPersonController.tsx](../src/features/player/FirstPersonController.tsx).
5. Reuse the calibration approach from [CalibrationMap.tsx](../src/features/debug/CalibrationMap.tsx) when fitting the preset to a different room asset.
6. Keep presentation mode separate from tuning mode so the same preset can ship cleanly and still be adjusted in development.

Developer-only helper visibility now lives in runtime state rather than inside the saved preset, so the preset stays focused on spatial behavior only.

## Recommendation

For this repo, keep this preset as the working default until we do the next polish pass.

For another repo, start by importing this preset unchanged, then only retune:

- spawn
- room bounds
- walkable zones
- blocked zones
- NPC anchor

That keeps the behavior consistent even when the room asset changes.
