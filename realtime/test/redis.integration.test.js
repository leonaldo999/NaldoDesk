import { createServer } from 'node:http';
import { expect, test } from '@jest/globals';
import { createClient } from 'redis';
import { io as createSocketClient } from 'socket.io-client';
import { createRealtimeServer } from '../src/server.js';

const integrationEnabled = process.env.REALTIME_INTEGRATION_TESTS === 'true';

function redisOptions() {
  const options = {
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    database: Number(process.env.REDIS_DB || 0),
  };
  if (process.env.REDIS_USERNAME) options.username = process.env.REDIS_USERNAME;
  if (process.env.REDIS_PASSWORD) options.password = process.env.REDIS_PASSWORD;
  return options;
}

const redisIntegrationTest = integrationEnabled ? test : test.skip;

redisIntegrationTest('Redis Pub/Sub forwards a sale event through Socket.io to its business room', async () => {
  const publisher = createClient(redisOptions());
  const subscriber = createClient(redisOptions());
  publisher.on('error', () => {});
  subscriber.on('error', () => {});
  let io;
  let httpServer;
  let socket;

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);

    const eventChannel = `naldo:test:${process.pid}:${Date.now()}`;
    ({ io, httpServer } = await createRealtimeServer({
      httpServer: createServer(),
      redisSubscriber: subscriber,
      eventChannel,
      allowedOrigins: ['http://localhost:5173'],
      validateSession: async () => ({ business_id: 72 }),
    }));

    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    socket = createSocketClient(`http://127.0.0.1:${address.port}`, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { origin: 'http://localhost:5173', cookie: 'laravel_session=test' },
    });
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });

    const event = new Promise((resolve) => socket.once('sale.created', resolve));
    await publisher.publish(eventChannel, JSON.stringify({
      event: 'sale.created',
      business_id: 72,
      payload: { id: 902, total: '7.25', created_at: '2026-10-12T12:00:00.000000Z' },
    }));

    expect(await event).toEqual({ id: 902, total: '7.25', created_at: '2026-10-12T12:00:00.000000Z' });
  } finally {
    socket?.close();
    if (io) await new Promise((resolve) => io.close(resolve));
    await Promise.all([
      ...(publisher.isOpen ? [publisher.quit()] : []),
      ...(subscriber.isOpen ? [subscriber.quit()] : []),
    ]);
  }
}, 10_000);
