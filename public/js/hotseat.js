import { createInitialPosition, applyMove, getStatus } from './rules.js';
import { renderBoard } from './board.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

let position = createInitialPosition();

function update() {
  renderBoard({ position, container: boardEl, onMove: handleMove });

  const mover = position.turn === 'w' ? 'White' : 'Black';
  const winner = position.turn === 'w' ? 'Black' : 'White';
  const messages = {
    checkmate: `Checkmate — ${winner} wins!`,
    stalemate: 'Stalemate — the game is a draw.',
    check: `${mover} to move — check!`,
    normal: `${mover} to move`,
  };
  statusEl.textContent = messages[getStatus(position)];
}

function handleMove(move) {
  position = applyMove(position, move);
  update();
}

update();
