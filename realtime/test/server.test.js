import { createServer } from 'node:http';
import { afterEach, test } from '@jest/globals';
import { io as createClient } from 'socket.io-client';
import { createRealtimeServer, parseRealtimeMessage } from '../src/server.js';

const allowedOrigin = 'http://localhost:5173';
const eventChannel = 'naldo:events';
const runningServers = [];

class FakeRedisSubscriber {
  async subscribe(channel, listener) {
    this.channel = channel;
    this.listener = listener;
  }

  publish(message) {
    this.listener?.(JSON.stringify(message));
  }
}

async function startServer(validateSession, revalidationIntervalMs = 60_000) {
  const httpServer = createServer();
  const redisSubscriber = new FakeRedisSubscriber();
  const { io, httpServer: server } = await createRealtimeServer({
    httpServer,
    redisSubscriber,
    eventChannel,
    allowedOrigins: [allowedOrigin],
    validateSession,
    revalidationIntervalMs,
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const context = { io, httpServer: server, redisSubscriber, url: `http://127.0.0.1:${address.port}` };
  runningServers.push(context);
  return context;
}

function connect(url, cookie) {
  const client = createClient(url, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { origin: allowedOrigin, cookie },
  });

  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve(client));
    client.once('connect_error', (error) => {
      client.close();
      reject(error);
    });
  });
}

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map(({ io }) => new Promise((resolve) => io.close(resolve))));
});

test('unauthenticated socket connections are rejected', async () => {
  const server = await startServer(async () => null);

  await expect(connect(server.url, 'laravel_session=invalid')).rejects.toThrow('unauthorized');
});

test('sale notifications are delivered only to the room for the validated business', async () => {
  const sessions = new Map([
    ['laravel_session=business-a', { business_id: 12 }],
    ['laravel_session=business-b', { business_id: 34 }],
  ]);
  const server = await startServer(async ({ cookie, origin }) => {
    expect(origin).toBe(allowedOrigin);
    return sessions.get(cookie) ?? null;
  });

  const [clientA, clientB] = await Promise.all([
    connect(server.url, 'laravel_session=business-a'),
    connect(server.url, 'laravel_session=business-b'),
  ]);
  expect(server.redisSubscriber.channel).toBe(eventChannel);

  const received = new Promise((resolve) => clientA.once('sale.created', resolve));
  let leakedToBusinessB = false;
  clientB.once('sale.created', () => { leakedToBusinessB = true; });
  server.redisSubscriber.publish({
    event: 'sale.created',
    business_id: 12,
    payload: { id: 81, total: '45.20', created_at: '2026-10-12T12:00:00.000000Z' },
  });

  expect(await received).toEqual({ id: 81, total: '45.20', created_at: '2026-10-12T12:00:00.000000Z' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(leakedToBusinessB).toBe(false);
  clientA.close();
  clientB.close();
});

test('an expired session disconnects its active socket during revalidation', async () => {
  let validationCount = 0;
  const server = await startServer(async () => {
    validationCount += 1;
    return validationCount === 1 ? { business_id: 56 } : null;
  }, 20);
  const client = await connect(server.url, 'laravel_session=expires');
  const disconnected = new Promise((resolve) => client.once('disconnect', resolve));

  await disconnected;
  expect(validationCount).toBeGreaterThanOrEqual(2);
});

test('malformed and unapproved Redis messages are ignored', () => {
  expect(parseRealtimeMessage('{not json')).toBeNull();
  expect(parseRealtimeMessage(JSON.stringify({
    event: 'sale.deleted',
    business_id: 12,
    payload: { id: 81, total: '45.20', created_at: '2026-10-12T12:00:00.000000Z' },
  }))).toBeNull();
});
