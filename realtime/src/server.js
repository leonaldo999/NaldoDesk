import 'dotenv/config';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { createClient } from 'redis';

const SALE_EVENT = 'sale.created';

export function parseRealtimeMessage(rawMessage) {
  try {
    const message = JSON.parse(rawMessage);
    const sale = message?.payload;

    if (
      message?.event !== SALE_EVENT
      || !Number.isSafeInteger(message.business_id)
      || message.business_id < 1
      || !Number.isSafeInteger(sale?.id)
      || sale.id < 1
      || typeof sale.total !== 'string'
      || !/^\d+\.\d{2}$/.test(sale.total)
      || typeof sale.created_at !== 'string'
    ) {
      return null;
    }

    return {
      event: SALE_EVENT,
      businessId: message.business_id,
      payload: {
        id: sale.id,
        total: sale.total,
        created_at: sale.created_at,
      },
    };
  } catch {
    return null;
  }
}

export async function createRealtimeServer({
  httpServer = createServer(),
  redisSubscriber,
  eventChannel,
  allowedOrigins,
  validateSession,
  revalidationIntervalMs = 60_000,
}) {
  const allowedOriginSet = new Set(allowedOrigins);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    allowRequest: (request, callback) => {
      callback(null, allowedOriginSet.has(request.headers.origin));
    },
  });

  io.use(async (socket, next) => {
    const origin = socket.handshake.headers.origin;
    const cookie = socket.handshake.headers.cookie;

    if (!allowedOriginSet.has(origin) || typeof cookie !== 'string' || cookie.length === 0) {
      next(new Error('unauthorized'));
      return;
    }

    try {
      const user = await validateSession({ cookie, origin });
      const businessId = Number(user?.business_id);
      if (!Number.isSafeInteger(businessId) || businessId < 1) {
        next(new Error('unauthorized'));
        return;
      }

      socket.data.businessId = businessId;
      socket.data.session = { cookie, origin };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`business:${socket.data.businessId}`);

    let checkingSession = false;
    const revalidationTimer = setInterval(async () => {
      if (checkingSession) return;
      checkingSession = true;

      try {
        const user = await validateSession(socket.data.session);
        if (Number(user?.business_id) !== socket.data.businessId) {
          socket.disconnect(true);
        }
      } catch {
        socket.disconnect(true);
      } finally {
        checkingSession = false;
      }
    }, revalidationIntervalMs);
    revalidationTimer.unref?.();

    socket.on('disconnect', () => clearInterval(revalidationTimer));
  });

  await redisSubscriber.subscribe(eventChannel, (rawMessage) => {
    const message = parseRealtimeMessage(rawMessage);
    if (!message) return;

    io.to(`business:${message.businessId}`).emit(message.event, message.payload);
  });

  return { io, httpServer };
}

async function start() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const redisConfig = {
    socket: { host, port },
    database: Number(process.env.REDIS_DB || 0),
  };
  if (process.env.REDIS_USERNAME) redisConfig.username = process.env.REDIS_USERNAME;
  if (process.env.REDIS_PASSWORD) redisConfig.password = process.env.REDIS_PASSWORD;

  const redisSubscriber = createClient(redisConfig);
  redisSubscriber.on('error', (error) => console.error('Error de Redis:', error.message));
  await redisSubscriber.connect();

  const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const { io, httpServer } = await createRealtimeServer({
    redisSubscriber,
    eventChannel: process.env.REALTIME_EVENT_CHANNEL || 'naldo:events',
    allowedOrigins,
    validateSession: async ({ cookie, origin }) => {
      const baseUrl = (process.env.LARAVEL_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { accept: 'application/json', cookie, origin },
        signal: AbortSignal.timeout(3_000),
      });

      if (!response.ok) return null;
      return (await response.json()).user ?? null;
    },
    revalidationIntervalMs: Number(process.env.SESSION_REVALIDATION_INTERVAL_MS || 60_000),
  });

  const portNumber = Number(process.env.PORT || 3001);
  const listenHost = process.env.LISTEN_HOST || '127.0.0.1';
  httpServer.listen(portNumber, listenHost, () => {
    console.log(`Socket.io disponible en http://${listenHost}:${portNumber}`);
  });

  const shutdown = async () => {
    try {
      await redisSubscriber.unsubscribe();
    } finally {
      await redisSubscriber.quit();
      await new Promise((resolve) => io.close(resolve));
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start().catch((error) => {
    console.error('No se pudo iniciar Socket.io:', error.message);
    process.exitCode = 1;
  });
}
