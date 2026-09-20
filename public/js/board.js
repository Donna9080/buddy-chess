// board.js — a reusable, dumb board widget. It only knows how to draw a
// position and let the player pick a legal move (including a promotion
// choice); it never mutates the position or decides what a "game" is.
// hotseat.js, and later vscomputer.js / online.js, own that.

import { generateLegalMoves, pieceColor, squareOf, fileOf, rankOf } from './rules.js';

const PIECE_GLYPHS = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const PROMOTION_CHOICES = ['Q', 'R', 'B', 'N'];
const FILE_LETTERS = 'abcdefgh';

// interactive=false renders a fully inert board (no square responds to a
// click at all) — used by vscomputer.js while it's the computer's turn, so
// the player can't pick up and move the computer's own pieces.
//
// orientation='w' (default) draws White's home rank at the bottom, as usual.
// orientation='b' draws the board rotated 180° — Black's home rank at the
// bottom — so a player can see the board from their own side. This only
// changes the order squares are drawn in and which edge coordinate labels
// land on; the square indices used everywhere else (moves, highlights,
// rules.js) are completely unaffected.
function renderBoard({ position, container, onMove, lastMove = null, interactive = true, orientation = 'w' }) {
  const legalMoves = interactive ? generateLegalMoves(position) : [];
  const flipped = orientation === 'b';
  let selectedSquare = null;

  function draw() {
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const rank = flipped ? i : 7 - i;
      for (let j = 0; j < 8; j++) {
        const file = flipped ? 7 - j : j;
        container.appendChild(buildSquare(squareOf(file, rank)));
      }
    }
  }

  function buildSquare(square) {
    const piece = position.board[square];
    const targets = selectedSquare === null
      ? []
      : legalMoves.filter((move) => move.from === selectedSquare && move.to === square);
    const isTarget = targets.length > 0;
    // Not just "your piece, your turn" — it also has to actually have a
    // legal move from here. Without this, a checkmated/stalemated king (or
    // any fully pinned piece with nowhere legal to go) would still show a
    // "selected" highlight leading nowhere, since it has no legal targets
    // to reach either way.
    const isSelectable = interactive && piece !== null && pieceColor(piece) === position.turn
      && legalMoves.some((move) => move.from === square);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `square ${(fileOf(square) + rankOf(square)) % 2 === 0 ? 'dark' : 'light'}`;
    if (piece) el.classList.add('has-piece');
    if (square === selectedSquare) el.classList.add('selected');
    if (isTarget) el.classList.add('legal-target');
    if (lastMove && (square === lastMove.from || square === lastMove.to)) el.classList.add('last-move');

    if (piece) {
      const glyph = document.createElement('span');
      glyph.className = `piece piece-${pieceColor(piece)}`;
      glyph.textContent = PIECE_GLYPHS[piece];
      el.appendChild(glyph);
    }

    // Standard board coordinates: file letters along the visually-bottom
    // rank, rank numbers along the visually-left file — which edge that is
    // in absolute rank/file terms flips along with the board itself, so the
    // labels always sit on the edge the player is actually looking at.
    const bottomRank = flipped ? 7 : 0;
    const leftFile = flipped ? 7 : 0;
    if (rankOf(square) === bottomRank) {
      const fileLabel = document.createElement('span');
      fileLabel.className = 'coordinate file';
      fileLabel.textContent = FILE_LETTERS[fileOf(square)];
      el.appendChild(fileLabel);
    }
    if (fileOf(square) === leftFile) {
      const rankLabel = document.createElement('span');
      rankLabel.className = 'coordinate rank';
      rankLabel.textContent = String(rankOf(square) + 1);
      el.appendChild(rankLabel);
    }

    // A square that is neither a piece the player to move can pick up, nor
    // a legal destination of whatever is currently selected, gets no click
    // handler at all — it must not respond to clicks in any way.
    if (isSelectable) {
      el.addEventListener('click', () => {
        selectedSquare = square;
        draw();
      });
    } else if (isTarget) {
      el.addEventListener('click', () => handleTargetClick(targets));
    }

    return el;
  }

  function handleTargetClick(targets) {
    if (targets.length === 1) {
      onMove(targets[0]);
      return;
    }
    showPromotionPicker(targets);
  }

  function showPromotionPicker(targets) {
    const color = position.turn;
    const overlay = document.createElement('div');
    overlay.className = 'promotion-overlay';
    for (const promotion of PROMOTION_CHOICES) {
      const move = targets.find((m) => m.promotion === promotion);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'promotion-choice';
      button.textContent = PIECE_GLYPHS[color + promotion];
      button.addEventListener('click', () => {
        overlay.remove();
        onMove(move);
      });
      overlay.appendChild(button);
    }
    container.appendChild(overlay);
  }

  draw();
}

export { renderBoard, PIECE_GLYPHS };
