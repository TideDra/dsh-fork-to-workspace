import { randomUUID } from 'node:crypto';

export const name = 'fork-to-workspace';
export const inject = [
  'agents',
  'agentDefaultModel',
  'sessionQuery',
  'workspaceRegistry',
  'webServer',
  'connection',
];

const FORK_ROUTE = '/fork-to-workspace/fork';
const MAX_BODY_BYTES = 16 * 1024;

function latestCompletedPrefixBoundary(events) {
  const lastTurnEnd = events.findLast((event) => event.type === 'turn/end');
  if (lastTurnEnd === undefined) return undefined;
  let boundary = lastTurnEnd.seq;
  for (const next of events.slice(boundary + 1)) {
    if (
      next.type === 'turn/start' ||
      (next.type === 'user/message' && next.surfaceOp === 'append') ||
      next.type === 'agent/inbox/spliced'
    ) {
      break;
    }
    boundary = next.seq;
  }
  return boundary;
}

function increasedForkTitle(title) {
  const ascii = /^(.*?)\((\d+)\)$/u.exec(title);
  if (ascii?.[1] !== undefined && ascii[2] !== undefined) {
    return `${ascii[1]}(${BigInt(ascii[2]) + 1n})`;
  }
  const fullWidth = /^(.*?)（(\d+)）$/u.exec(title);
  if (fullWidth?.[1] !== undefined && fullWidth[2] !== undefined) {
    return `${fullWidth[1]}（${BigInt(fullWidth[2]) + 1n}）`;
  }
  return `${title} (1)`;
}

function buildCompletedForkSeed(events, boundary) {
  const seed = events.slice(0, boundary + 1);
  seed.push({
    type: 'session/end-seed',
    seq: boundary + 1,
    time: events[boundary].time,
    data: { inherited: true },
  });
  return seed;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

async function composeAgentForObservation(ctx, presetId) {
  const presets = ctx.get('agentPresets');
  if (presets === undefined) {
    return { setup: () => {} };
  }
  const resolvedId = (await presets.resolve(presetId)).id;
  return {
    agentPreset: resolvedId,
    setup: async (agentCtx) => {
      await presets.mount(agentCtx, resolvedId);
    },
  };
}

export async function forkSessionToWorkspace(ctx, request) {
  const sourceSessionId = typeof request?.sessionId === 'string' ? request.sessionId.trim() : '';
  const targetWorkspaceId = typeof request?.workspaceId === 'string' ? request.workspaceId.trim() : '';
  if (!sourceSessionId || !targetWorkspaceId) {
    return { ok: false, status: 400, code: 'bad-request', message: 'sessionId and workspaceId are required' };
  }

  const workspace = ctx.workspaceRegistry.get(targetWorkspaceId);
  if (workspace === undefined) {
    return { ok: false, status: 404, code: 'workspace/not-found', message: `Workspace "${targetWorkspaceId}" not found` };
  }

  const persistence = ctx.get('sessionPersistence');
  if (request.allowMigration === false && ctx.get('sessions')?.get(sourceSessionId) === undefined) {
    const stat = await persistence?.stat(sourceSessionId);
    if (stat?.formatStatus === 'migration-required') {
      return {
        ok: false,
        status: 409,
        code: 'session/migration-required',
        message: 'Open the source session to complete migration before forking',
      };
    }
  }

  let source;
  try {
    source = await ctx.sessionQuery.observeSession(sourceSessionId);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'SESSION_QUERY_SESSION_NOT_FOUND') {
      return { ok: false, status: 404, code: 'session/not-found', message: `Session "${sourceSessionId}" not found` };
    }
    return { ok: false, status: 500, code: 'internal', message: `Fork source unavailable: ${String(error)}` };
  }

  try {
    if (source.header.origin === 'subagent') {
      return { ok: false, status: 400, code: 'session/subagent-owned', message: 'Subagent sessions cannot be forked as ordinary sessions' };
    }
    const boundary = latestCompletedPrefixBoundary(source.events);
    if (boundary === undefined || source.events[boundary]?.seq !== boundary) {
      return {
        ok: false,
        status: 409,
        code: 'session/fork-unavailable',
        message: `Session "${sourceSessionId}" has no completed turn to fork from`,
      };
    }

    const seed = buildCompletedForkSeed(source.events, boundary);
    const childId = `session-${randomUUID()}`;
    const presetId = source.projections?.values?.agentPreset ?? source.header.agentPreset ?? undefined;
    const composition = await composeAgentForObservation(ctx, presetId);
    const { provider, model } = ctx.agentDefaultModel.currentSelection();

    const handle = await ctx.agents.create({
      sessionId: childId,
      seed,
      inheritedEventCount: boundary + 1,
      meta: {
        cwd: workspace.path,
        isSeeded: true,
        ...(composition.agentPreset === undefined ? {} : { agentPreset: composition.agentPreset }),
      },
      agentOptions: { provider, model },
      setup: composition.setup,
    });

    const titles = ctx.get('sessionTitle');
    if (titles !== undefined && handle?.agent?.session !== undefined) {
      const sourceTitle = await ctx.sessionQuery.readTitle(sourceSessionId).catch(() => undefined);
      if (sourceTitle?.title) {
        try {
          titles.rename(handle.agent.session, increasedForkTitle(sourceTitle.title));
        } catch {}
      }
    }

    await workspace.attachSession(childId);

    return {
      ok: true,
      sessionId: childId,
      workspaceId: workspace.id,
      cwd: workspace.path,
    };
  } finally {
    source[Symbol.dispose]?.();
  }
}

export function apply(ctx) {
  ctx.effect(() => {
    return ctx.webServer.register({
      kind: 'exact',
      path: FORK_ROUTE,
      handler: async (req, res) => {
        const rejection = ctx.connection.requestRejection(req);
        if (rejection !== undefined) {
          res.statusCode = rejection;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.setHeader('allow', 'POST');
          sendJson(res, 405, { code: 'method-not-allowed', message: 'Method not allowed' });
          return;
        }
        const contentType = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase();
        if (contentType !== 'application/json') {
          sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' });
          return;
        }
        let body;
        try {
          body = await readJsonBody(req);
        } catch (error) {
          const code = error instanceof Error ? error.message : 'BAD_REQUEST';
          sendJson(res, code === 'PAYLOAD_TOO_LARGE' ? 413 : 400, {
            code: 'bad-request',
            message: code === 'PAYLOAD_TOO_LARGE' ? 'Request body too large' : 'Request body must be valid JSON',
          });
          return;
        }

        const result = await forkSessionToWorkspace(ctx, body);
        if (!result.ok) {
          sendJson(res, result.status, { code: result.code, message: result.message });
          return;
        }
        sendJson(res, 200, {
          sessionId: result.sessionId,
          workspaceId: result.workspaceId,
          cwd: result.cwd,
        });
      },
    });
  }, 'fork-to-workspace: HTTP route');
}
