// online.js — the Online mode client. Token management + the WebSocket
// connection live here first (T4.4); the room-code entry screen and the
// actual game UI wiring land in T4.5.

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

export { getOrCreateToken, connectToRoom };
