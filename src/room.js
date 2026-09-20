// room.js — one SQLite-backed Durable Object per online game room, reached
// via env.ROOM.getByName(roomCode). See ProductSpec.md §6 for the full
// design. The player token is entirely client-owned (a "coat-check
// ticket") — this file never invents one itself; it only ever labels a
// seat with whatever token the connecting client sent.

import { DurableObject } from 'cloudflare:workers';
import { createInitialPosition, applyMove, isMoveLegal } from '../public/js/rules.js';

const STORAGE_KEY = 'state';

function createEmptyState() {
  return {
    position: createInitialPosition(),
    seats: { w: null, b: null },
  };
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = createEmptyState();
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get(STORAGE_KEY);
      if (saved) this.state = saved;
    });
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade request', { status: 426 });
    }

    const token = new URL(request.url).searchParams.get('token') ?? crypto.randomUUID();

    const { 0: client, 1: server } = new WebSocketPair();

    // acceptWebSocket (rather than a plain server.accept() + addEventListener)
    // is what lets this object hibernate between messages instead of having
    // to stay resident in memory for the life of every open connection.
    this.ctx.acceptWebSocket(server);

    const seat = await this.assignSeat(token);
    // The seat and token live on the connection itself (not just in a JS
    // variable), because hibernation can drop this object from memory
    // between messages — serializeAttachment is what survives that.
    server.serializeAttachment({ seat, token });

    server.send(JSON.stringify({ type: 'seated', payload: { seat, token } }));
    server.send(JSON.stringify({ type: 'state', payload: this.state }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // A token that already matches a seat reconnects to that exact seat; a
  // new token fills whichever seat is open; once both are full, everyone
  // else is a spectator — regardless of what token they showed up with.
  async assignSeat(token) {
    if (this.state.seats.w === token) return 'w';
    if (this.state.seats.b === token) return 'b';

    let seat;
    if (this.state.seats.w === null) {
      seat = 'w';
    } else if (this.state.seats.b === null) {
      seat = 'b';
    } else {
      return 'spectator';
    }
    this.state.seats[seat] = token;
    await this.ctx.storage.put(STORAGE_KEY, this.state);
    return seat;
  }

  async webSocketMessage(ws, message) {
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type === 'move') {
      const { seat } = ws.deserializeAttachment() ?? {};

      if (seat !== this.state.position.turn) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Not your turn' }));
        return;
      }
      // The server is the referee, not a bystander: every move is checked
      // against rules.js again here, regardless of what the client already
      // checked before sending it.
      if (!isMoveLegal(this.state.position, parsed.payload)) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Illegal move' }));
        return;
      }

      this.state.position = applyMove(this.state.position, parsed.payload);
      await this.ctx.storage.put(STORAGE_KEY, this.state);
      this.broadcast({ type: 'state', payload: this.state });
    }
  }

  broadcast(message) {
    const text = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) ws.send(text);
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(code, reason);
  }
}
