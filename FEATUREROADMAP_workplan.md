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
  - Files: `public/js/rules.js` *(moved here from `src/rules.js` just before T2.1 —
    the browser can only load files under `public/`, so this is the one physical
    location the browser, and later the server, both import from.)*
  - DoD: one dependency-free JavaScript module that can (a) list every legal
    move for whoever's turn it is in a given position, (b) apply a move to a
    position, (c) detect check, checkmate, and stalemate, (d) handle both
    sides of castling, en passant, and pawn promotion to any of the four
    pieces. No chess library used anywhere.

- [x] **T0.3 — Perft correctness test** ([PR #4](https://github.com/Donna9080/buddy-chess/pull/4))
  - Depends on: T0.2
  - Files: `public/js/rules.test.js`, `package.json` (test script)
  - DoD: `npm test` runs and confirms move counts from the starting position
    of **20** (depth 1), **400** (depth 2), and **8,902** (depth 3), exactly.
    This must be green before Phase 2 starts.

- [ ] **T0.4 — Detect insufficient-material draws** *(promoted from P1.1, round 1)*
  - Depends on: T0.2
  - Files: `public/js/rules.js`
  - DoD: `getStatus` returns a draw (e.g. `'draw-insufficient-material'`) for
    positions where neither side can possibly deliver checkmate with the
    pieces left on the board (king vs. king; king+bishop vs. king;
    king+knight vs. king). Distinct from the repetition/fifty-move rules
    ProductSpec §9 excludes — this rule is not excluded, it just hadn't been
    built yet. Add a covering test alongside T0.5.

- [ ] **T0.5 — Direct tests for castling, en passant, and promotion**
  *(promoted from P1.2, round 1)*
  - Depends on: T0.2, T0.3
  - Files: `public/js/rules.test.js`
  - DoD: `npm test` lists individually named, passing tests that isolate
    each of the three (e.g. "castling moves the rook," "en passant removes
    the right pawn," "a pawn reaching the last rank can promote to each of
    the four pieces") — not just the aggregate perft count these were
    previously only proven through indirectly.

---

## Phase 1 — Deploy Skeleton

Goal: prove the whole pipeline (code → Cloudflare → public URL) works before
building anything players will actually see.

- [x] **T1.1 — Static placeholder page, deployed** ([live](https://buddy-chess.dolgorsureng.workers.dev))
  - Depends on: T0.1
  - Files: `public/index.html`, `wrangler.jsonc`
  - DoD: `npx wrangler deploy` publishes a live `*.workers.dev` URL showing a
    simple "Buddy is coming soon" page. This URL gets pasted into README.md.

---

## Phase 2 — Hot-Seat Mode + The Look

This is the first fully playable milestone, and the priority the brief calls
out explicitly: **hot-seat live on the internet, first.**

- [x] **T2.1 — Board rendering + one theme** ([PR #8](https://github.com/Donna9080/buddy-chess/pull/8))
  - Depends on: T0.2, T0.3, T1.1
  - Files: `public/hotseat.html`, `public/js/board.js`, `public/css/base.css`,
    `public/css/theme-adult.css`
  - DoD: the board renders the starting position from `rules.js`; clicking a
    piece highlights only its legal destination squares; squares that aren't
    legal targets simply don't respond to clicks. One theme (Adult/Classic)
    is fully styled.

- [x] **T2.2 — Full hot-seat gameplay loop** ([PR #8](https://github.com/Donna9080/buddy-chess/pull/8))
  - Depends on: T2.1
  - Files: `public/js/hotseat.js`
  - DoD: two people can play a complete, legal game start to finish on one
    screen — turns alternate automatically, castling/en passant/promotion
    (with a piece-choice prompt) all work, and check, checkmate, and
    stalemate each end the game with a clear on-screen message. It is
    impossible to attempt an illegal move.

- [x] **T2.3 — Theme switcher + remaining 4 themes** ([PR #9](https://github.com/Donna9080/buddy-chess/pull/9))
  - Depends on: T2.1
  - Files: `public/css/theme-children.css`, `theme-cool.css`,
    `theme-messy.css`, `theme-professional.css`, `public/js/theme-switcher.js`
  - DoD: a visible control lets the player switch among all 5 themes at any
    time; the chosen theme is remembered on that browser for next visit;
    every theme keeps legal-move highlighting clearly visible.

- [x] **T2.4 — Deploy Hot-Seat live** ([PR #10](https://github.com/Donna9080/buddy-chess/pull/10), [live](https://buddy-chess.dolgorsureng.workers.dev))
  - Depends on: T2.2, T2.3
  - Files: `public/index.html` (mode picker linking to Hot-Seat)
  - DoD: Hot-Seat is playable start-to-finish at the public URL. **This is
    the milestone the brief prioritizes above everything else.**

- [x] **T2.5 — Highlight the most recent move** *(promoted from P1.5, round 1)*
  ([PR #11](https://github.com/Donna9080/buddy-chess/pull/11))
  - Depends on: T2.1, T2.2 *(needs an actual game loop to have a "last move"
    to highlight — the round-1 proposal listed T2.1 only, tightened here)*
  - Files: `public/js/board.js`, `public/css/base.css`
  - DoD: after any move, the square the piece left and the square it landed
    on both stay visibly marked until the next move. Ships after T2.4 so it
    doesn't delay getting Hot-Seat live — it's a polish pass, not a blocker.

---

## Phase 3 — Vs Computer

- [x] **T3.1 — Minimax + alpha-beta engine** ([PR #12](https://github.com/Donna9080/buddy-chess/pull/12))
  - Depends on: T0.2, T0.3
  - Files: `public/js/ai.js`
  - DoD: given any legal position, returns a legal move. At depth 2, always
    responds within 2 seconds in a normal desktop browser (measured, not
    estimated). A quick check confirms depth 2 actually searches deeper than
    depth 1 (i.e., it changes the chosen move on at least one test position,
    proving it isn't just picking randomly).

- [x] **T3.2 — Vs Computer UI** ([PR #13](https://github.com/Donna9080/buddy-chess/pull/13))
  - Depends on: T3.1, T2.2
  - Files: `public/vscomputer.html`, `public/js/vscomputer.js`
  - DoD: before the game starts, the player picks White or Black and a
    difficulty (Easy=depth 1, Medium=depth 2, Hard=depth 3 if it still meets
    the 2-second budget, otherwise capped at depth 2 — see ProductSpec §5).
    The browser then plays the other color automatically, using the full
    rule set (promotion prompts, castling, etc.) exactly as Hot-Seat does.

- [x] **T3.3 — Deploy Vs Computer live** ([PR #14](https://github.com/Donna9080/buddy-chess/pull/14))
  - Depends on: T3.2
  - Files: `public/index.html` (mode picker)
  - DoD: reachable and fully playable from the public URL.

---

## Phase 4 — Online Rooms

- [x] **T4.1 — Durable Object scaffold** ([PR #15](https://github.com/Donna9080/buddy-chess/pull/15))
  - Depends on: T0.2, T0.3, T1.1
  - Files: `src/worker.js`, `src/room.js`, `wrangler.jsonc` (Durable Object
    binding + `new_sqlite_classes` migration)
  - DoD: connecting a WebSocket to a room path upgrades successfully;
    `env.ROOM.getByName(roomCode)` reliably returns the *same* object for the
    same code across separate connections (verified with a logged internal
    ID).

- [x] **T4.2 — Room state + SQLite persistence** ([PR #16](https://github.com/Donna9080/buddy-chess/pull/16))
  - Depends on: T4.1
  - Files: `src/room.js`
  - DoD: the board position, whose turn it is, and each seat's player token
    are stored in the Durable Object's built-in SQLite storage and saved
    immediately after every move — no timers or periodic saves anywhere. The
    object can be forcibly restarted and still remembers the exact position.

- [x] **T4.3 — Seat assignment + server-side move validation** ([PR #17](https://github.com/Donna9080/buddy-chess/pull/17))
  - Depends on: T4.2, T0.2
  - Files: `src/room.js`
  - DoD: first connection to a room is seated White, second is Black,
    everyone else is a spectator. Every move message received is checked
    against `rules.js` on the server before being applied or broadcast — a
    hand-crafted illegal move sent directly to the server is rejected.

- [x] **T4.4 — Reconnect-safe player identity** ([PR #18](https://github.com/Donna9080/buddy-chess/pull/18))
  - Depends on: T4.3
  - Files: `public/js/online.js`, `src/room.js`
  - DoD: refreshing the page reconnects the same browser to the same seat
    and immediately shows the current position, using a token stored in the
    browser and matched via `ws.serializeAttachment()`.

- [x] **T4.5 — Online UI + New Game** ([PR #19](https://github.com/Donna9080/buddy-chess/pull/19))
  - Depends on: T4.4, T2.1
  - Files: `public/online.html`, `public/js/online.js`
  - DoD: two different devices entering the same room code see each other's
    moves appear live, with no page refresh needed. A **New Game** button
    resets the board for both players in place (same room code, same seats).

- [x] **T4.6 — Deploy Online rooms live** ([PR #20](https://github.com/Donna9080/buddy-chess/pull/20)) — *verified against the live
  production URL with two separate browser tabs/tokens; true cross-device
  (phone + laptop) confirmation is still worth doing yourself, see below*
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

---

## Proposed — round 1, 2026-09-15

*A read-only audit-and-gap-analysis pass, requested separately from normal
task work. Nothing below was built in this pass — see "Audit findings" for
what the current, committed code actually does, and "Proposed features" for
new work to consider adding to the phases above. A note on scope: the read
instruction for this pass named `src/` and `test/` as folders to check —
neither exists in this repo. Everything (the rules engine, its test file,
and the future server code) lives under `public/js/` and, from Phase 4
onward, `src/` will hold only the server-side Durable Object files
(`worker.js`, `room.js`) — there is no separate `test/` folder; the one test
file today sits next to the module it tests, at `public/js/rules.test.js`.*

### Audit findings

Checked off: T0.1, T0.2, T0.3, T1.1. Going through each against what the
code actually does:

- **T0.1, T0.2, T0.3 — genuinely done, no issues found.** `wrangler.jsonc`
  matches its DoD exactly (static assets, SPA fallback, observability,
  today's compatibility date, no Durable Object binding yet).
  [rules.js](public/js/rules.js) implements everything T0.2 promises, and
  `npm test` passes all three committed tests right now (re-verified during
  this pass, not just trusted from memory).

- **T1.1 is functionally done, but its own placeholder text is now stale.**
  [public/index.html:9](public/index.html) reads "Scaffold placeholder — the
  real landing page arrives in Phase 1" — but Phase 1 *is* T1.1, and it's
  already checked off and deployed. The page still works (HTTP 200, correct
  content) so the box is fairly checked, but the copy on the live site is
  now describing a future that already happened. Small copy fix, not a
  functional bug — folded into the proposals below rather than left as a
  loose end.

- **No isolated test proves castling, en passant, or promotion individually
  work correctly.** ProductSpec §4 names these three as required rules-engine
  behaviors, and T0.2/T0.3 are checked off partly on their strength. They
  *are* exercised — perft(3) and perft(4) (8,902 and 197,281, both verified)
  would almost certainly change if any of the three were subtly broken,
  because perft counts every legal move sequence and these rules add or
  remove specific sequences. But "the aggregate number is still right" is
  not the same as "here is a test that fails with a clear, specific message
  if castling breaks." If someone changes `rules.js` later and only checks
  castling breaks in a way that perft's count doesn't happen to catch, there
  is currently no test that would say so directly. Proposed as P1.2 below.

- **Hot-Seat itself (Phase 2) has no committed code yet — this is expected,
  not a bug.** T2.1–T2.4 are correctly left unchecked. For what it's worth,
  since this audit pass interrupted that work mid-session: the board
  rendering and full gameplay loop are already written and were passing
  manual testing, just not yet committed — they're sitting safely stashed
  on the `phase2/t2.1-board-rendering` branch, untouched by this pass, ready
  to resume once you've looked at what's below.

- **Nothing in Phase 3–6 exists yet either** (no `ai.js`, no `worker.js`,
  no `room.js`) — also expected, also correctly unchecked. This means the
  "things that break on refresh / two tabs" question this pass was asked to
  look for has no existing Online code to find bugs *in* yet — instead,
  P1.7 below proposes hardening the *plan* for Phase 4 before it's built,
  since that's cheaper than fixing it after.

- **A real, currently-missing rule: some legal endgames never end.**
  `getStatus` in [rules.js](public/js/rules.js:334) only returns
  `checkmate`, `stalemate`, `check`, or `normal` — there's no check for
  **insufficient material** (e.g., king vs. king, or king+bishop vs. king —
  positions where neither side can possibly deliver checkmate with the
  pieces left on the board). Play that down to a bare king vs. king and the
  status stays `normal` forever; the game never declares it over. To be
  clear, this is *different* from the two draw rules the brief explicitly
  put out of scope (repetition and the fifty-move rule) — insufficient
  material isn't mentioned as a non-goal anywhere, it was just never built.
  Proposed as P1.1 below — it's the highest-value, lowest-effort item on
  the list.

### Proposed features (ranked by value ÷ effort, highest first)

*P1.1, P1.2, and P1.5 were promoted into the phased plan above as T0.4,
T0.5, and T2.5 — removed from this list to avoid having them tracked in two
places. The rest are still just proposals, not yet scheduled.*

- [ ] **P1.3 Make `npm test` discover every test file, not just one hardcoded
  name** — `package.json`, a small new `scripts/run-tests.js`. Depends on:
  T0.3. Size: S
  *Why:* the test command currently only runs `rules.test.js` by name
  because this environment's Node can't scan a folder for test files on its
  own; if a second test file gets added later (for the computer opponent, or
  the online server) and nobody remembers to add it to the command by hand,
  it will silently never run.
  *Done:* add a second, throwaway test file under `public/js/`, run
  `npm test`, and see both files' results in the output without editing
  `package.json` again.
  *Spec:* within scope.

- [ ] **P1.4 Add a GitHub Actions check that runs the tests on every pull
  request** — new `.github/workflows/test.yml`. Depends on: T0.3 (and P1.3
  ideally landing first). Size: S
  *Why:* right now, nothing stops a future change from breaking the chess
  rules unless someone remembers to run `npm test` by hand before merging.
  *Done:* open any pull request on GitHub — a green check (or red X if
  something's broken) appears at the bottom of the PR page automatically,
  without anyone running a command themselves.
  *Spec:* within scope.

- [ ] **P1.6 Fix the stale placeholder copy** — `public/index.html`. Depends
  on: T1.1. Size: S
  *Why:* the live site's placeholder text describes Phase 1 as something
  that "arrives" later, but Phase 1 already shipped — small, but it's live
  and visible to anyone who visits the URL right now.
  *Done:* visit the live URL — the text no longer refers to a future phase
  that already happened.
  *Spec:* within scope.

- [ ] **P1.7 Define and test the "same player, two tabs" case for Online
  mode** — `ProductSpec.md §6.5`, `src/room.js` (once it exists). Depends
  on: T4.4. Size: M
  *Why:* ProductSpec §6.5 says a refresh reconnects you to your seat using a
  saved token, but never says what happens if that same token connects a
  *second* time while the first connection is still open (a duplicate tab,
  or a slow refresh that didn't fully close the old connection first) —
  without a rule, this is exactly the kind of thing that would misbehave the
  first time two real people demo it.
  *Done (once T4.4 is built):* open an online room, then open the same
  room's URL again in a second browser tab on the same device — the game
  should stay playable and show the same live position in both tabs, rather
  than one tab silently going stale or the two tabs fighting over the seat.
  *Spec:* within scope — this refines T4.4's existing definition of done
  rather than adding a new non-goal.

- [ ] **P1.8 Basic screen-reader labels on board squares** —
  `public/js/board.js`. Depends on: T2.1. Size: S
  *Why:* ProductSpec §1 says Buddy should welcome "any age" and any first-time
  player; right now every square is an unlabeled button, so a screen reader
  announces nothing useful about what's on the board.
  *Done:* turn on a screen reader (e.g. built-in VoiceOver/Narrator), tab to
  a board square — it announces something like "e4, white pawn" instead of
  just "button."
  *Spec:* within scope.

- [ ] **P1.9 Confirm before New Game / Resign end an in-progress game** —
  `public/js/online.js` (T4.5), `public/js/vscomputer.js` or wherever the
  Phase 6 extra lands (T6.1). Depends on: T4.5, T6.1. Size: S
  *Why:* both actions immediately end a game with no way to undo an
  accidental click, which is an easy way to ruin a friend's in-progress win.
  *Done:* click New Game or Resign mid-game — a short "are you sure?" step
  appears before anything actually resets or ends.
  *Spec:* within scope.
