// ai.js — the computer opponent. Minimax with alpha-beta pruning, no
// external chess engine. See ProductSpec.md §5 for the plain-English
// explanation of how this works and what "depth" means for difficulty.

import { generateLegalMoves, applyMove, isInCheck } from './rules.js';

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

// A large score for checkmate, tie-broken by remaining search depth so a
// faster mate is always preferred over a slower one found at the same call.
const MATE_SCORE = 1_000_000;

function materialScore(position) {
  let score = 0;
  for (const piece of position.board) {
    if (!piece) continue;
    const value = PIECE_VALUES[piece[1]];
    score += piece[0] === 'w' ? value : -value;
  }
  return score;
}

// Every score returned here is from White's perspective: positive favors
// White, negative favors Black, regardless of whose turn it is to move.
function minimax(position, depth, alpha, beta) {
  const moves = generateLegalMoves(position);

  if (moves.length === 0) {
    if (isInCheck(position, position.turn)) {
      const mateScore = MATE_SCORE + depth;
      return position.turn === 'w' ? -mateScore : mateScore;
    }
    return 0; // Stalemate.
  }

  if (depth === 0) return materialScore(position);

  if (position.turn === 'w') {
    let best = -Infinity;
    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(position, move), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    best = Math.min(best, minimax(applyMove(position, move), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

// Picks a move for whoever's turn it is in `position`, looking `depth` ply
// ahead in total (depth 1 = just the computer's own move, depth 2 = the
// computer's move plus the opponent's best reply, and so on).
function chooseMove(position, depth) {
  const moves = generateLegalMoves(position);
  if (moves.length === 0) return null;

  const maximizing = position.turn === 'w';
  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of moves) {
    const score = minimax(applyMove(position, move), depth - 1, alpha, beta);
    const better = maximizing ? score > bestScore : score < bestScore;
    if (better) {
      bestScore = score;
      bestMove = move;
    }
    if (maximizing) alpha = Math.max(alpha, bestScore);
    else beta = Math.min(beta, bestScore);
  }

  return bestMove;
}

export { chooseMove };
