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
    case "nbaLiveBoxscore":
      console.log("data", data)
      io.emit("nbaLiveBoxscore", data);
      break;

    default:
      break;
  }
};
export default socket;
