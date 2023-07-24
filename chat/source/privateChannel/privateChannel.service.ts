import httpStatus from "http-status";
import { IChannelData } from "../interfaces/input";
import AppError from "../utils/AppError";
import Messages from "../utils/messages";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const createPrivateChannel = async (
  userId: number,
  channelData: IChannelData
) => {
  const { channelName, channelType } = channelData;
  const createChannel = await prisma.channel.create({
    data: {
      channelName: channelName?.toLowerCase(),
      channelType,
    },
    select: {
      channelType: true,
      channelName: true,
      id: true,
    },
  });
  if (createChannel) {
    const checkUserExist = await prisma.channelUser.findFirst({
      where: {
        channelId: createChannel.id,
        userId,
        channelType,
      },
    });
    if (!checkUserExist) {
      await prisma.channelUser.create({
        data: {
          channelId: createChannel.id,
          userId: channelData.userId,
          channelType,
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
          channelId: createChannel.id,
          userId: channelData.userId,
        },
      });
    }
  }
  return createChannel;
};
const addUserToPrivateChannel = async (channelId: number, userId: number[]) => {
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
      return users;
    }
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const getAllUsersChannel = async (userId: number, search: string) => {
  const getChannels = await prisma.channel.findMany({
    where: {
      channelUser: {
        some: { userId: userId, isCreatedChannel: true },
      },

      OR: [
        {
          channelName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
  });
  return getChannels;
};
export default {
  createPrivateChannel,
  addUserToPrivateChannel,
  getAllUsersChannel,
};
