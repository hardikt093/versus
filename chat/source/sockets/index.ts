// import {
//   IConversationChange,
//   IDeleteMessage,
//   IMessageInput,
//   IMessageReaction,
//   IThreadMessage,
//   IUpdateMessageInput,
// } from "../interfaces/input";
// import {
//   connection,
//   conversationChange,
//   editMessage,
//   messageReaction,
//   messageThread,
//   myMessage,
//   deleteMessage,
//   disconnect,
// } from "./socket.service";

import {
  connection,
  getConversation,
  joinChat,
  singleGameChat,
} from "./socket.service";

// export default (socket: any) => {
//   const myId = socket.handshake.query.userId
//     ? socket.handshake.query.userId
//     : 0;
//   connection(Number(myId), socket);
//   socket.on(
//     "myMessage",
//     ({ message, conversation, myUserId }: IMessageInput) => {
//       myMessage(message, conversation, myUserId);
//     }
//   );
//   socket.on(
//     "updateMyMessage",
//     ({ myUserId, text, conversationId, messageId }: IUpdateMessageInput) => {
//       editMessage(myUserId, text, conversationId, messageId);
//     }
//   );
//   socket.on(
//     "deleteMyMessage",
//     ({ conversationId, messageId }: IDeleteMessage) => {
//       deleteMessage(conversationId, messageId);
//     }
//   );
//   socket.on(
//     "messageReaction",
//     ({ reaction, messageId, conversationId, myUserId }: IMessageReaction) => {
//       messageReaction(reaction, conversationId, messageId, myUserId);
//     }
//   );
//   socket.on(
//     "threadMessage",
//     ({ text, messageId, myUserId, conversationId }: IThreadMessage) => {
//       messageThread(text, messageId, myUserId, conversationId);
//     }
//   );
//   socket.on(
//     "conversationChange",
//     ({ conversationId, myUserId }: IConversationChange) =>
//       conversationChange(conversationId, myUserId, socket)
//   );
//   // socket.on("disconnect", () => disconnect(Number(myId), socket));
// };
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
  // disconnectUser()

  // const myId = socket.handshake.query.userId
  //   ? socket.handshake.query.userId
  //   : 0;
  // connection(Number(myId), socket);
  // socket.on(
  //   "myMessage",
  //   ({ message, conversation, myUserId }: IMessageInput) => {
  //     myMessage(message, conversation, myUserId);
  //   }
  // );
  // socket.on(
  //   "updateMyMessage",
  //   ({ myUserId, text, conversationId, messageId }: IUpdateMessageInput) => {
  //     editMessage(myUserId, text, conversationId, messageId);
  //   }
  // );
  // socket.on(
  //   "deleteMyMessage",
  //   ({ conversationId, messageId }: IDeleteMessage) => {
  //     deleteMessage(conversationId, messageId);
  //   }
  // );
  // socket.on(
  //   "messageReaction",
  //   ({ reaction, messageId, conversationId, myUserId }: IMessageReaction) => {
  //     messageReaction(reaction, conversationId, messageId, myUserId);
  //   }
  // );
  // socket.on(
  //   "threadMessage",
  //   ({ text, messageId, myUserId, conversationId }: IThreadMessage) => {
  //     messageThread(text, messageId, myUserId, conversationId);
  //   }
  // );
  // socket.on(
  //   "conversationChange",
  //   ({ conversationId, myUserId }: IConversationChange) =>
  //     conversationChange(conversationId, myUserId, socket)
  // );
  // socket.on("disconnect", () => disconnect(Number(myId), socket));
};
