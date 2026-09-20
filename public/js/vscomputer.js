import { createInitialPosition, applyMove, getStatus } from './rules.js';
import { renderBoard } from './board.js';
import { chooseMove } from './ai.js';
import { playMoveSound } from './sound.js';

const setupEl = document.getElementById('setup');
const gameEl = document.getElementById('game');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const startButton = document.getElementById('start-button');

// A short pause before the computer's move so it doesn't feel like an
// instant, jarring snap — purely a UI nicety, unrelated to how fast ai.js
// actually computes the move.
const THINKING_DELAY_MS = 400;

let position = null;
let lastMove = null;
let playerColor = 'w';
let searchDepth = 2;

startButton.addEventListener('click', () => {
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
    orientation: playerColor,
  });

  const mover = position.turn === 'w' ? 'White' : 'Black';
  const winner = position.turn === 'w' ? 'Black' : 'White';
  const messages = {
    checkmate: `Checkmate — ${winner} wins!`,
    stalemate: 'Stalemate — the game is a draw.',
    'draw-insufficient-material': "Draw — neither side has enough pieces left to checkmate.",
    check: `${mover} to move — check!`,
    normal: isPlayerTurn ? `Your move (${mover})` : 'Computer is thinking...',
  };
  statusEl.textContent = messages[getStatus(position)];
}

function handlePlayerMove(move) {
  position = applyMove(position, move);
  lastMove = move;
  playMoveSound();
  update();
  maybeMakeComputerMove();
}

const GAME_OVER_STATUSES = ['checkmate', 'stalemate', 'draw-insufficient-material'];

function maybeMakeComputerMove() {
  if (position.turn === playerColor) return;
  if (GAME_OVER_STATUSES.includes(getStatus(position))) return;

  setTimeout(() => {
    const move = chooseMove(position, searchDepth);
    if (!move) return;
    position = applyMove(position, move);
    lastMove = move;
    playMoveSound();
    update();
  }, THINKING_DELAY_MS);
}
