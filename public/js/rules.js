// rules.js — the one hand-written chess rules module shared by every mode
// (hot-seat, vs-computer, online, tutor) and the server. No external chess
// library. See ProductSpec.md §4 for the design rationale and the perft
// numbers this file is proven against in rules.test.js.

const WHITE = 'w';
const BLACK = 'b';

function fileOf(square) {
  return square % 8;
}

function rankOf(square) {
  return Math.floor(square / 8);
}

function squareOf(file, rank) {
  return rank * 8 + file;
}

function onBoard(file, rank) {
  return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
}

function squareToAlgebraic(square) {
  const file = String.fromCharCode('a'.charCodeAt(0) + fileOf(square));
  return `${file}${rankOf(square) + 1}`;
}

function algebraicToSquare(text) {
  const file = text.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(text[1]) - 1;
  return squareOf(file, rank);
}

function oppositeColor(color) {
  return color === WHITE ? BLACK : WHITE;
}

function pieceColor(piece) {
  return piece[0];
}

function pieceType(piece) {
  return piece[1];
}

function createInitialPosition() {
  const board = new Array(64).fill(null);
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let file = 0; file < 8; file++) {
    board[squareOf(file, 0)] = WHITE + backRank[file];
    board[squareOf(file, 1)] = WHITE + 'P';
    board[squareOf(file, 6)] = BLACK + 'P';
    board[squareOf(file, 7)] = BLACK + backRank[file];
  }
  return {
    board,
    turn: WHITE,
    castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
    enPassantSquare: null,
  };
}

function clonePosition(position) {
  return {
    board: position.board.slice(),
    turn: position.turn,
    castlingRights: { ...position.castlingRights },
    enPassantSquare: position.enPassantSquare,
  };
}

const KNIGHT_OFFSETS = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

const KING_OFFSETS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];

const BISHOP_DIRECTIONS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const QUEEN_DIRECTIONS = [...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS];

function slidingAttacks(board, square, directions) {
  const targets = [];
  const file = fileOf(square);
  const rank = rankOf(square);
  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    while (onBoard(f, r)) {
      const target = squareOf(f, r);
      targets.push(target);
      if (board[target] !== null) break;
      f += df;
      r += dr;
    }
  }
  return targets;
}

function steppingAttacks(square, offsets) {
  const targets = [];
  const file = fileOf(square);
  const rank = rankOf(square);
  for (const [df, dr] of offsets) {
    const f = file + df;
    const r = rank + dr;
    if (onBoard(f, r)) targets.push(squareOf(f, r));
  }
  return targets;
}

// A pawn's diagonal "attack" squares matter for check/castling safety even
// when empty — this is deliberately separate from generatePawnMoves, which
// only offers a diagonal as an actual move when it's a real (or en passant)
// capture.
function pawnAttackSquares(square, color) {
  const direction = color === WHITE ? 1 : -1;
  const file = fileOf(square);
  const rank = rankOf(square);
  const targets = [];
  for (const df of [-1, 1]) {
    const f = file + df;
    const r = rank + direction;
    if (onBoard(f, r)) targets.push(squareOf(f, r));
  }
  return targets;
}

function squaresAttackedBy(position, square) {
  const piece = position.board[square];
  const type = pieceType(piece);
  const color = pieceColor(piece);
  if (type === 'P') return pawnAttackSquares(square, color);
  if (type === 'N') return steppingAttacks(square, KNIGHT_OFFSETS);
  if (type === 'K') return steppingAttacks(square, KING_OFFSETS);
  if (type === 'B') return slidingAttacks(position.board, square, BISHOP_DIRECTIONS);
  if (type === 'R') return slidingAttacks(position.board, square, ROOK_DIRECTIONS);
  return slidingAttacks(position.board, square, QUEEN_DIRECTIONS);
}

function isSquareAttacked(position, targetSquare, byColor) {
  for (let square = 0; square < 64; square++) {
    const piece = position.board[square];
    if (piece && pieceColor(piece) === byColor && squaresAttackedBy(position, square).includes(targetSquare)) {
      return true;
    }
  }
  return false;
}

function findKing(position, color) {
  return position.board.indexOf(color + 'K');
}

function isInCheck(position, color) {
  return isSquareAttacked(position, findKing(position, color), oppositeColor(color));
}

const PROMOTION_PIECES = ['Q', 'R', 'B', 'N'];

function addPawnMove(moves, from, to) {
  const targetRank = rankOf(to);
  if (targetRank === 0 || targetRank === 7) {
    for (const promotion of PROMOTION_PIECES) moves.push({ from, to, promotion });
  } else {
    moves.push({ from, to, promotion: null });
  }
}

function generatePawnMoves(position, square) {
  const moves = [];
  const color = pieceColor(position.board[square]);
  const direction = color === WHITE ? 1 : -1;
  const startRank = color === WHITE ? 1 : 6;
  const file = fileOf(square);
  const rank = rankOf(square);

  if (onBoard(file, rank + direction)) {
    const oneStep = squareOf(file, rank + direction);
    if (position.board[oneStep] === null) {
      addPawnMove(moves, square, oneStep);
      const twoStep = squareOf(file, rank + 2 * direction);
      if (rank === startRank && position.board[twoStep] === null) {
        moves.push({ from: square, to: twoStep, promotion: null });
      }
    }
  }

  for (const df of [-1, 1]) {
    const f = file + df;
    const r = rank + direction;
    if (!onBoard(f, r)) continue;
    const target = squareOf(f, r);
    const occupant = position.board[target];
    const isEnPassant = target === position.enPassantSquare;
    if ((occupant && pieceColor(occupant) === oppositeColor(color)) || isEnPassant) {
      addPawnMove(moves, square, target);
    }
  }

  return moves;
}

