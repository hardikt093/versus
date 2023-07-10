const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import { log } from "console";
import { IUpdateUserProfile, IUserLogin } from "../interfaces/input";
import { axiosGetMicro } from "../services/axios.service";
import config from "../config/config";

/**
 *
 * @param data
 */
const userProfileUpdate = async (data: IUpdateUserProfile, id: any) => {
  return await prisma.user.update({
    where: {
      id: id.id,
    },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      profileImage: data.profileImage,
      birthDate: data.birthDate,
    },
    select: {
      firstName: true,
      lastName: true,
      userName: true,
      phone: true,
      profileImage: true,
      id: true,
    },
  });
};

const getAllContact = async () => {
  const getContact = await prisma.contact.findMany({
    where: {
      userId: 100,
    },
    include: {
      sendInvite: true,
    },
  });
  const getContactRes = await getContact.map(async (item: any) => {
    const getInvite = await item.sendInvite.map(async (item: any) => {});
  });
  // return getContact;
};

const searchUser = async (query: any, user: any) => {
  if (query.search) {
    const { search } = query;
    return await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { userName: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          },
          {
            id: {
              not: user.id,
            },
          },
        ],
      },
      select: {
        id: true,
        userName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }
};

const userByIdMongoRelation = async (id: number) => {
  return await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      userName: true,
      profileImage: true,
    },
  });
};

const userContacts = async (id: number) => {
  return await prisma.contact.findMany({
    where: {
      userId: id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phoneNumber: true,
      userId: true,
    },
  });
};

const userlist = async (id: number, search: string) => {
  if (search) {
    return await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { userName: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          },
          {
            id: {
              not: id,
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userName: true,
        profileImage: true,
      },
    });
  } else {
    return await prisma.user.findMany({
      where: {
        id: {
          not: id,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userName: true,
        profileImage: true,
      },
    });
  }
};
const userGetBulk = async (userIds: Array<number>) => {
  return await prisma.user.findMany({
    where: {
      isDeleted : false,
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      userName: true,
      profileImage: true,
    },
  });
};

const getFriendList = async (
  userId: number | string,
  search: string,
  page: string
) => {
  const pages = parseInt(page) || 1;
  const limit = 10;
  const startIndex = (pages - 1) * limit;
  const getFriendList = await prisma.user.findMany({
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
      id: {
        not: userId,
      },
      OR: [
        {
          email: {
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
  });
  const resp = await axiosGetMicro(
    `${config.leagueServer}/bet/getBetUser/${userId}`,
    {},
    ""
  );
  const getMaxBetOpponent = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userName: true,
      profileImage: true,
      email: true,
    },
    where: {
      id: {
        in: resp.data.data,
      },
      OR: [
        {
          email: {
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
  });
  // const getFriendList = await prisma.user.findUnique({
  //   where: {
  //     id: userId
  //   },
  //   select: {
  //     id: true,
  //     contact: {
  //       where: {
  //         invite: "ACCEPTED",
  //         OR: [
  //           {
  //             email: {
  //               contains: search,
  //               mode: 'insensitive'
  //             },
  //           },
  //           {
  //             name: {
  //               contains: search,
  //               mode: 'insensitive'
  //             }
  //           },
  //         ],
  //       },
  //       select: {
  //         id: true,
  //         name: true,
  //         email: true,
  //         contactUser: {
  //           select: {
  //             id: true,
  //             firstName: true,
  //             lastName: true,
  //             userName: true,
  //             profileImage: true,
  //             email: true
  //           }
  //         }
  //       }
  //     },

  //   },

  // })
  const sortedArray = resp.data.data.map((id: number) =>
    getMaxBetOpponent.find((obj: any) => obj.id === id)
  ).filter((item:any)=>item!==undefined);
  return { getFriendList,getMaxBetOpponent:sortedArray };
};
export default {
  userContacts,
  userProfileUpdate,
  getAllContact,
  searchUser,
  userByIdMongoRelation,
  userlist,
  userGetBulk,
  getFriendList,
};
