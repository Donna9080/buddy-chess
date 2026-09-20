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

function bareBoard(placements) {
  const board = new Array(64).fill(null);
  for (const [square, piece] of placements) board[square] = piece;
  return board;
}

test('king vs. king is a draw by insufficient material', () => {
  const position = {
    board: bareBoard([[squareOf(4, 0), 'wK'], [squareOf(4, 7), 'bK']]),
    turn: 'w',
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantSquare: null,
  };
  assert.equal(getStatus(position), 'draw-insufficient-material');
});

test('king and a lone bishop or knight vs. king is a draw by insufficient material', () => {
  const withBishop = {
    board: bareBoard([[squareOf(4, 0), 'wK'], [squareOf(4, 7), 'bK'], [squareOf(2, 0), 'wB']]),
    turn: 'w',
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantSquare: null,
  };
  assert.equal(getStatus(withBishop), 'draw-insufficient-material');

  const withKnight = {
    board: bareBoard([[squareOf(4, 0), 'wK'], [squareOf(4, 7), 'bK'], [squareOf(1, 0), 'wN']]),
    turn: 'w',
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantSquare: null,
  };
  assert.equal(getStatus(withKnight), 'draw-insufficient-material');
});

test('the starting position is not flagged as insufficient material', () => {
  assert.notEqual(getStatus(createInitialPosition()), 'draw-insufficient-material');
});

test('castling (kingside) moves both the king and the rook', () => {
  const position = {
    board: bareBoard([[squareOf(4, 0), 'wK'], [squareOf(7, 0), 'wR'], [squareOf(4, 7), 'bK']]),
    turn: 'w',
    castlingRights: { wK: true, wQ: false, bK: false, bQ: false },
    enPassantSquare: null,
  };
  const result = applyMove(position, { from: squareOf(4, 0), to: squareOf(6, 0), promotion: null });
  assert.equal(result.board[squareOf(6, 0)], 'wK'); // g1
  assert.equal(result.board[squareOf(5, 0)], 'wR'); // f1
  assert.equal(result.board[squareOf(7, 0)], null); // h1, now empty
  assert.equal(result.board[squareOf(4, 0)], null); // e1, now empty
});

test('castling (queenside) moves both the king and the rook', () => {
  const position = {
    board: bareBoard([[squareOf(4, 0), 'wK'], [squareOf(0, 0), 'wR'], [squareOf(4, 7), 'bK']]),
    turn: 'w',
    castlingRights: { wK: false, wQ: true, bK: false, bQ: false },
    enPassantSquare: null,
  };
  const result = applyMove(position, { from: squareOf(4, 0), to: squareOf(2, 0), promotion: null });
  assert.equal(result.board[squareOf(2, 0)], 'wK'); // c1
  assert.equal(result.board[squareOf(3, 0)], 'wR'); // d1
  assert.equal(result.board[squareOf(0, 0)], null); // a1, now empty
});

test('en passant removes the captured pawn from behind the target square, not on it', () => {
  const position = {
    board: bareBoard([
      [squareOf(4, 0), 'wK'], [squareOf(0, 7), 'bK'],
      [squareOf(4, 4), 'wP'], // e5
      [squareOf(3, 4), 'bP'], // d5, just double-pushed from d7
    ]),
    turn: 'w',
    castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
    enPassantSquare: squareOf(3, 5), // d6 — the square passed over
  };
  const result = applyMove(position, { from: squareOf(4, 4), to: squareOf(3, 5), promotion: null });
  assert.equal(result.board[squareOf(3, 5)], 'wP'); // the capturing pawn landed on d6
  assert.equal(result.board[squareOf(3, 4)], null); // the captured pawn is gone from d5...
  assert.equal(result.board[squareOf(4, 4)], null); // ...not just from e5, its own old square
});

test('a pawn reaching the last rank can promote to each of the four pieces', () => {
  for (const promotion of ['Q', 'R', 'B', 'N']) {
    const position = {
      board: bareBoard([[squareOf(4, 6), 'wP'], [squareOf(4, 0), 'wK'], [squareOf(0, 7), 'bK']]),
      turn: 'w',
      castlingRights: { wK: false, wQ: false, bK: false, bQ: false },
      enPassantSquare: null,
    };
    const result = applyMove(position, { from: squareOf(4, 6), to: squareOf(4, 7), promotion });
    assert.equal(result.board[squareOf(4, 7)], `w${promotion}`);
    assert.equal(result.board[squareOf(4, 6)], null);
  }
});
