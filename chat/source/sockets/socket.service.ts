const { PrismaClient } = require("@prisma/client");

import { io } from "../server";
const prisma = new PrismaClient();
// const onlineUsers = new Set();
const users: any = [];
// old code

// const connection = async (userId: any, socket: any) => {
//   if (userId > 0) {
//     onlineUsers.set(+userId, { socketRef: socket.id });
//     await prisma.contactTry.updateMany({
//       where: {
//         userId,
//       },
//       data: {
//         status: "online",
//       },
//     });
//     io.emit("onlineUsers", Array.from(onlineUsers));
//   } else {
//     return;
//   }
// };

// const disconnect = async (userId: HandshakeUserId, socket: any) => {
//   if (userId) {
//     onlineUsers.delete(+userId);
//     await prisma.contactTry.updateMany({
//       where: {
//         userId,
//       },
//       data: {
//         status: "offline",
//       },
//     });
//     socket.disconnect();
//     io.emit("onlineUsers", Array.from(onlineUsers));
//   }
// };

// const myMessage = async (
//   message: IMessage,
//   conversation: IConversation,
//   myUserId: number
// ) => {
//   const myUser = await prisma.user.findUnique({ where: { id: myUserId } });
//   const newMessage = await prisma.message.create({
//     include: {
//       from: { select: { userName: true, id: true } },
//       to: { select: { userName: true, id: true } },
//       reaction: {
//         select: {
//           reaction: true,
//           from: { select: { userName: true, id: true } },
//         },
//       },
//       threads: {
//         select: {
//           text: true,
//           from: { select: { userName: true, id: true } },
//           filePath: true,
//         },
//       },
//     },
//     data: { ...message },
//   });
//   const filteredMyUserId = conversation.participants.filter(
//     (id) => id !== myUserId
//   );
//   const otherUserId = filteredMyUserId[0];

//   const relatedUser = await prisma.user.findUnique({
//     where: { id: otherUserId },
//   });
//   const isRelatedUserOnline = onlineUsers.has(relatedUser?.id);
//   const isContactExists = await prisma.contactTry.findFirst({
//     where: { userId: otherUserId, contactUserId: myUser?.id },
//   });

//   if (!isContactExists) {
//     if (!relatedUser || !myUser) {
//       return;
//     }

//     const newContact = await prisma.contactTry.create({
//       data: {
//         contactUserId: myUserId,
//         conversationId: conversation.id,
//         userId: relatedUser.id,
//         unreadMessages: 1,
//       },
//     });

//     if (isRelatedUserOnline) {
//       io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
//         "newContact",
//         newContact
//       );
//     }
//   }
//   if (isContactExists) {
//     const prevUnreadMessages = isContactExists.unreadMessages;
//     const contactId = isContactExists.id;
//     let updatedUnreadMessagesCount = prevUnreadMessages;
//     const onlineUser = onlineUsers.get(otherUserId);
//     if (
//       onlineUser?.conversationId !== message.conversationId &&
//       !!onlineUser?.conversationId
//     ) {
//       updatedUnreadMessagesCount = prevUnreadMessages + 1;
//     }

//     const updatedContact = await prisma.contactTry.update({
//       include: {
//         contactUser: {
//           select: { userName: true, id: true },
//         },
//       },

//       where: { id: contactId },
//       data: {
//         unreadMessages: updatedUnreadMessagesCount,
//       },
//     });

//     if (isRelatedUserOnline) {
//       io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
//         "newMessage",
//         newMessage
//       );
//       io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
//         "updateContactValues",
//         updatedContact
//       );
//     }
//   }
//   // this flow is going to run at the end of the message event dosent matter on any condition
//   // send message to myself
//   io.to(onlineUsers.get(myUserId)?.socketRef).emit("selfMessage", newMessage);
// };

// const editMessage = async (
//   myUserId: number,
//   text: string,
//   conversationId: number,
//   messageId: number
// ) => {
//   const conversation = await prisma.conversation.findUnique({
//     where: {
//       id: conversationId,
//     },
//   });

//   if (!conversation) {
//     return;
//   }

//   const updateMessage = await prisma.message.updateMany({
//     where: {
//       AND: [{ id: messageId }, { fromId: myUserId }],
//     },
//     data: {
//       text,
//     },
//   });

//   io.emit("newMessage", updateMessage);
//   return updateMessage;
// };

// const deleteMessage = async (conversationId: number, messageId: number) => {
//   const conversation = await prisma.conversation.findUnique({
//     where: {
//       id: conversationId,
//     },
//   });

//   if (!conversation) {
//     return;
//   }

//   const deleteMessage = await prisma.message.delete({
//     where: {
//       id: messageId,
//     },
//   });
//   io.emit("newMessage", deleteMessage);
//   return deleteMessage;
// };

// const messageReaction = async (
//   reaction: string,
//   conversationId: number,
//   messageId: number,
//   myUserId: number
// ) => {
//   const conversation = await prisma.conversation.findUnique({
//     where: {
//       id: conversationId,
//     },
//   });

//   if (!conversation) {
//     return;
//   }

//   const newReaction = await prisma.messageReaction.create({
//     data: { messageId, reaction, fromId: myUserId },
//     include: {
//       from: { select: { userName: true, id: true } },
//     },
//   });
//   io.emit("newMessage", newReaction);
//   return newReaction;
// };

