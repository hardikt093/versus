import { privateGroupChat } from "./privateChat.socket";
import {
  connection,
  getConversation,
  joinChat,
  singleGameChat,
} from "./singleGameChat.socket";

export default (socket: any) => {
  const myId = socket.handshake.query.userId
    ? socket.handshake.query.userId
    : 0;
  connection();

  socket.on("joinChat", (room: { channelId: number; userId: number }) => {
    joinChat(socket, room.channelId, room.userId);
  });
  socket.on(`groupMessage`, (newMessageRecieved: any) => {
    singleGameChat(socket, newMessageRecieved);
  });
  socket.on(`getConversation`, (channelId: number) => {
    getConversation(socket, channelId);
  });
  socket.on(`privateGroupChat`, (newMessageRecieved: any) => {
    privateGroupChat(newMessageRecieved);
  });
  // disconnectUser()
};
