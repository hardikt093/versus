import { io } from "../server";

const socket = async (eventName: string, data: object | Array<object>) => {
  switch (eventName) {
    case "updateScore":
      io.emit("updateScore", data);
      break;

    default:
      break;
  }
};
export default socket;
