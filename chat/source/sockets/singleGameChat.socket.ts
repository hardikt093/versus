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
const connection = async () => {
  console.log("Connected to socket.io");
};
const joinChat = async (socket: any, channelId: number, userId: number) => {
  try {
    if (channelId && userId) {
      const findChannel = await prisma.channel.findUnique({
        where: { id: channelId },
      });
      socket.leaveAll();
      if (findChannel) {
        const user = userJoin(socket.id, channelId, userId);
        socket.join(user.channelId);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

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
export { connection, joinChat, singleGameChat, disconnectUser };
