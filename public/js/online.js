// online.js — the Online mode client. The server is the referee: this file
// never applies a move locally — it sends the player's intended move to
// the Durable Object and only updates the board once the server broadcasts
// the resulting state back. See ProductSpec.md §6.4.

import { getStatus } from './rules.js';
import { renderBoard } from './board.js';
import { playMoveSound } from './sound.js';

function tokenStorageKey(roomCode) {
  return `buddy-online-token-${roomCode}`;
}

// The token is a random string the browser makes up and remembers per
// room — not a password, just a "coat-check ticket" so a refresh can prove
// to the server "I'm the same browser that was already sitting in this
// seat." See ProductSpec.md §6.5.
function getOrCreateToken(roomCode) {
  const key = tokenStorageKey(roomCode);
  try {
    let token = localStorage.getItem(key);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(key, token);
    }
    return token;
  } catch {
    // Browser storage can be unavailable (private mode, disabled). The
    // connection still works for this visit, it just won't be able to
    // reconnect to the same seat after a refresh.
    return crypto.randomUUID();
  }
}

function connectToRoom(roomCode) {
  const token = getOrCreateToken(roomCode);
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${location.host}/room/${roomCode}?token=${token}`);
}

const joinEl = document.getElementById('join');
const gameEl = document.getElementById('game');
const roomCodeInput = document.getElementById('room-code-input');
const joinButton = document.getElementById('join-button');
const roomCodeDisplay = document.getElementById('room-code-display');
const seatLabel = document.getElementById('seat-label');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const newGameButton = document.getElementById('new-game-button');

const SEAT_LABELS = {
  w: 'You are White',
  b: 'You are Black',
  spectator: "You're watching as a spectator",
};

let ws = null;
let mySeat = null;
// undefined = no state received yet (skip the sound on the initial
// snapshot); a real move key that differs from the last one is what
// actually triggers the sound — a New Game reset (lastMove -> null)
// deliberately does not play the move sound.
let lastMoveKey;

function moveKeyFor(move) {
  return move ? `${move.from}-${move.to}-${move.promotion ?? ''}` : null;
}

function normalizeRoomCode(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function joinRoom(roomCode) {
  ws = connectToRoom(roomCode);

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'seated') {
      mySeat = message.payload.seat;
      seatLabel.textContent = SEAT_LABELS[mySeat];
      // Only a seated player can reset the game (the server enforces this
      // too) — hiding the button for spectators avoids a dead click with no
      // feedback, which is exactly the bug this fixes.
      newGameButton.hidden = mySeat === 'spectator';
    } else if (message.type === 'state') {
      render(message.payload);
    } else if (message.type === 'error') {
      statusEl.textContent = message.payload;
    }
  });

  roomCodeDisplay.textContent = roomCode;
  joinEl.hidden = true;
  gameEl.hidden = false;
}

function render(state) {
  const { position, lastMove } = state;
  const interactive = mySeat === position.turn;

  const moveKey = moveKeyFor(lastMove);
  if (lastMoveKey !== undefined && moveKey !== null && moveKey !== lastMoveKey) {
    playMoveSound();
  }
  lastMoveKey = moveKey;

  renderBoard({
    position,
    container: boardEl,
    lastMove,
    interactive,
    onMove: (move) => ws.send(JSON.stringify({ type: 'move', payload: move })),
  });

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

joinButton.addEventListener('click', () => {
  const roomCode = normalizeRoomCode(roomCodeInput.value);
  if (!roomCode) return;
  joinRoom(roomCode);
});

newGameButton.addEventListener('click', () => {
  if (!ws) return;
  ws.send(JSON.stringify({ type: 'newGame' }));
});

export { getOrCreateToken, connectToRoom };
