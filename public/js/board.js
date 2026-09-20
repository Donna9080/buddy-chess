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

function renderBoard({ position, container, onMove, lastMove = null }) {
  const legalMoves = generateLegalMoves(position);
  let selectedSquare = null;

  function draw() {
    container.innerHTML = '';
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
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
    const isSelectable = piece !== null && pieceColor(piece) === position.turn;

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
