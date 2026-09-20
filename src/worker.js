// worker.js — the Worker entry point. wrangler.jsonc only routes requests
// under /room/* here (see assets.run_worker_first); every other request is
// served directly as a static file without ever reaching this code.

export { Room } from './room.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([A-Za-z0-9]+)$/);

    if (match) {
      const roomCode = match[1].toUpperCase();
      const room = env.ROOM.getByName(roomCode);
      return room.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
