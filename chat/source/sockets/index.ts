import { emitChannels, privateGroupChat } from "./privateChat.socket";
import { connection, joinChat, singleGameChat } from "./singleGameChat.socket";

export default (socket: any) => {
  connection();

  socket.on("joinChat", (room: { channelId: number; userId: number }) => {
    joinChat(socket, room.channelId, room.userId);
  });
  socket.on(`groupMessage`, (newMessageRecieved: any) => {
    singleGameChat(socket, newMessageRecieved);
  });
  socket.on(`privateGroupChat`, (newMessageRecieved: any) => {
    privateGroupChat(newMessageRecieved);
  });
  socket.on("getChannels", (userId: number) => {
    emitChannels(socket, userId);
  });

  // disconnectUser()
};
