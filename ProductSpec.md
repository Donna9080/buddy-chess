# Buddy — Product & Architecture Spec

This document explains **what** Buddy does and **why** it's built the way it
is. It's written for someone with no coding background, so every technical
term is explained in plain English the first time it shows up, and again in
the [Glossary](#glossary) at the bottom.

No Figma file was available for this project. The original visual design was
a 5-theme system (§3 below described it); it was later replaced, at your
request, with a simpler dark/light system and a full visual redesign — see
the updated §3 for what's actually live today.

**Display names vs. internal names:** the four modes are shown to players as
Play Together, Play Computer, Play Online, and Chess Coach. Internally — file
names, code, this document's section headers — they're still called Hot-Seat,
Vs Computer, Online, and Tutor; only the on-screen labels changed, to avoid
unnecessary churn to URLs and code for a rename that's purely cosmetic.

---

## 1. Who this is for

Anyone who has never really played chess and wants to learn by *doing* — with
a friend, against the computer, or with a coach explaining each move. The
product should feel approachable to a curious kid and to an adult picking up
the game for the first time. Nothing should require an account, a login, or
reading a rulebook first.

---

## 2. The four modes

### 2.1 Hot-Seat (shown to players as "Play Together")
Two people, one screen, one keyboard/mouse. Players alternate turns on the
same board. No setup beyond opening the page.

### 2.2 Vs Computer (shown to players as "Play Computer")
The player chooses:
- **Color** — White or Black.
- **Difficulty** — Easy / Medium / Hard (see §5 for what that means
  technically).

The browser plays the other color automatically. The computer must always
respond with a **legal** move within **2 seconds**.

### 2.3 Online (shown to players as "Play Online")
Two players type the same **room code** on two different devices.
- Whoever connects to a room **first** plays White.
- Whoever connects **second** plays Black.
- Anyone else who joins that room code is a **spectator** (can watch, can't move).
- The server — not either player's browser — is the referee: it decides
  whether a submitted move is legal and is the single source of truth for the
  board.
- Refreshing the page reconnects you to your **same** seat and shows the
  current position (see §6.5 for how).
- A **New Game** button resets the board for both players without needing a
  new room code.

### 2.4 Tutor (shown to players as "Chess Coach")
The player picks a **tutor persona** (a cosmetic character/avatar — the advice
underneath is the same regardless of which one you pick). While you play, the
tutor tells you which move is objectively best in the current position and
gives one short, plain-English reason why (e.g. "this wins a pawn for free,"
"this gets your king to safety," "this controls the center"). See §7 for the
full design and an assumption I'm flagging for your review.

---

## 3. The look — dark & light mode

The original design was a 5-theme system (Kids, Adult, Cool, Messy,
Professional). At your request that was replaced with a single, more
polished **premium chess aesthetic** in exactly two modes — dark and light —
plus board coordinates and renamed modes. This section describes what's
actually live today.

**One visual design, two color modes:**
- **Light** — warm off-white background, a wood-toned board (cream and
  warm brown squares), near-black text, a muted gold accent color. Meant to
  read as clean and elegant.
- **Dark** — deep charcoal background (not pure black), cooler dark-gray
  board squares, soft off-white text, the same gold accent brightened for
  contrast. Meant to read as sophisticated rather than just "inverted light
  mode."

**How the mode is chosen:** a single toggle button (sun/moon icon) in the
header. With no explicit choice made yet, the page follows the visitor's
operating-system light/dark preference automatically; clicking the toggle
overrides that and is remembered per browser (`localStorage`, no account
needed) from then on.

**Typography:** headings and the "Buddy" wordmark use **Playfair Display** (a
serif display typeface loaded from Google Fonts) for a distinctive, premium
feel; body text and UI chrome (buttons, labels, status text) use the
browser's own system font stack for speed and consistency with the rest of
the OS. This is the one external network dependency in the whole project —
everything else (rules engine, sound, icons) is still hand-built with zero
libraries, per the original brief; a font was judged worth the exception
because "strong typography" was an explicit, named requirement of the
redesign.

**Board coordinates:** file letters (a–h) along the bottom rank and rank
numbers (1–8) along the left file, shown as small labels inside the edge
squares themselves (not a separate border row/column) — the same treatment
most chess sites use. Purely a rendering addition in `board.js`; it doesn't
touch move generation, legality, or any other game logic.

**Mode icons:** each mode card on the home screen uses an actual chess piece
glyph as its icon (two pawns for Play Together, a knight for Play Computer, a
queen for Play Online, a bishop for Chess Coach) rather than generic or
mismatched icons — deliberately kept "in-universe" for a chess app.

---

## 4. The rules engine — `rules.js`

This is the single most important technical decision in the project, so it's
worth spelling out in full.

**One JavaScript file, written by hand, with zero external chess libraries**
(no `chess.js`, no engine you can download). It contains everything needed to
know what a legal chess position looks like:

- All six piece types and how each one moves.
- Check, checkmate, and stalemate detection.
- Castling (both sides, with all its special conditions).
- En passant.
- Pawn promotion, with a choice of piece (queen/rook/bishop/knight).
- A function that lists every legal move for the player to move, given a
  position — this is what makes illegal moves *impossible*: the interface
  only ever offers squares this function says are legal.

This same file is used by **every mode** — Hot-Seat, Vs Computer, Online, and
Tutor — and, critically, by the **server** in Online mode too. That's what
lets the server independently double-check every move instead of trusting
whatever the browser sends it (see §6.4).

### Proving it's correct: the perft test
Chess programmers have a standard way to sanity-check a rules engine before
trusting it with anything else: count how many different move sequences are
possible from the starting position, looking a fixed number of moves ("ply")
ahead. This is called a **perft test** ("**per**formance **t**est," though
here it's really a *correctness* test). The starting position has exactly:

| Depth (ply) | Legal move sequences |
|---|---|
| 1 | 20 |
| 2 | 400 |
| 3 | 8,902 |

If `rules.js` produces these exact numbers, the rules are almost certainly
correct — these numbers are extremely sensitive to even one small bug (a
missed en passant case, a castling edge condition, etc.). **This test must
pass before any board, button, or pixel is built.** It's the first task on
the roadmap.

---

## 5. The computer opponent — `ai.js`

The computer needs to pick a move without any external chess engine. It uses
two classic, well-understood techniques:

- **Minimax** — imagine every possible move you could make, then every
  possible reply, then every possible reply to *that*, and so on for a fixed
  number of steps ("**depth**"). At the bottom, score each resulting position
  (roughly: how much material each side has, whose king is safer, etc.).
  Walk back up assuming your opponent always picks their *best* reply and you
  always pick your *best* move — hence "mini-max": you minimize your
  opponent's best outcome while maximizing your own.
- **Alpha-beta pruning** — a shortcut that skips exploring branches that
  can't possibly change the final answer, so the same search finishes much
  faster without changing the result.

**Depth** controls both strength and speed:

| Difficulty | Search depth | What it feels like |
|---|---|---|
| Easy | 1 | Sees only its own next move — makes obvious blunders. |
| Medium | 2 | The required baseline — sees one full exchange ahead. |
| Hard | 3 (stretch — only if it still fits in 2 seconds) | Plays noticeably better; may be capped back to depth 2 if it's too slow in the browser. |

**Hard requirement:** at depth 2, the computer must always return a legal
move within **2 seconds**, running entirely in the player's browser (no
server round-trip). This will be verified by timing it, not just eyeballing it.

---

## 6. Online architecture

This is the part with the most moving pieces, so here's the full mental model.

### 6.1 One tiny server per room
A **Durable Object** is a small, single-purpose "mini-server" that Cloudflare
guarantees is unique for a given name — no matter which of Cloudflare's
worldwide locations a player connects from, the room code `"BUDDY42"` always
reaches the *exact same* Durable Object. We get one automatically, on demand,
per room code, via `env.ROOM.getByName(roomCode)`. Think of it as a phone
number that always rings the same physical desk, wherever you dial from.

### 6.2 It remembers things, even if it takes a nap
Durable Objects can be backed by **SQLite** — the same lightweight database
engine used inside most phone apps — built directly into the object. That
means the room's board position, whose turn it is, and who is sitting in
which seat all live in a tiny built-in database, not just in memory. Cloudflare
is free to "put the object to sleep" when it's quiet (to save cost); when a
new message arrives it wakes back up and reads its SQLite storage to pick up
exactly where it left off. Because of this, **we save the position to SQLite
after every single move** — there are no timers, no "save every 30 seconds."
If a save doesn't happen immediately after a move, that move effectively
didn't happen as far as reconnecting players are concerned.

### 6.3 A live phone line, not a mailbox
A normal web request is like sending a letter and waiting for one reply. A
**WebSocket** is like a phone call that stays connected — either side can
speak at any time. Buddy uses **`ctx.acceptWebSocket()`**, which additionally
lets the connection "hibernate" (Cloudflare can drop the object from memory
between messages to save resources, without dropping the actual connection or
losing track of who's who) and wake up instantly when a message comes in.

### 6.4 The server is the referee, not a bystander
Every move a player makes is sent to the Durable Object as a small JSON
message (a simple, structured text format — every message here has a `type`,
like `"move"`, and a `payload`, the details). The server runs that move
through the exact same `rules.js` used in the browser and only accepts it if
it's legal. If a broken or tampered client tried to send an illegal move, the
server would silently reject it — the two players' screens only ever show
positions the server has approved.

### 6.5 Reconnecting to your own seat
When a browser first joins a room, it generates a random "player token" (just
a random string, not a password) and remembers it in the browser (similar to
a coat-check ticket). Every time that browser connects — including on a page
refresh — it presents its token. The Durable Object uses
**`ws.serializeAttachment()`** to stick a small label ("this connection is
White, token X") onto the WebSocket connection itself, so that label survives
a hibernation nap. If a reconnecting token matches a seat already recorded in
SQLite, that browser is reconnected to the *same* seat and immediately shown
the current position. A brand-new token, once both seats are filled, becomes
a spectator.

### 6.6 New Game
Pressing **New Game** resets the board to the starting position for both
players while keeping the same two people in their seats (no new room code
needed) — it does not clear player tokens, it only resets the game state.

---

## 7. Tutor mode — design and an open question

**My interpretation, flagged for your review:** Tutor mode is a single-player
practice mode (you play both sides, or against the built-in computer — see
below) where, at any point, the tutor evaluates the current position using
the same engine from §5 (run one step deeper, since it's not time-pressured
the way the 2-second computer opponent is) and explains the single best move
using a short list of recognizable, human-readable reasons: material gain,
check/checkmate, king safety, center control, piece development, or "this is
the only way to avoid losing material." The tutor doesn't play *against*
you — it coaches whichever side you're currently moving for.

The brief describes this as "the online version" with a tutor added, which
could instead mean: two real people play online while a tutor bot narrates
for both of them. That's a materially bigger feature (it touches the Online
architecture in §6, not just the AI in §5). **I've scoped Tutor mode as the
simpler, single-player coaching mode for the roadmap** — tell me if you meant
the two-player version and I'll re-scope Phase 5.

---

## 8. Non-functional requirements

- **Cost:** must run entirely on the Cloudflare Workers **free plan** — no
  paid add-ons.
- **Speed:** computer opponent responds within 2 seconds at the required
  depth; online moves appear on the opponent's screen within roughly a second
  under normal internet conditions.
- **No accounts:** nothing to sign up for, anywhere, in any mode.
- **Browsers:** any current desktop or mobile browser (Chrome, Safari,
  Firefox, Edge) — no Internet Explorer support.

---

## 9. Explicitly out of scope

Accounts/logins, chess clocks, ratings, draw by repetition or the fifty-move
rule, opening books, exporting move lists (e.g. PGN files), and React (or any
other UI framework) — plain HTML, CSS, and JavaScript only.

---

## 10. Decisions I made that need your OK

These are places the original brief left open, a placeholder in brackets, or
ambiguous wording. I made a reasonable call on each so work isn't blocked —
flag any you want changed and I'll update the spec and roadmap.

| # | Decision | What I chose | Where it's used |
|---|---|---|---|
| 1 | Repo name | `buddy-chess` on GitHub user `Donna9080` | Already created |
| 2 | Repo visibility | Public | Already created — you confirmed this |
| 3 | README author name | "Dolgorsuren Gunreg" | [README.md](README.md) |
| 4 | Theme count | *(superseded)* originally 5 themes; replaced by a dark/light system in the visual redesign | §3 |
| 5 | Tutor mode scope | Single-player coaching mode, not a two-person online + tutor mode | §7 |
| 6 | Difficulty → search depth mapping | Easy=1, Medium=2 (the required baseline), Hard=3 as a stretch goal | §5 |
| 7 | "New Game" behavior online | Resets the board only; keeps the same two players seated | §6.6 |
| 8 | The optional "extra" feature | Left unpicked on purpose — the roadmap asks you to choose it when we reach that phase | FEATUREROADMAP_workplan.md, Phase 6 |
| 9 | One external font in the redesign | Loaded "Playfair Display" from Google Fonts for headings — the one exception to the project's otherwise zero-external-dependency rule, justified by "strong typography" being an explicit, named requirement | §3 |
| 10 | URLs kept stable through the rename | `hotseat.html`/`vscomputer.html`/`online.html`/`tutor.html` still route by their original names; only the on-screen labels became Play Together/Play Computer/Play Online/Chess Coach | §2, index.html |

---

## Glossary

**Alpha-beta pruning** — A shortcut for minimax search that skips exploring
moves that can't possibly change the final decision, making the same search
much faster.

**Ctx.acceptWebSocket()** — The Cloudflare Workers function that turns on
"hibernation" support for a WebSocket connection inside a Durable Object (see
*WebSocket hibernation*).

**Definition of Done (DoD)** — A precise, checkable description of when a
task is actually finished — used throughout the roadmap so "done" doesn't
mean "I think it works."

**Durable Object** — A small, always-consistent mini-server that Cloudflare
guarantees is unique per name (e.g., one per chess room code).

**En passant** — A special pawn-capture rule in chess: if an opponent's pawn
moves two squares forward from its starting square and lands beside your
pawn, you may capture it as though it had only moved one square — but only on
your very next move.

**Hot-seat** — Two players sharing one device, taking turns. Shown to
players on-screen as "Play Together."

**JSON** — A simple, structured text format for sending data (like chess
moves) between a browser and a server. Every message in Buddy's online mode
has a `"type"` (what kind of message it is) and a `"payload"` (the details).

**Minimax** — A game-search technique: look ahead a fixed number of moves,
score the resulting positions, and choose the move that gives your opponent
the worst best-response.

**Perft test** — A standard chess-programming correctness check: count all
legal move sequences of a given length from a known position and compare to
published correct numbers.

**Ply / depth** — One half-move (one player's turn) of look-ahead in a
game-search algorithm.

**Room code** — A short text code both online players type in to land in the
same Durable Object / game.

**SQLite** — A small, fast, file-based database engine (also used inside most
phone apps) that Durable Objects can use for permanent storage.

**Seat** — A player's role in an online room: White, Black, or spectator.

**Server-authoritative** — Design where the server (not any player's
browser) has the final say on what's legal and what the current game state is.

**ws.serializeAttachment()** — A Cloudflare Workers function that attaches a
small piece of data (like "this connection is White") to a WebSocket
connection so it survives the connection hibernating and waking back up.

**WebSocket** — A connection between browser and server that stays open in
both directions, unlike a normal web request/response.

**WebSocket hibernation** — Cloudflare's ability to unload a Durable Object
from memory while a WebSocket connection is idle, and wake it back up
automatically when a message arrives, without the connection actually
dropping.

**wrangler** — Cloudflare's command-line tool for developing and deploying
Workers projects.

**wrangler.jsonc** — The configuration file (JSON with comments allowed) that
tells Cloudflare how to build and run a Workers project: what static files to
serve, what Durable Objects exist, etc.
