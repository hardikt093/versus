const { PrismaClient } = require("@prisma/client");
import { io } from "../server";
const prisma = new PrismaClient();
const users: any = [];
function userJoin(id: string, channelId: number, userId: number) {
  const user = { id, userId, channelId };
  console.log(user);
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

const joinChat = async (socket: any, channelId: number, userId: number) => {
  try {
    if (channelId && userId) {
      const user = userJoin(socket.id, channelId, userId);
      const findChannel = await prisma.channel.findUnique({
        where: { id: channelId },
      });
      socket.leaveAll();
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

const privateGroupChat = async (newMessageRecieved: any) => {
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
      io.to(message.channelId).emit(
        `privateChatMessage:${message.channelId}`,
        newMessage
      );
    }
  } catch (error) {
    console.log(error);
  }
};

export { joinChat, privateGroupChat };
