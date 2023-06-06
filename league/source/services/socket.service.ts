import { io } from "../server";

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

    default:
      break;
  }
};
export default socket;
