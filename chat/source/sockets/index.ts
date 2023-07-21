import { IChannelData, IMessage } from "../interfaces/input";
import {
  addUserToPrivateChannel,
  createPrivateChannel,

} from "./privateChat.socket";
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

  socket.on("createPrivateChannel", (channelData: IChannelData) => {
    createPrivateChannel(socket, channelData, myId);
  });
  socket.on("addPeople", (channelId: number, userId: number[]) => {
    addUserToPrivateChannel(socket, channelId, userId);
  });
  socket.on("joinChat", (room: { channelId: number; userId: number }) => {
    joinChat(socket, room.channelId, room.userId);
  });
  socket.on(`groupMessage`, (newMessageRecieved: any) => {
    singleGameChat(socket, newMessageRecieved);
  });
  socket.on(`getConversation`, (channelId: number) => {
    getConversation(socket, channelId);
  });
  // disconnectUser()
};
