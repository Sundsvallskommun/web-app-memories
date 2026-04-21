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
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`ENV: ${this.env}`);
      logger.info(`Listening on port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use(
      cors({
        credentials: CREDENTIALS === 'true',
        origin: NODE_ENV === 'development' ? true : ORIGIN,
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
