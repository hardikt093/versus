import { disconnect } from "./chat.service";

export default (socket: any) => {
  const myId = socket.handshake.query.userId;
  // connection(Number(myId), socket);

  socket.on("disconnect", () => disconnect(Number(myId), socket));
};
