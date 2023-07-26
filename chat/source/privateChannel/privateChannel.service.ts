import httpStatus from "http-status";
import { IChannelData } from "../interfaces/input";
import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { axiosGetMicro } from "../services/axios.service";

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
          userId,
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
          messageType: "USERADDED",
          channelId: createChannel.id,
          userId: userId,
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

    userId.map((item: number) => {
      const obj: Partial<IChannelData> = {
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
      let data: any = {};
      switch (users.count) {
        case 1:
          data = {
            text: `added to ${findChannel.channelName}.`,
            createdAt: new Date(),
            messageType: "USERADDED",
            channelId: findChannel.id,
            userId: userId[0],
          };

          break;
        case 2:
          const user2 = await prisma.user.findUnique({
            where: { id: userId[1] },
          });
          data = {
            text: `added to ${findChannel.channelName}. Also ${user2.userName}  joined.`,
            createdAt: new Date(),
            messageType: "USERADDED",
            channelId: findChannel.id,
            userId: userId[0],
          };
          break;
        default:
          const getAllusers = await prisma.user.findMany({
            where: { id: { in: userId } },
          });
          const remainingUsers = getAllusers
            .slice(1, getAllusers.length - 1)
            .map((user: any) => `${user.userName}`)
            .join(", ");

          const lastUser = getAllusers[getAllusers.length - 1].userName;
          data = {
            text: `added to ${findChannel.channelName}. Also, ${remainingUsers} and ${lastUser} joined.`,
            createdAt: new Date(),
            messageType: "USERADDED",
            channelId: findChannel.id,
            userId: userId[0],
          };
          break;
      }

      await prisma.message.create({
        data,
      });
    }
    return users;
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
const removeUserFromChannel = async (channelId: number, userId: number[]) => {
  const findChannel: { id: number; channelType: string; channelName: string } =
    await prisma.channel.findUnique({
      where: { id: channelId },
    });
  if (findChannel) {
    const users = prisma.channelUser.deleteMany({
      where: {
        channelId: channelId,
        userId: {
          in: userId,
        },
      },
    });
    if (users) {
      let data: any = [];
      userId.map((item: number) => {
        const obj: any = {
          text: `removed from the ${findChannel.channelName}`,
          createdAt: new Date(),
          messageType: "TEXT",
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
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const updateChannelDetails = async (
  loggedInUser: number,
  data: {
    channelId: number;
    channelData: IChannelData;
  }
) => {
  const { channelId, channelData } = data;

  const findChannel: { id: number; channelType: string; channelName: string } =
    await prisma.channel.findUnique({
      where: { id: channelId },
    });
  if (findChannel) {
    if (channelData) {
      if (channelData?.channelName)
        channelData.channelName = channelData?.channelName?.toLowerCase();
      const updateChannel = await prisma.channel.update({
        where: {
          id: channelId,
        },
        data: {
          ...channelData,
        },
        select: {
          channelType: true,
          channelName: true,
          id: true,
        },
      });
    }
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const getConversation = async (channelId: number) => {
  const findChannel: any = await prisma.channel.findUnique({
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
  if (findChannel) {
    var matchData = {}
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
    if(findChannel.channelHeader != null){
      if(findChannel.channelHeader.leagueType == "MLB"){
      console.log(findChannel?.channelHeader?.goalServeMatchId)
        const resp = await axiosGetMicro(
          `${process.env.LEAGUE_SERVER}/league/mlb/getSingleMlbGame`,
          {
            goalServeMatchId:findChannel?.channelHeader?.goalServeMatchId
          },
          ""
        );
        matchData = resp?.data?.data
      }else if(findChannel.channelHeader.leagueType == "NHL"){

      }else if(findChannel.channelHeader.leagueType == "NBA"){
      }
    }
    return {
      channelDetails: findChannel,
      adminUser: findChannel.channelUser.filter(
        (item: any) => item.isAdmin == true
      ),
      messages: messages,
      channelHeader:matchData
    };
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const updateChannelHeader = async (data: any) => {
  const updateChannelHeader = await prisma.channel.update({
    where: {
      id: data.id,
    },
    data: {
      channelHeader: data.channelHeader,
    },
  });
  return await getConversation(updateChannelHeader.id)
};
export default {
  createPrivateChannel,
  addUserToPrivateChannel,
  getAllUsersChannel,
  updateChannelDetails,
  removeUserFromChannel,
  getConversation,
  updateChannelHeader,
};