// const messageThread = async (
//   text: string,
//   messageId: number,
//   myUserId: number,
//   conversationId: number
// ) => {
//   const conversation = await prisma.conversation.findUnique({
//     where: {
//       id: conversationId,
//     },
//   });

//   if (!conversation) {
//     return;
//   }

//   const newThread = await prisma.threads.create({
//     data: { messageId, text, fromId: myUserId },
//     include: {
//       from: { select: { userName: true, id: true } },
//     },
//   });
//   io.emit("newMessage", newThread);
//   return newThread;
// };
// const conversationChange = async (
//   conversationId: number,
//   myUserId: number,
//   socket: any
// ) => {
//   try {
//     onlineUsers.set(myUserId, {
//       socketRef: socket.id,
//       conversationId: conversationId || null,
//     });
//     const contact = await prisma.contactTry.findFirst({
//       where: { userId: myUserId, conversationId },
//     });
//     if (!contact) {
//       return;
//     }
//     const updatedContact = await prisma.contactTry.update({
//       include: {
//         contactUser: {
//           select: { userName: true, id: true },
//         },
//       },
//       where: { id: contact.id },
//       data: {
//         unreadMessages: 0,
//       },
//     });
//     io.emit("updateMyContact", updatedContact);
//   } catch (error) {
//     console.log(error);
//   }
// };
function userJoin(id: string, channelId: number, userId: number) {
  const user = { id, userId, channelId };
  users.push(user);
  return user;
}

// Get current user
function getCurrentUser(id: number) {
  return users.find((user: any) => user.id === id);
}
const connection = async () => {
  console.log("Connected to socket.io");
};
const joinChat = async (socket: any, channelId: number, userId: number) => {
  try {
    const user = userJoin(socket.id, channelId, userId);
    const findChannel = await prisma.channel.findUnique({
      where: { id: channelId },
    });
    socket.join(user.channelId);
    if (findChannel) {
      const checkUserExist = await prisma.channelUser.findFirst({
        where: {
          channelId: channelId,
          userId: Number(userId),
          channelType: findChannel.channelType,
        },
      });
      if (!checkUserExist) {
        const joinUser = await prisma.channelUser.create({
          data: {
            channelId,
            userId: Number(userId),
            channelType: findChannel.channelType,
          },
          include: {
            channelUser: {
              select: { userName: true },
            },
          },
        });
        socket.emit("message", `Welcome to ${findChannel.matchChannelName}!`);
        socket.broadcast
          .to(user.channelId)
          .emit(
            "message",
            `${joinUser.channelUser.userName} has joined the group`
          );
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const getConversation = async (socket: any, channelId: number) => {
  try {
    const user = getCurrentUser(socket.id);
    const channelDetails = await prisma.channel.findUnique({
      where: {
        id: channelId,
      },
      include: {
        channelUser: {
          include: {
            channelUser: { select: { userName: true, id: true, firstName:true, lastName:true , profileImage:true} },
          },
        },
      },
    });
    const getMessage = await prisma.message.findMany({
      where: { channelId },
      include: {
        user: { select: { userName: true, id: true, firstName:true, lastName:true , profileImage:true}  },
      },
    });
    if (user)
      socket.to(user.channelId).emit("conversation", {
        channelDetails: channelDetails,
        messages: getMessage,
      });
  } catch (error) {
    console.log(error);
  }
};

const singleGameChat = async (socket: any, newMessageRecieved: any) => {
  try {
    const user = getCurrentUser(socket.id);
    const { message } = newMessageRecieved;
    if (user) {
      const newMessage = await prisma.message.create({
        include: {
          user: { select: { userName: true, id: true, firstName:true, lastName:true , profileImage:true}  },
        },
        data: {
          ...message,
          channelId: user.channelId,
          userId: Number(user.userId),
        },
      });
      io.to(user.channelId).emit(`message:${user.channelId}`, newMessage);
    }
  } catch (error) {
    console.log(error);
  }
};

const disconnectUser = () => {
  io.emit("message", "A user has left the chat");
};
const groupMessageThread = async (socket: any, newThreadMessage: any) => {
  const user = getCurrentUser(socket.id);
  const { message } = newThreadMessage;
  const findMessage = await prisma.message.findUnique({
    where: {
      id: message.messageId,
    },
  });
  if (!findMessage) {
    return;
  } else {
    const newThread = await prisma.threads.create({
      data: message,
      include: {
        from: { select: { userName: true, id: true } },
      },
    });
    io.to(user.room).emit("message", newThread);
  }
};
// const messageReaction = async (
//   reaction: string,
//   conversationId: number,
//   messageId: number,
//   myUserId: number
// ) => {
//   const conversation = await prisma.conversation.findUnique({
//     where: {
//       id: conversationId,
//     },
//   });

//   if (!conversation) {
//     return;
//   }

//   const newReaction = await prisma.messageReaction.create({
//     data: { messageId, reaction, fromId: myUserId },
//     include: {
//       from: { select: { userName: true, id: true } },
//     },
//   });
//   io.emit("newMessage", newReaction);
//   return newReaction;
// };
export {
  // conversationChange,
  // messageThread,
  // messageReaction,
  // connection,
  // myMessage,
  // editMessage,
  // deleteMessage,
  // disconnect,

  // new
  joinChat,
  singleGameChat,
  disconnectUser,
  groupMessageThread,
  connection,
  getConversation,
  // conversationChange,
  // messageThread,
  // messageReaction,
  // connection,
  // myMessage,
  // editMessage,
  // deleteMessage,
  // disconnect,
};
