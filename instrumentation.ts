// Runs in the server context before any routes load.
// Turbopack bundles better-sqlite3 with a hashed name — we intercept it here.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Module = require('module') as typeof import('module') & { _load: Function };
    const original = Module._load.bind(Module);
    Module._load = function (request: string, ...args: unknown[]) {
      if (/^better-sqlite3-[a-f0-9]+$/.test(request)) {
        return original('better-sqlite3', ...args);
      }
      return original(request, ...args);
    };
  }
}
