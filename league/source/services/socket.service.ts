import { io } from "../server";

const socket = async (eventName: string, data: object | Array<object>) => {
  switch (eventName) {
    case "mlbUpcomingMatch":
      io.emit("mlbUpcomingMatch", data);
      break;
    case "mlbFinalMatch":
      console.log(data)
      io.emit("mlbFinalMatch", data);
      break;

    default:
      break;
  }
};
export default socket;
