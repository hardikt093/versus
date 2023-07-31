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

const joinChat = async (socket: any, channelId: number, userId: number) => {
  try {
    if (channelId && userId) {
      const user = userJoin(socket.id, channelId, userId);
      const findChannel = await prisma.channel.findUnique({
        where: { id: channelId },
      });
      socket.leaveAll();
      if (findChannel) {
        socket.join(user.channelId);
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
      const channelsWithLastMessage = await prisma.channel.findMany({
        where: {
          channelType: "privateChannel",
          channelUser: {
            some: { userId: Number(message.userId) },
          },
        },
        select: {
          id: true,
          channelName: true,
          message: {
            select: {
              id: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1, // To get only the last message for each channel
          },
        },
      });
      function compareMessagesByDate(a: any, b: any) {
        if (a.length && b.length) {
          return (
            new Date(b[0].createdAt).valueOf() -
            new Date(a[0].createdAt).valueOf()
          );
        } else if (a.length) {
          return -1;
        } else if (b.length) {
          return 1;
        } else {
          return 0;
        }
      }
      channelsWithLastMessage.sort((channelA: any, channelB: any) => {
        const lastMessageA: any = channelA.message;
        const lastMessageB: any = channelB.message;

        return compareMessagesByDate(lastMessageA, lastMessageB);
      });
      io.to(message.channelId).emit(`getUserChannels`, {
        channelsWithLastMessage,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

export { joinChat, privateGroupChat };
