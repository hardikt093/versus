import { IChannelData, IMessage } from "../interfaces/input";
import {
  addUserToPrivateChannel,
  connection,
  createPrivateChannel,
  getConversation,
  joinChat,
  singleGameChat,
} from "./socket.service";

export default (socket: any) => {
  const myId = socket.handshake.query.userId
    ? socket.handshake.query.userId
    : 0;
  connection();
  socket.on("joinChat", (room: { channelId: number }) => {
    joinChat(socket, room.channelId, myId);
  });
  socket.on("groupMessage", (newMessageRecieved: IMessage) => {
    singleGameChat(socket, newMessageRecieved);
  });
  socket.on("getConversation", (channelId: number) => {
    getConversation(socket, channelId);
  });
  socket.on("createPrivateChannel", (channelData: IChannelData) => {
    createPrivateChannel(socket, channelData, myId);
  });
  socket.on("addPeople", (channelId: number, userId: number[]) => {
    addUserToPrivateChannel(socket, channelId, userId);
  });
};
