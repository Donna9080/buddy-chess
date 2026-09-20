// room.js — one SQLite-backed Durable Object per online game room, reached
// via env.ROOM.getByName(roomCode). See ProductSpec.md §6 for the full
// design. Move *validation* and seat *assignment* land in T4.3 — this file
// currently applies whatever move it's sent, unchecked, purely to prove the
// storage mechanism itself: state survives hibernation and a full restart.

import { DurableObject } from 'cloudflare:workers';
import { createInitialPosition, applyMove } from '../public/js/rules.js';

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

    const { 0: client, 1: server } = new WebSocketPair();

    // acceptWebSocket (rather than a plain server.accept() + addEventListener)
    // is what lets this object hibernate between messages instead of having
    // to stay resident in memory for the life of every open connection.
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: 'state', payload: this.state }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type === 'move') {
      this.state.position = applyMove(this.state.position, parsed.payload);
      // Saved immediately, synchronously with the move itself — no timers,
      // no periodic snapshotting. If this doesn't complete, the move isn't
      // considered to have happened as far as a reconnecting player is
      // concerned.
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
