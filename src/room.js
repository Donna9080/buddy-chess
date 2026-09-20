// room.js — one SQLite-backed Durable Object per online game room, reached
// via env.ROOM.getByName(roomCode). See ProductSpec.md §6 for the full
// design. This file only proves the WebSocket + object-identity plumbing
// works (T4.1) — game state, seats, and move validation land in T4.2/T4.3.

import { DurableObject } from 'cloudflare:workers';

export class Room extends DurableObject {
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade request', { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();

    // acceptWebSocket (rather than a plain server.accept() + addEventListener)
    // is what lets this object hibernate between messages instead of having
    // to stay resident in memory for the life of every open connection.
    this.ctx.acceptWebSocket(server);

    const objectId = this.ctx.id.toString();
    server.send(JSON.stringify({ type: 'connected', payload: { objectId } }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    // Move handling arrives in T4.3.
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(code, reason);
  }
}
