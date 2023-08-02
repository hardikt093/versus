import httpStatus from "http-status";
import { IChannelData } from "../interfaces/input";
import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { axiosGetMicro } from "../services/axios.service";
import { encryptedMessage } from "../services/crypto.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function compareMessagesByDate(lastMessageA: any, lastMessageB: any) {
  if (lastMessageA.length && lastMessageB.length) {
    return (
      new Date(lastMessageB[0].createdAt).valueOf() - new Date(lastMessageA[0].createdAt).valueOf()
    );
  } else if (lastMessageA.length) {
    return -1;
  } else if (lastMessageB.length) {
    return 1;
  } else {
    return 0;
  }
}
const createPrivateChannel = async (
  userId: number,
  channelData: IChannelData
) => {
  const { channelName, channelType } = channelData;
  const findChannel: { id: number; channelName: string } =
    await prisma.channel.findUnique({
      where: { channelName },
    });
  if (findChannel) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNELNAME_ALREADY_EXIST
    );
  }
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
          text: encryptedMessage(`Joined ${createChannel.channelName}`),
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
    const usersExists = await prisma.channelUser.findMany({
      where: {
        channelId,
        userId: {
          in: userId,
        },
      },
    });
    if (usersExists.length) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        Messages.USER_ALREADY_EXIST
      );
    }
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
      let data: any = [];
      userId.map((item: number) => {
        const obj: any = {
          text: encryptedMessage(`added to ${findChannel.channelName}`),
          createdAt: new Date(),
          messageType: "USERADDED",
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

const getAllUsersChannel = async (userId: number, search: string) => {
  const query = {
    where: {
      channelUser: {
        some: { userId: userId },
      },
      OR: [
        {
          channelName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      channelType: true,
      channelName: true,
      description: true,
      message: true,
      _count: {
        select: {
          channelUser: true,
        },
      },
    },
  };
  const [channels, count] = await prisma.$transaction([
    prisma.channel.findMany(query),
    prisma.channel.count({ where: query.where }),
  ]);

  channels.sort((channelA: IChannelData, channelB: IChannelData) => {
    const lastMessageA: any = channelA.message;
    const lastMessageB: any = channelB.message;
    return compareMessagesByDate(lastMessageA, lastMessageB);
  });
  return {
    totalChannels: count,
    channels: channels.map((item: any) => {
      delete item.message;
      return item;
    }),
  };
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
          text: encryptedMessage(`removed from the ${findChannel.channelName}`),
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
  channelId: string,
  data: {
    channelData: IChannelData;
  }
) => {
  const { channelData } = data;

  const findChannel: { id: number; channelType: string; channelName: string } =
    await prisma.channel.findUnique({
      where: { id: Number(channelId) },
    });
  const findChannelByName: { id: number; channelName: string } =
    await prisma.channel.findUnique({
      where: { channelName: channelData.channelName },
    });
  if (!findChannel) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
  if (findChannelByName && findChannelByName.id != findChannel.id) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNELNAME_ALREADY_EXIST
    );
  }

  if (channelData?.channelName)
    channelData.channelName = channelData?.channelName?.toLowerCase();
  await prisma.channel.update({
    where: {
      id: Number(channelId),
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
};

const getConversation = async (channelId: string) => {
  const findChannel: any = await prisma.channel.findUnique({
    where: { id: Number(channelId) },
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
    var matchData = {};
    const messages = await prisma.message.findMany({
      where: { channelId: Number(channelId) },
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
    if (findChannel.channelHeader != null) {
      if (findChannel.channelHeader.leagueType == "MLB") {
        console.log(findChannel?.channelHeader?.goalServeMatchId);
        const resp = await axiosGetMicro(
          `${process.env.LEAGUE_SERVER}/league/mlb/getSingleMlbGame`,
          {
            goalServeMatchId: findChannel?.channelHeader?.goalServeMatchId,
          },
          ""
        );
        matchData = resp?.data?.data;
      } else if (findChannel.channelHeader.leagueType == "NHL") {
      } else if (findChannel.channelHeader.leagueType == "NBA") {
      }
    }
    return {
      channelDetails: findChannel,
      adminUser: findChannel.channelUser.filter(
        (item: any) => item.isAdmin == true
      ),
      messages: messages,
      channelHeader: matchData,
    };
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const getChannelDetails = async (channelId: string, search: string) => {
  const findChannel: any = await prisma.channel.findUnique({
    where: { id: Number(channelId) },
    select: {
      id: true,
      channelName: true,
      description: true,
      channelType: true,
      channelUser: {
        select: {
          channelUser: {
            select: {
              userName: true,
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          isAdmin: true,
        },
      },
    },
  });
  findChannel.channelUser = findChannel.channelUser.filter(
    (channelUser: any) => {
      return channelUser.channelUser.userName.includes(search);
    }
  );
  return findChannel;
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
  return await getConversation(updateChannelHeader.id);
};
export default {
  createPrivateChannel,
  addUserToPrivateChannel,
  getAllUsersChannel,
  updateChannelDetails,
  removeUserFromChannel,
  getConversation,
  getChannelDetails,
  updateChannelHeader,
};