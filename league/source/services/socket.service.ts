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

    default:
      break;
  }
};
export default socket;
