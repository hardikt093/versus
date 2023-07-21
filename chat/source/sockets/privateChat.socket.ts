const { PrismaClient } = require("@prisma/client");

import { IChannelData, IMessage } from "../interfaces/input";
import { io } from "../server";

const prisma = new PrismaClient();
const users: any = [];

function userJoin(id: string, channelId: number, userId: number) {
  const user = { id, userId, channelId };
  users.push(user);
  return user;
}

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
    const getMessage = await prisma.message.findMany({
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
    if (user)
      io.to(user.channelId).emit("conversation", {
        channelDetails: channelDetails,
        messages: getMessage,
      });
  } catch (error) {
    console.log(error);
  }
};

const singleGameChat = async (socket: any, newMessageRecieved: IMessage) => {
  try {
    const user = getCurrentUser(socket.id);
    const { message } = newMessageRecieved;
    if (user) {
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
          channelId: user.channelId,
          userId: Number(user.userId),
        },
      });
      io.to(user.channelId).emit("message", newMessage);
    }
  } catch (error) {
    console.log(error);
  }
};

const disconnectUser = () => {
  io.emit("message", "A user has left the chat");
};

const createPrivateChannel = async (
  socket: any,
  channelData: IChannelData,
  userId: number
) => {
  const createChannel = await prisma.channel.create({
    data: {
      ...channelData,
    },
  });
  if (createChannel) {
    const checkUserExist = await prisma.channelUser.findFirst({
      where: {
        channelId: createChannel.channelId,
        userId: Number(userId),
        channelType: createChannel.channelType,
      },
    });
    if (!checkUserExist) {
      const user = userJoin(socket.id, createChannel.id, userId);
      socket.join(user.channelId);
      await prisma.channelUser.create({
        data: {
          channelId: createChannel.id,
          userId: Number(user.userId),
          channelType: createChannel.channelType,
          isAdmin: true,
          isCreatedChannel: true,
        },
      });
      await prisma.message.create({
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
          text: `Joined ${createChannel.channelName}`,
          createdAt: new Date(),
          messageType: "Text",
          channelId: user.channelId,
          userId: Number(user.userId),
        },
      });

      getConversation(socket, createChannel.id);
    }
  }
};

const addUserToPrivateChannel = async (
  socket: any,
  channelId: number,
  userId: number[]
) => {
  const findChannel: { id: number; channelType: string; channelName: string } =
    await prisma.channel.findUnique({
      where: { id: channelId },
    });
  if (findChannel) {
    let data: IChannelData[] = [];
    const checkUserExist = await prisma.channelUser.findFirst({
      where: {
        channelId: findChannel.id,
        userId: Number(userId),
        channelType: findChannel.channelType,
      },
    });
    if (!checkUserExist) {
      userId.map((item: number) => {
        const obj: IChannelData = {
          userId: item,
          channelId: findChannel.id,
          channelType: findChannel.channelType,
        };
        data.push(obj);
      });
      const users = await prisma.channelUser.createMany({
        data,
      });
      if (users) {
        let data: any = [];
        userId.map((item: number) => {
          const obj: any = {
            text: `added to ${findChannel.channelName}`,
            createdAt: new Date(),
            messageType: "Text",
            channelId: findChannel.id,
            userId: Number(item),
          };
          data.push(obj);
        });
        await prisma.message.createMany({
          data,
        });
      }
      getConversation(socket, channelId);
    }
  }
};
export {
  joinChat,
  singleGameChat,
  disconnectUser,
  connection,
  getConversation,
  createPrivateChannel,
  addUserToPrivateChannel,
};