function generateCastlingMoves(position, square) {
  const moves = [];
  const color = pieceColor(position.board[square]);
  const rank = color === WHITE ? 0 : 7;
  const opponent = oppositeColor(color);
  if (square !== squareOf(4, rank) || isInCheck(position, color)) return moves;

  const kingSideRight = color === WHITE ? position.castlingRights.wK : position.castlingRights.bK;
  if (
    kingSideRight
    && position.board[squareOf(5, rank)] === null
    && position.board[squareOf(6, rank)] === null
    && !isSquareAttacked(position, squareOf(5, rank), opponent)
  ) {
    moves.push({ from: square, to: squareOf(6, rank), promotion: null });
  }

  const queenSideRight = color === WHITE ? position.castlingRights.wQ : position.castlingRights.bQ;
  if (
    queenSideRight
    && position.board[squareOf(3, rank)] === null
    && position.board[squareOf(2, rank)] === null
    && position.board[squareOf(1, rank)] === null
    && !isSquareAttacked(position, squareOf(3, rank), opponent)
  ) {
    moves.push({ from: square, to: squareOf(2, rank), promotion: null });
  }

  return moves;
}

function generatePseudoLegalMoves(position) {
  const moves = [];
  const color = position.turn;
  for (let square = 0; square < 64; square++) {
    const piece = position.board[square];
    if (!piece || pieceColor(piece) !== color) continue;
    const type = pieceType(piece);

    if (type === 'P') {
      moves.push(...generatePawnMoves(position, square));
      continue;
    }
    if (type === 'K') {
      moves.push(...generateCastlingMoves(position, square));
    }
    for (const target of squaresAttackedBy(position, square)) {
      const occupant = position.board[target];
      if (!occupant || pieceColor(occupant) !== color) {
        moves.push({ from: square, to: target, promotion: null });
      }
    }
  }
  return moves;
}

const HOME_SQUARES = {
  whiteQueenRook: squareOf(0, 0),
  whiteKingRook: squareOf(7, 0),
  blackQueenRook: squareOf(0, 7),
  blackKingRook: squareOf(7, 7),
};

function updateCastlingRights(rights, from, to, movingPiece) {
  const next = { ...rights };
  if (movingPiece === 'wK') { next.wK = false; next.wQ = false; }
  if (movingPiece === 'bK') { next.bK = false; next.bQ = false; }
  if (from === HOME_SQUARES.whiteQueenRook || to === HOME_SQUARES.whiteQueenRook) next.wQ = false;
  if (from === HOME_SQUARES.whiteKingRook || to === HOME_SQUARES.whiteKingRook) next.wK = false;
  if (from === HOME_SQUARES.blackQueenRook || to === HOME_SQUARES.blackQueenRook) next.bQ = false;
  if (from === HOME_SQUARES.blackKingRook || to === HOME_SQUARES.blackKingRook) next.bK = false;
  return next;
}

function applyMove(position, move) {
  const next = clonePosition(position);
  const { from, to, promotion } = move;
  const movingPiece = position.board[from];
  const color = pieceColor(movingPiece);
  const type = pieceType(movingPiece);

  next.board[from] = null;
  next.board[to] = promotion ? color + promotion : movingPiece;

  if (type === 'P' && to === position.enPassantSquare && fileOf(from) !== fileOf(to)) {
    const capturedPawnSquare = squareOf(fileOf(to), rankOf(from));
    next.board[capturedPawnSquare] = null;
  }

  if (type === 'K' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    const rank = rankOf(from);
    if (fileOf(to) === 6) {
      next.board[squareOf(5, rank)] = next.board[squareOf(7, rank)];
      next.board[squareOf(7, rank)] = null;
    } else {
      next.board[squareOf(3, rank)] = next.board[squareOf(0, rank)];
      next.board[squareOf(0, rank)] = null;
    }
  }

  next.castlingRights = updateCastlingRights(position.castlingRights, from, to, movingPiece);

  next.enPassantSquare = null;
  if (type === 'P' && Math.abs(rankOf(to) - rankOf(from)) === 2) {
    next.enPassantSquare = squareOf(fileOf(from), (rankOf(from) + rankOf(to)) / 2);
  }

  next.turn = oppositeColor(color);
  return next;
}

function generateLegalMoves(position) {
  const color = position.turn;
  return generatePseudoLegalMoves(position).filter((move) => !isInCheck(applyMove(position, move), color));
}

function isMoveLegal(position, move) {
  return generateLegalMoves(position).some(
    (legal) => legal.from === move.from
      && legal.to === move.to
      && (legal.promotion || null) === (move.promotion || null),
  );
}

function getStatus(position) {
  const legalMoves = generateLegalMoves(position);
  const inCheck = isInCheck(position, position.turn);
  if (legalMoves.length === 0) return inCheck ? 'checkmate' : 'stalemate';
  return inCheck ? 'check' : 'normal';
}

export {
  WHITE,
  BLACK,
  createInitialPosition,
  clonePosition,
  generateLegalMoves,
  applyMove,
  isMoveLegal,
  isInCheck,
  getStatus,
  squareToAlgebraic,
  algebraicToSquare,
  fileOf,
  rankOf,
  squareOf,
  pieceColor,
  pieceType,
};
