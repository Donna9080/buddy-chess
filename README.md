# Buddy — Browser Chess for Two Friends

A free, no-login chess game that runs entirely in the browser and lives on
[Cloudflare Workers](https://workers.cloudflare.com/). Built for people who have
never really played chess before, and want to learn it by playing with a friend —
in the same room, online, against the computer, or with a tutor looking over
their shoulder.

By **Dolgorsuren Gunreg** *(if that's not quite right, tell me and I'll fix it)*

**Live demo:** [buddy-chess.dolgorsureng.workers.dev](https://buddy-chess.dolgorsureng.workers.dev)

## The four ways to play

1. **Play Together** — two people share one screen and take turns.
2. **Play Computer** — you pick White or Black and a difficulty level; the browser
   plays the other side.
3. **Play Online** — two people type the same room code on two different devices and
   watch each other's moves live.
4. **Chess Coach** — pick a coach persona and get a plain-English explanation of the
   best move in every position, so you actually learn *why*.

Every mode enforces full, legal chess: check, checkmate, stalemate, castling,
en passant, pawn promotion, and draws by insufficient material. There is no
way to make an illegal move — the board simply won't let you.

## The look

Buddy has a premium chess aesthetic with a single **dark/light toggle** —
dark mode is sophisticated (deep charcoal, warm gold accents), light mode is
clean and elegant (warm cream, a wood-toned board). With no explicit choice
made, it follows your device's own light/dark setting. Every board shows
standard a–h / 1–8 coordinates.

## Tech stack, in plain English

| Piece | What it is | Why it's here |
|---|---|---|
| **Cloudflare Workers** | A place to run small pieces of code "on the edge" (servers spread around the world) without renting or managing a server yourself. | Hosts the whole site for free and keeps it fast everywhere. |
| **Durable Objects (SQLite-backed)** | A tiny, permanent mini-server assigned to one specific room, with its own built-in database. | Each online chess room gets exactly one, so both players always land on the same "referee." |
| **WebSockets** | A phone-call-style connection that stays open, instead of the usual "ask once, get one answer" web request. | Lets two players' moves show up on each other's screens instantly. |
| **Plain HTML, CSS, JavaScript** | The three basic building blocks of every website — no framework (like React) on top. | Keeps the app simple, fast, and easy for a beginner to read start-to-finish. |

Full explanations of every term above, and many more, are in
[ProductSpec.md](ProductSpec.md).

## Project docs

- [ProductSpec.md](ProductSpec.md) — what Buddy is, how every mode works, and
  the architecture decisions behind it, explained term-by-term.
- [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) — the ordered,
  checkbox-by-checkbox build plan.

## Status

✅ All four modes are built, tested, and live. The rules engine, the
computer opponent, and the online multiplayer server are all done. The
optional "sound on move" extra is in too. Tutor mode's scope (single-player
coaching vs. an online + narrator version) is the one open question — see
[ProductSpec.md §10](ProductSpec.md#10-decisions-i-made-that-need-your-ok).

## Running it locally

```bash
npm install
npx wrangler dev
```

This will open a local copy of Buddy at `http://localhost:8787`.

## Deploying

```bash
npx wrangler deploy
```

This publishes Buddy to the live `*.workers.dev` URL.
