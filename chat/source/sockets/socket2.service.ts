const { PrismaClient } = require("@prisma/client");
import { io } from "../server";
const prisma = new PrismaClient();
const users: any = [];
function userJoin(id: string, channelId: number, userId: number) {
  const user = { id, userId, channelId };
  const index = users.findIndex(
    (object: any) => object.userId === userId && object.channelId === channelId
  );
  if (index === -1) {
    users.push(user);
    return user;
  } else {
    const existingUser = users.filter(
      (item: any) => item.userId === userId && item.channelId === channelId
    );
    return existingUser[0];
  }
}
function getCurrentUser(channelId: number, id: any) {
  return users.find(
    (user: any) => user.channelId === channelId && id === user.id
  );
}
const connection = async () => {
  console.log("Connected to socket.io");
};
const joinChat = async (socket: any, channelId: number, userId: number) => {
  try {
    if (channelId && userId) {
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
      } else {
        // Handle the case when the channel doesn't exist
        socket.emit("message", "The specified channel does not exist");
      }
    }
  } catch (error) {
    console.log(error);
  }
};
const getConversation = async (socket: any, channelId: number) => {
  try {
    if (channelId) {
      // socket.join(channelId);
      // const user = getCurrentUser(channelId, socket.id);
      const channelDetails = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          channelUser: {
            include: {
              channelUser: {
                select: {
                  userName: true,
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });
      const messages = await prisma.message.findMany({
        where: { channelId },
        include: {
          user: {
            select: {
              userName: true,
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      });
      // if (user) {
      socket.emit(`conversation:${channelId}`, {
        channelDetails: channelDetails,
        messages: messages,
      });
      // }
    }
  } catch (error) {
    console.log(error);
  }
};
// const singleGameChat = async (socket: any, newMessageRecieved: any) => {
//   try {
//     const { message } = newMessageRecieved;

//     if (message.channelId) {
//       const user = getCurrentUser(message.channelId, socket.id);
//       console.log("user", user)
//       if (user) {
//         const newMessage = await prisma.message.create({
//           include: {
//             user: {
//               select: {
//                 userName: true,
//                 id: true,
//                 firstName: true,
//                 lastName: true,
//                 profileImage: true,
//               },
//             },
//           },
//           data: {
//             ...message,
//             userId: Number(user.userId),
//           },
//         });
//         console.log(newMessage);
//         io.to(user.channelId).emit(`message`, newMessage);
//       }
//     }
//   } catch (error) {
//     console.log(error);
//   }
// };

const singleGameChat = async (socket: any, newMessageRecieved: any) => {
  try {
    const { message } = newMessageRecieved;

    if (message.channelId && message.userId) {
      const newMessage = await prisma.message.create({
        include: {
          user: {
            select: {
              userName: true,
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
        data: {
          ...message,
          userId: Number(message.userId),
        },
      });
      io.to(message.channelId).emit(`message:${message.channelId}`, newMessage);
    }
  } catch (error) {
    console.log(error);
  }
};
const disconnectUser = (socket: any) => {
  const user = users.find((user: any) => user.id === socket.id);
  if (user) {
    users.splice(users.indexOf(user), 1);
    io.emit("message", `${user.userName} has left the chat`);
  }
};
export {
  connection,
  joinChat,
  getConversation,
  singleGameChat,
  disconnectUser,
};
