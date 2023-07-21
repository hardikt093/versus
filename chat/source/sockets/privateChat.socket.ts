const { PrismaClient } = require("@prisma/client");
import { io } from "../server";
import { IChannelData } from "../interfaces/input";

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
      io.to(message.channelId).emit(`message:${message.channelId}`, newMessage);
    }
  } catch (error) {
    console.log(error);
  }
};

export {
  joinChat,
  createPrivateChannel,
  addUserToPrivateChannel,
  privateGroupChat,
};
