import 'reflect-metadata';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { NODE_ENV, PORT, BASE_URL_PREFIX, ORIGIN, CREDENTIALS, SECRET_KEY, LOG_FORMAT } from '@/config';
import errorMiddleware from '@middlewares/error.middleware';
import { logger, stream } from '@utils/logger';

export class App {
  public app: express.Application;
  public port: string | number;
  public env: string;

  constructor(controllers: Function[]) {
    this.app = express();
    this.port = PORT;
    this.env = NODE_ENV;

    this.initializeMiddlewares();
    this.initializeRoutes(controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    const server = this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`ENV: ${this.env}`);
      logger.info(`Listening on port ${this.port}`);
      logger.info(`=================================`);
    });

    // OpenShift sends SIGTERM when it stops a pod (rolling update, scale down). As the
    // container's main process, Node does not exit on it by itself, so stop taking new
    // requests, let the running ones finish and exit, before OpenShift's 30 s grace period ends.
    const shutdown = (signal: NodeJS.Signals) => {
      logger.info(`${signal} received, closing the server`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 20000).unref();
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        frameguard: false,
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'frame-ancestors': ["'self'", ORIGIN],
            'object-src': ["'self'"],
          },
        },
      }),
    );
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use(
      cors({
        credentials: CREDENTIALS === 'true',
        origin: NODE_ENV === 'development' ? true : ORIGIN,
        exposedHeaders: ['Content-Disposition'],
      }),
    );

    const MemoryStore = createMemoryStore(session);
    this.app.use(
      session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: new MemoryStore({ checkPeriod: 86400000 }),
        cookie: {
          secure: NODE_ENV === 'production',
          sameSite: 'lax',
        },
      }),
    );
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      cors: false, // Handled by middleware above
      routePrefix: BASE_URL_PREFIX,
      controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}
