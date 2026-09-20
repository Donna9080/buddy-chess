// tutor.js — Tutor mode. Single-player: you play the computer (like Vs
// Computer), and on every one of your turns the tutor names the best move
// and gives one plain-English reason why, drawn from a short, recognizable
// set of categories. See ProductSpec.md §7 for the design and the scoping
// note this build resolves (single-player coaching, not the two-player
// online + narrator version).

import {
  createInitialPosition, applyMove, getStatus,
  generateLegalMoves, squareToAlgebraic, pieceType, pieceColor, fileOf, squareOf,
} from './rules.js';
import { renderBoard } from './board.js';
import { chooseMove, evaluateMoves } from './ai.js';
import { playMoveSound } from './sound.js';

// Not time-pressured the way the 2-second computer opponent is, so the
// tutor is allowed to look one ply deeper for better advice.
const TUTOR_DEPTH = 3;

const PIECE_NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
const CENTER_SQUARES = new Set([squareOf(3, 3), squareOf(3, 4), squareOf(4, 3), squareOf(4, 4)]);
const MINOR_HOME_SQUARES = {
  w: new Set([squareOf(1, 0), squareOf(2, 0), squareOf(5, 0), squareOf(6, 0)]),
  b: new Set([squareOf(1, 7), squareOf(2, 7), squareOf(5, 7), squareOf(6, 7)]),
};

function describeMove(move) {
  const base = `${squareToAlgebraic(move.from)}-${squareToAlgebraic(move.to)}`;
  return move.promotion ? `${base} (promoting to ${PIECE_NAMES[move.promotion]})` : base;
}

// Checked in priority order: the first category that applies is the one
// reported, even if a move could technically fit more than one. Returns
// null when nothing recognizable applies — the caller falls back to a
// generic reason, but also uses null to prefer a more teachable move among
// ties (see getTutorAdvice).
function categorizeMove(position, move) {
  const movingPiece = position.board[move.from];
  const capturedPiece = position.board[move.to];
  const type = pieceType(movingPiece);
  const color = pieceColor(movingPiece);
  const resulting = applyMove(position, move);
  const status = getStatus(resulting);

  if (status === 'checkmate') return 'this delivers checkmate!';
  if (capturedPiece) return `this captures the opponent's ${PIECE_NAMES[pieceType(capturedPiece)]}.`;
  if (status === 'check') return "this puts the opponent's king in check.";
  if (type === 'K' && Math.abs(fileOf(move.to) - fileOf(move.from)) === 2) {
    return 'this gets your king to safety by castling.';
  }
  if (CENTER_SQUARES.has(move.to) && (type === 'P' || type === 'N' || type === 'B')) {
    return 'this helps control the center of the board.';
  }
  if ((type === 'N' || type === 'B') && MINOR_HOME_SQUARES[color].has(move.from)) {
    return 'this develops a piece toward the action.';
  }
  return null;
}

function explainMove(position, move) {
  return categorizeMove(position, move)
    ?? "this is the strongest move the tutor can find here — it's not always obvious why!";
}

// At a fixed search depth, more than one move can tie for the best score —
// e.g. a hanging piece that's just as safe to take next turn as it is right
// now. Among ties, prefer whichever move actually has a teachable reason,
// since that's the whole point of a tutor; fall back to the first tie
// (matching plain chooseMove) only if none of them do.
function getTutorAdvice(position) {
  const scored = evaluateMoves(position, TUTOR_DEPTH);
  if (scored.length === 0) return null;

  const maximizing = position.turn === 'w';
  const bestScore = scored.reduce(
    (best, { score }) => (maximizing ? Math.max(best, score) : Math.min(best, score)),
    maximizing ? -Infinity : Infinity,
  );

  const tiedMoves = scored.filter((s) => s.score === bestScore).map((s) => s.move);
  const teachable = tiedMoves.find((move) => categorizeMove(position, move) !== null);
  const move = teachable ?? tiedMoves[0];

  return { move, reason: explainMove(position, move) };
}

const setupEl = document.getElementById('setup');
const gameEl = document.getElementById('game');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const tutorPanelEl = document.getElementById('tutor-panel');
const startButton = document.getElementById('start-button');

const THINKING_DELAY_MS = 400;

let position = null;
let lastMove = null;
let playerColor = 'w';
let searchDepth = 2;
let tutorName = 'Coach Rook';

startButton.addEventListener('click', () => {
  tutorName = document.querySelector('input[name="tutor"]:checked').value;
  playerColor = document.querySelector('input[name="color"]:checked').value;
  searchDepth = Number(document.querySelector('input[name="difficulty"]:checked').value);

  position = createInitialPosition();
  lastMove = null;
  setupEl.hidden = true;
  gameEl.hidden = false;

  update();
  maybeMakeComputerMove();
});

function update() {
  const isPlayerTurn = position.turn === playerColor;
  renderBoard({
    position,
    container: boardEl,
    onMove: handlePlayerMove,
    lastMove,
    interactive: isPlayerTurn,
  });

  const mover = position.turn === 'w' ? 'White' : 'Black';
  const winner = position.turn === 'w' ? 'Black' : 'White';
  const status = getStatus(position);
  const messages = {
    checkmate: `Checkmate — ${winner} wins!`,
    stalemate: 'Stalemate — the game is a draw.',
    check: `${mover} to move — check!`,
    normal: isPlayerTurn ? `Your move (${mover})` : 'Computer is thinking...',
  };
  statusEl.textContent = messages[status];

  updateTutorPanel(isPlayerTurn, status);
}

function updateTutorPanel(isPlayerTurn, status) {
  if (!isPlayerTurn || status === 'checkmate' || status === 'stalemate') {
    tutorPanelEl.textContent = '';
    return;
  }
  const advice = getTutorAdvice(position);
  tutorPanelEl.textContent = advice
    ? `${tutorName} suggests ${describeMove(advice.move)} — ${advice.reason}`
    : '';
}

function handlePlayerMove(move) {
  position = applyMove(position, move);
  lastMove = move;
  playMoveSound();
  update();
  maybeMakeComputerMove();
}

function maybeMakeComputerMove() {
  if (position.turn === playerColor) return;
  const status = getStatus(position);
  if (status === 'checkmate' || status === 'stalemate') return;

  setTimeout(() => {
    const move = chooseMove(position, searchDepth);
    if (!move) return;
    position = applyMove(position, move);
    lastMove = move;
    playMoveSound();
    update();
  }, THINKING_DELAY_MS);
}

export { getTutorAdvice };
