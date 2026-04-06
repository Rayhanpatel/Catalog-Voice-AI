# AGENTS.md

## Project goal
Build a separate project called `wine-boutique-world` that focuses only on the 3D wine boutique room/world, first-person movement, camera constraints, room bounds, and a placeholder sommelier NPC interaction shell.

Do **not** integrate the existing Wine Voice Explorer app yet. This repo must stay fully separate for now. The future voice/recommendation layer will be added later.

## Product intent
This should feel like a premium, compact wine boutique experience on the web.

The user should feel like they just entered the boutique from the front door and are standing inside a curated, intimate room.

This should **not** feel like:
- a game demo
- a giant explorable world
- a metaverse space
- a bar simulator
- a heavy physics sandbox

## Scope for v1
Build only:
- 3D room/world shell
- first-person camera
- human eye-height lock
- floor-only WASD movement
- room bounds / blocked zones
- spawn at the door
- placeholder sommelier NPC position
- simple “Talk to sommelier” interaction prompt
- simple debug/tuning system for positions and bounds

Do **not** build yet:
- voice AI integration
- recommendation engine integration
- ecommerce / cart
- multiplayer
- complex game systems
- advanced NPC behaviors
- heavy physics system unless explicitly necessary

## Technical preferences
- Use TypeScript
- Use Vite + React
- Prefer React Three Fiber / Three.js
- Keep dependencies minimal
- Prefer lightweight custom movement and collision/bounds logic
- Do not add a heavy physics engine unless clearly justified
- Keep the architecture modular and easy to extend later

## Room / movement rules
- Player must spawn just inside the front door
- Spawn should be centered with the doorway and face inward into the boutique
- Camera must stay at human eye height (~1.65m)
- Movement must stay on the floor only
- Looking up and pressing W must never move the player upward or out of the room
- Vertical look angle should be limited to natural human-like range
- Movement should be slow, controlled, and premium
- Player must remain inside the room
- For v1, do not allow the player to exit through the doorway
- Keep movement mostly inside the central walkable corridor / open floor path
- Block movement into shelves, walls, furniture, and behind the bar

## NPC rules
- Add only a placeholder sommelier NPC position for now
- NPC should be visible soon after spawn
- NPC does not need real animation or voice in v1
- A simple marker / placeholder is acceptable
- Add a simple interaction prompt near the NPC: “Talk to sommelier”

## Asset strategy
- The repo includes a real World Labs / Marble world asset in `.spz` format
- Treat `.spz` as a binary asset, not a text file
- Load the world through a dedicated asset wrapper/component
- If loading the real `.spz` asset is straightforward, use it
- If real asset loading slows progress, first build a placeholder room shell matching the boutique layout
- Keep world asset loading swappable so the real asset can be plugged in later
- Do not block core progress on spawn, camera, movement, bounds, collisions, and NPC placeholder because of asset-loading complexity

## Reference images
- The repo also contains reference images (`world-image-1.png` to `world-image-4.png`)
- Use them only as visual/layout references for understanding the room
- They should help infer the room shape, doorway position, shelving side, bar side, and central corridor
- Do not depend on them as runtime assets unless explicitly needed
- Use them especially if `.spz` loading is delayed or difficult in the first pass

## Debug / tuning requirements
Add an easy way to tune:
- spawn position
- spawn rotation
- eye height
- movement speed
- look limits
- room bounds
- blocked zones
- NPC position

Prefer a simple config object or lightweight debug UI.

## Delivery expectations
- Plan before coding
- Propose architecture first
- Propose folder/file structure first
- List assumptions clearly before implementation
- Build milestone by milestone
- After each milestone, explain:
  - what changed
  - how to test it
- Keep the first working version simple and practical
- Do not overengineer
- Optimize for a clean MVP that can later connect to Wine Voice Explorer