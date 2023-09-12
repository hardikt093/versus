import http from "http";
import express, { Express } from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";

import routes from "./routes/";
import logger from "./config/logger";
import { Server } from "socket.io";
import cron from "./utils/crons/index";
import config from "./config/config";
import socketService from "./services/socket.service"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      loggedInUser: {
        id: number;
      };
    }
  }
}

const router: Express = express();
router.use("/uploads", express.static("uploads"));
/** Logging */
router.use(morgan("dev"));
/** Parse the request */
router.use(express.urlencoded({ extended: false }));
/** Takes care of JSON data */
router.use(express.json());

router.use(
  cors({
    origin: "*",
  })
);

/** Routes */
router.use("/", routes);

/** Error handling */
router.use((req, res, next) => {
  const error = new Error("not found");
  return res.status(404).json({
    message: error.message,
  });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: number | string = process.env.PORT ?? 6060;
export const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://localhost:3000",
      "http://localhost:3001",
      "http://192.168.1.15:3000",
      "https://app.versus-social.com"
    ],
    credentials: true,
  },
});
socketService.socketHandShake()
mongoose.connect(config.mongoose.url).then((result: any) => {
  console.info(`Connected to MongoDB -${config.mongoose.url}`);
  
  httpServer.listen(PORT, () =>
    console.info(`The server is running on port ${PORT}`)
  );
  /** runing cron */
  cron;
});
// mongoose.set("debug", true);



const exitHandler = () => {
  if (httpServer) {
    httpServer.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: object) => {
  logger.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info(" received");
  if (httpServer) {
    httpServer.close();
  }
});
