import { io } from "../server";
import BetService from "../bet/bet.service";
let connectedUsers: any = {};
const socketHandShake = async () => {
  io.on("connection", (sockets) => {
    sockets.on("userConnected", (userId) => {
      const room = userId;
      sockets.join(room);
      connectedUsers[room] = sockets.id;
      BetService.pushNotification(userId);
    });

    sockets.on("seen", (userId) => {
      if (userId) {
        BetService.readNotification(userId);
      }
    });
  });
};
const notficationSocket = async (
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
    case "nflDashboard":
      io.emit("nflDashboard", data);
      break;
    case "nflLiveBoxscore":
      io.emit("nflLiveBoxscore", data);
      break;
    case "ncaafDashboard":
      io.emit("ncaafDashboard", data);
      break;
    case "ncaafLiveBoxscore":
      io.emit("ncaafLiveBoxscore", data);
      break;
    case "betUpdate":
      io.emit("betUpdate", data);
      break;
    case "betConfirmed":
      io.emit("betConfirmed", data);
      break;
    default:
      break;
  }
};
export default { socket, socketHandShake, notficationSocket };
