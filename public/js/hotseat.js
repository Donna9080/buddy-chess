import { createInitialPosition, applyMove, getStatus } from './rules.js';
import { renderBoard } from './board.js';
import { playMoveSound } from './sound.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

let position = createInitialPosition();
let lastMove = null;

function update() {
  // Two people share this screen, so "my side" changes with the turn:
  // flip the board to face whoever is about to move.
  renderBoard({ position, container: boardEl, onMove: handleMove, lastMove, orientation: position.turn });

  const mover = position.turn === 'w' ? 'White' : 'Black';
  const winner = position.turn === 'w' ? 'Black' : 'White';
  const messages = {
    checkmate: `Checkmate — ${winner} wins!`,
    stalemate: 'Stalemate — the game is a draw.',
    'draw-insufficient-material': "Draw — neither side has enough pieces left to checkmate.",
    check: `${mover} to move — check!`,
    normal: `${mover} to move`,
  };
  statusEl.textContent = messages[getStatus(position)];
}

function handleMove(move) {
  position = applyMove(position, move);
  lastMove = move;
  playMoveSound();
  update();
}

update();
