import { io } from "../server";
let connectedUsers: any = {};
import BetService from "../bet/bet.service";
export const socketHandShake = () => {
  io.on("connection", (sockets) => {
    sockets.on("userConnected", (userId) => {
      const room = userId;
      sockets.join(room);
      connectedUsers[room] = sockets.id;
    });

    sockets.on("seen", (userId) => {
      BetService.readNotification(userId);
    });
  });
};
export const notficationSocket = async (
  eventName: string,
  user: number,
  data: object | Array<object>
) => {
  const filter = connectedUsers[user];
  io.to(filter).emit(eventName, data);
};
const socket = async (eventName: string, data: object | Array<object>) => {
  switch (eventName) {
    case "mlbUpcomingMatch":
      io.emit("mlbUpcomingMatch", data);
      break;
    case "mlbFinalMatch":
      io.emit("mlbFinalMatch", data);
      break;
    case "mlbLiveMatch":
      io.emit("mlbLiveMatch", data);
      break;
    case "mlbLiveBoxscore":
      io.emit("mlbLiveBoxscore", data);
      break;
    case "nhlLiveMatch":
      io.emit("nhlLiveMatch", data);
      break;
    case "nhlUpcomingMatch":
      io.emit("nhlUpcomingMatch", data);
      break;
    case "nhlFinalMatch":
      io.emit("nhlFinalMatch", data);
      break;
    case "nhlLiveBoxscore":
      io.emit("nhlLiveBoxscore", data);
      break;
    case "nbaLiveMatch":
      io.emit("nbaLiveMatch", data);
      break;
    case "nbaUpcomingMatch":
      io.emit("nbaUpcomingMatch", data);
      break;
    case "nbaFinalMatch":
      io.emit("nbaFinalMatch", data);
      break;
    case "nbaLiveBoxscore":
      io.emit("nbaLiveBoxscore", data);
      break;
    default:
      break;
  }
};
export default socket;
