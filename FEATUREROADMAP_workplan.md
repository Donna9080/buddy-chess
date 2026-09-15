# Buddy — Feature Roadmap & Work Plan

How to read this document:
- Each `[ ]` is one task. I'll check it off `[x]` as it's completed.
- **Depends on** — tasks that must be done first.
- **Files** — what gets created or changed.
- **Definition of Done (DoD)** — the specific, checkable bar for "finished."
- Every task ships on its own branch, gets committed, pushed, and opened as a
  pull request against `main` — I never force-push, and I'll always tell you
  when a PR is ready so you can look at it (or just say "merge it").

Order of phases matches the priority in the brief: get **Hot-Seat** live on
the internet first, then the **Computer** opponent, then **Online** rooms,
then **Tutor**, then the optional **extra** — with a "Phase 0" and "Phase 1"
in front of Hot-Seat because the chess rules have to be proven correct, and
the site has to be deployable, before any mode can be built on top of them.

See [ProductSpec.md](ProductSpec.md) for the reasoning behind every
architecture choice referenced here.

---

## Phase 0 — Rules Engine Foundation

Nothing else can be trusted until this phase passes. No UI is built here on
purpose.

- [x] **T0.1 — Project scaffold** ([PR #2](https://github.com/Donna9080/buddy-chess/pull/2))
  - Depends on: nothing
  - Files: `package.json`, `wrangler.jsonc`
  - DoD: `npx wrangler dev` starts a local Worker serving an empty page with
    no errors. `wrangler.jsonc` has `compatibility_date` set to the day this
    task is done, `observability` enabled, and a static-assets config with
    `not_found_handling: "single-page-application"`. No Durable Object
    binding yet — that's added in Phase 4 once the Room class exists.

- [x] **T0.2 — Write `rules.js`** ([PR #3](https://github.com/Donna9080/buddy-chess/pull/3))
  - Depends on: T0.1
  - Files: `src/rules.js`
  - DoD: one dependency-free JavaScript module that can (a) list every legal
    move for whoever's turn it is in a given position, (b) apply a move to a
    position, (c) detect check, checkmate, and stalemate, (d) handle both
    sides of castling, en passant, and pawn promotion to any of the four
    pieces. No chess library used anywhere.

- [x] **T0.3 — Perft correctness test** ([PR #4](https://github.com/Donna9080/buddy-chess/pull/4))
  - Depends on: T0.2
  - Files: `src/rules.test.js`, `package.json` (test script)
  - DoD: `npm test` runs and confirms move counts from the starting position
    of **20** (depth 1), **400** (depth 2), and **8,902** (depth 3), exactly.
    This must be green before Phase 2 starts.

---

## Phase 1 — Deploy Skeleton

Goal: prove the whole pipeline (code → Cloudflare → public URL) works before
building anything players will actually see.

- [ ] **T1.1 — Static placeholder page, deployed**
  - Depends on: T0.1
  - Files: `public/index.html`, `wrangler.jsonc`
  - DoD: `npx wrangler deploy` publishes a live `*.workers.dev` URL showing a
    simple "Buddy is coming soon" page. This URL gets pasted into README.md.

---

## Phase 2 — Hot-Seat Mode + The Look

This is the first fully playable milestone, and the priority the brief calls
out explicitly: **hot-seat live on the internet, first.**

- [ ] **T2.1 — Board rendering + one theme**
  - Depends on: T0.2, T0.3, T1.1
  - Files: `public/hotseat.html`, `public/js/board.js`, `public/css/base.css`,
    `public/css/theme-adult.css`
  - DoD: the board renders the starting position from `rules.js`; clicking a
    piece highlights only its legal destination squares; squares that aren't
    legal targets simply don't respond to clicks. One theme (Adult/Classic)
    is fully styled.

- [ ] **T2.2 — Full hot-seat gameplay loop**
  - Depends on: T2.1
  - Files: `public/js/hotseat.js`
  - DoD: two people can play a complete, legal game start to finish on one
    screen — turns alternate automatically, castling/en passant/promotion
    (with a piece-choice prompt) all work, and check, checkmate, and
    stalemate each end the game with a clear on-screen message. It is
    impossible to attempt an illegal move.

- [ ] **T2.3 — Theme switcher + remaining 4 themes**
  - Depends on: T2.1
  - Files: `public/css/theme-children.css`, `theme-cool.css`,
    `theme-messy.css`, `theme-professional.css`, `public/js/theme-switcher.js`
  - DoD: a visible control lets the player switch among all 5 themes at any
    time; the chosen theme is remembered on that browser for next visit;
    every theme keeps legal-move highlighting clearly visible.

- [ ] **T2.4 — Deploy Hot-Seat live**
  - Depends on: T2.2, T2.3
  - Files: `public/index.html` (mode picker linking to Hot-Seat)
  - DoD: Hot-Seat is playable start-to-finish at the public URL. **This is
    the milestone the brief prioritizes above everything else.**

---

## Phase 3 — Vs Computer

- [ ] **T3.1 — Minimax + alpha-beta engine**
  - Depends on: T0.2, T0.3
  - Files: `public/js/ai.js`
  - DoD: given any legal position, returns a legal move. At depth 2, always
    responds within 2 seconds in a normal desktop browser (measured, not
    estimated). A quick check confirms depth 2 actually searches deeper than
    depth 1 (i.e., it changes the chosen move on at least one test position,
    proving it isn't just picking randomly).

- [ ] **T3.2 — Vs Computer UI**
  - Depends on: T3.1, T2.2
  - Files: `public/vscomputer.html`, `public/js/vscomputer.js`
  - DoD: before the game starts, the player picks White or Black and a
    difficulty (Easy=depth 1, Medium=depth 2, Hard=depth 3 if it still meets
    the 2-second budget, otherwise capped at depth 2 — see ProductSpec §5).
    The browser then plays the other color automatically, using the full
    rule set (promotion prompts, castling, etc.) exactly as Hot-Seat does.

- [ ] **T3.3 — Deploy Vs Computer live**
  - Depends on: T3.2
  - Files: `public/index.html` (mode picker)
  - DoD: reachable and fully playable from the public URL.

---

## Phase 4 — Online Rooms

- [ ] **T4.1 — Durable Object scaffold**
  - Depends on: T0.2, T0.3, T1.1
  - Files: `src/worker.js`, `src/room.js`, `wrangler.jsonc` (Durable Object
    binding + `new_sqlite_classes` migration)
  - DoD: connecting a WebSocket to a room path upgrades successfully;
    `env.ROOM.getByName(roomCode)` reliably returns the *same* object for the
    same code across separate connections (verified with a logged internal
    ID).

- [ ] **T4.2 — Room state + SQLite persistence**
  - Depends on: T4.1
  - Files: `src/room.js`
  - DoD: the board position, whose turn it is, and each seat's player token
    are stored in the Durable Object's built-in SQLite storage and saved
    immediately after every move — no timers or periodic saves anywhere. The
    object can be forcibly restarted and still remembers the exact position.

- [ ] **T4.3 — Seat assignment + server-side move validation**
  - Depends on: T4.2, T0.2
  - Files: `src/room.js`
  - DoD: first connection to a room is seated White, second is Black,
    everyone else is a spectator. Every move message received is checked
    against `rules.js` on the server before being applied or broadcast — a
    hand-crafted illegal move sent directly to the server is rejected.

- [ ] **T4.4 — Reconnect-safe player identity**
  - Depends on: T4.3
  - Files: `public/js/online.js`, `src/room.js`
  - DoD: refreshing the page reconnects the same browser to the same seat
    and immediately shows the current position, using a token stored in the
    browser and matched via `ws.serializeAttachment()`.

- [ ] **T4.5 — Online UI + New Game**
  - Depends on: T4.4, T2.1
  - Files: `public/online.html`, `public/js/online.js`
  - DoD: two different devices entering the same room code see each other's
    moves appear live, with no page refresh needed. A **New Game** button
    resets the board for both players in place (same room code, same seats).

- [ ] **T4.6 — Deploy Online rooms live**
  - Depends on: T4.5
  - Files: `public/index.html` (mode picker)
  - DoD: verified working across two genuinely different devices (e.g. your
    phone and your laptop) over the public internet.

---

## Phase 5 — Tutor

- [ ] **T5.1 — Move-quality explainer**
  - Depends on: T3.1
  - Files: `public/js/tutor.js`
  - DoD: for any position, produces the single best move plus one
    plain-English reason drawn from a short, recognizable set of categories
    (material gain, check/checkmate, king safety, center control, piece
    development). See ProductSpec §7 for the scoping decision this assumes —
    flag it now if you want the two-player version instead.

- [ ] **T5.2 — Tutor picker + coaching UI**
  - Depends on: T5.1
  - Files: `public/tutor.html`, `public/js/tutor.js`
  - DoD: player picks a tutor persona (cosmetic only); the tutor's advice
    appears clearly before or after each move without blocking play.

- [ ] **T5.3 — Deploy Tutor mode live**
  - Depends on: T5.2
  - Files: `public/index.html` (mode picker)
  - DoD: reachable and fully working from the public URL.

---

## Phase 6 — Optional Extra (built last, on purpose)

The brief lists four possible extras and leaves the choice open. **Pick one
when we reach this phase** — no need to decide now:

- Undo, in Hot-Seat only
- Captured-pieces tray + running material count
- Sound effect on move
- Resign button, in Online mode

- [ ] **T6.1 — Build the chosen extra**
  - Depends on: whichever mode it applies to being live
  - Files: TBD based on the choice
  - DoD: TBD based on the choice — I'll write the specific bar once you pick.

---

## Open questions this plan assumes an answer to

Full detail in [ProductSpec.md §10](ProductSpec.md#10-decisions-i-made-that-need-your-ok).
Quick list: 5 themes vs. 4, Tutor mode scope (single-player vs. two-player +
tutor), difficulty→depth mapping, and the Phase 6 extra choice.
