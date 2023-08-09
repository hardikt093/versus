import httpStatus from "http-status";
import { IChannelData } from "../interfaces/input";
import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { axiosGetMicro } from "../services/axios.service";
import { encryptedMessage } from "../services/crypto.service";
import { io } from "../server";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// function compareMessagesByDate(lastMessageA: any, lastMessageB: any) {
//   if (lastMessageA.length && lastMessageB.length) {
//     return (
//       new Date(lastMessageB[0].createdAt).valueOf() -
//       new Date(lastMessageA[0].createdAt).valueOf()
//     );
//   } else if (lastMessageA.length) {
//     return -1;
//   } else if (lastMessageB.length) {
//     return 1;
//   } else {
//     return 0;
//   }
// }
const emitChannels = async (id: string, userId: number) => {
  const getChannel = await getAllUsersChannel(userId, "");

  io.to(id).emit(`getUserChannels`, {
    getChannel,
  });
};
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
const addUserToPrivateChannel = async (channelId: string, userId: number[]) => {
  const findChannel: { id: number; channelType: string; channelName: string } =
    await prisma.channel.findUnique({
      where: { id: Number(channelId) },
    });
  if (findChannel) {
    const usersExists = await prisma.channelUser.findMany({
      where: {
        channelId: Number(channelId),
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

      const allMessage = await prisma.$transaction(
        data.map((message: any) =>
          prisma.message.create({
            data: message,
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
          })
        )
      );
      allMessage.map(async (item: any) => {
        io.to(item.channelId).emit(
          `privateChatMessage:${item.channelId}`,
          item
        );
        const getChannel = await getAllUsersChannel(item.userId, "");

        io.emit(`getUserChannels:${item.userId}`, {
          getChannel,
        });
      });
    }
    const getChannels = getChannelDetails(channelId, "");
    io.to(`${channelId}`).emit(`channelDetailsUpdate:${channelId}`, {
      getChannels,
    });
    return users;
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};

const getAllUsersChannel = async (userId: number, search: string) => {
  // const validChannelIds = await prisma.channelUser.findMany({
  //   where: {
  //     AND: [
  //       { userId: userId },
  //       { userExist: true }
  //     ]
  //   },
  //   select: {
  //     channelId: true
  //   }
  // });

  // const validChannelIdsList = validChannelIds.map((item: any) => item.channelId);
  // console.log("validChannelIdsList",validChannelIdsList)
  const query = {
    where: {
      // id: { in: validChannelIdsList.map((user : number) => user) },
      channelUser: {
        some: { userId: userId, userExist: true },
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
      // message: true,
      _count: {
        select: {
          channelUser: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  };
  const [channels, count] = await prisma.$transaction([
    prisma.channel.findMany(query),
    prisma.channel.count({ where: query.where }),
  ]);

  // channels.sort((channelA: IChannelData, channelB: IChannelData) => {
  //   const lastMessageA: any = channelA.message;
  //   const lastMessageB: any = channelB.message;
  //   return compareMessagesByDate(lastMessageA, lastMessageB);
  // });
  return {
    totalChannels: count,
    channels: channels,
  };
};
const removeUserFromChannel = async (channelId: string, userId: number[]) => {
  const findChannel = await prisma.channel.findUnique({
    where: { id: Number(channelId) },
  });

  if (findChannel) {
    // await prisma.channelUser.updateMany({
    //   where: {
    //     channelId: Number(channelId),
    //     userId: {
    //       in: userId,
    //     },
    //   },
    //   data: { userExist: false },
    // });
    const users1 = await prisma.channelUser.deleteMany({
      where: {
        channelId: channelId,
        userId: {
          in: userId,
        },
      },
    });

    const users = await prisma.channelUser.findMany({
      where: {
        channelId: Number(channelId),
        userId: {
          in: userId,
        },
      },
    });

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

    const allMessage = await prisma.$transaction(
      data.map((message: any) =>
        prisma.message.create({
          data: message,
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
        })
      )
    );

    await Promise.all(allMessage.map(async (item: any) => {
      io.to(item.channelId).emit(`privateChatMessage:${item.channelId}`, item);

      const getChannel = await getAllUsersChannel(item.userId, "");
      io.emit(`getUserChannels:${item.userId}`, {
        getChannel,
      });
      const getChannels = await getChannelDetails(channelId, "");
      io.to(`${channelId}`).emit(`channelDetailsUpdate:${channelId}`, {
        getChannels,
      });
    }));

    // const getChannels = await getChannelDetails(channelId, "");
    // io.to(`${channelId}`).emit(`channelDetailsUpdate:${channelId}`, {
    //   getChannels,
    // });

    return users;
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};


const updateChannelDetails = async (
  userId: number,
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

  if (!findChannel) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }

  if (channelData.channelName) {
    const findChannelByName: { id: number; channelName: string } =
      await prisma.channel.findUnique({
        where: { channelName: channelData.channelName },
      });
    if (findChannelByName && findChannelByName.id != findChannel.id) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        Messages.CHANNELNAME_ALREADY_EXIST
      );
    }
    channelData.channelName = channelData?.channelName?.toLowerCase();
  }

  const updatedChannel = await prisma.channel.update({
    where: {
      id: Number(channelId),
    },
    data: {
      ...channelData,
    },
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
  const getChannel = await getAllUsersChannel(userId, "");
  io.to(channelId).emit(`getUserChannels`, {
    getChannel,
  });
  io.to(channelId).emit(`channelDetailsUpdate:${channelId}`, {
    updatedChannel,
  });
  return updatedChannel;
};

const getConversation = async (channelId: string, page: string) => {
  const pages = parseInt(page) || 1;
  const limit = 10;
  const startIndex = (pages - 1) * limit;
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
      // take: limit,
      // skip: startIndex,
      where: { channelId: Number(channelId) },
      orderBy: {
        createdAt: "asc",
      },
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
          userExist: true,
          isAdmin: true,
        },
      },
    },
  });
  findChannel.channelUser = findChannel.channelUser.filter(
    (channelUser: any) => {
      return (
        channelUser.channelUser.userName.includes(search) &&
        channelUser.userExist
      );
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
  return await getConversation(updateChannelHeader.id, "1");
};

const getChannelUsers = async (
  channelId: string,
  search: string,
  page: string
) => {
  const pages = parseInt(page) || 1;
  const limit = 10;
  const startIndex = (pages - 1) * limit;
  const users = await prisma.channelUser.findMany({
    take: limit,
    skip: startIndex,
    where: {
      channelId: Number(channelId),
      channelType: "privateChannel",
      userExist: true,
      channelUser: {
        OR: [
          {
            userName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    },
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
  });
  return users;
};

const getUsersExceptchannelUsers = async (
  channelId: string,
  search: string,
  page: string
) => {
  const findChannel: any = await prisma.channel.findUnique({
    where: {
      id: Number(channelId),
    },
    select: {
      channelUser: {
        select: {
          channelUser: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  let ids: number[] = [];

  findChannel.channelUser.map((item: any) => {
    ids = [...ids, item.channelUser.id];
  });
  if (findChannel) {
    const pages = parseInt(page) || 1;
    const limit = 10;
    const startIndex = (pages - 1) * limit;

    const getUserList = await prisma.user.findMany({
      take: limit,
      skip: startIndex,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userName: true,
        profileImage: true,
        email: true,
      },
      where: {
        OR: [
          {
            userName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            firstName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
        id: {
          notIn: ids,
        },
      },
    });

    return getUserList;
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CHANNEL_NOT_FOUND
    );
  }
};
export default {
  emitChannels,
  createPrivateChannel,
  addUserToPrivateChannel,
  getAllUsersChannel,
  updateChannelDetails,
  removeUserFromChannel,
  getConversation,
  getChannelDetails,
  updateChannelHeader,
  getChannelUsers,
  getUsersExceptchannelUsers,
};
