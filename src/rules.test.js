import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPosition,
  generateLegalMoves,
  applyMove,
  algebraicToSquare,
  getStatus,
  squareOf,
} from './rules.js';

// perft ("performance test," used here as a correctness test) counts every
// legal move sequence of a given length from a position. These specific
// numbers for the starting position are published, well-known values used
// throughout chess programming to catch move-generation bugs — a single
// missing en passant or castling case is enough to shift the count. See
// ProductSpec.md §4.
function perft(position, depth) {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(position);
  if (depth === 1) return moves.length;
  let count = 0;
  for (const move of moves) {
    count += perft(applyMove(position, move), depth - 1);
  }
  return count;
}

test('perft from the starting position matches the required move counts', () => {
  const start = createInitialPosition();
  assert.equal(perft(start, 1), 20);
  assert.equal(perft(start, 2), 400);
  assert.equal(perft(start, 3), 8902);
});

test('Fool\'s mate (1. f3 e5 2. g4 Qh4#) is detected as checkmate', () => {
  let position = createInitialPosition();
  const moves = [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']];
  for (const [from, to] of moves) {
    position = applyMove(position, { from: algebraicToSquare(from), to: algebraicToSquare(to), promotion: null });
  }
  assert.equal(getStatus(position), 'checkmate');
});

test('a king with no legal moves and no check is a stalemate', () => {
  const board = new Array(64).fill(null);
  board[squareOf(7, 0)] = 'wK'; // h1
  board[squareOf(5, 1)] = 'bK'; // f2
  board[squareOf(6, 2)] = 'bQ'; // g3
  const position = {
    board,
    turn: 'w',
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantSquare: null,
  };
  assert.equal(getStatus(position), 'stalemate');
});
