const { PrismaClient } = require("@prisma/client");

import { IChannelData } from "../interfaces/input";

const prisma = new PrismaClient();

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
export { createPrivateChannel, addUserToPrivateChannel };
