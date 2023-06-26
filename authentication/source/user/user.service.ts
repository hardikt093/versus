const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import { log } from "console";
import { IUpdateUserProfile, IUserLogin } from "../interfaces/input";

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
    where : {
      id : id
    },
    select : {
      id : true,
      email : true,
      firstName : true,
      lastName : true,
      userName : true,
      profileImage : true
    }
  });
}

const userContacts = async (id: number) => {
  return await prisma.contact.findMany({
    where : {
      userId : id
    },
    select : {
      id : true,
      email : true,
      name : true,
      phoneNumber : true,
      userId : true,
    }
  });
}

const userlist = async (id: number, search : string) => {
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
        id : true,
        email : true,
        firstName : true,
        lastName : true,
        userName : true,
        profileImage : true
      },
    });
  } else {
    return await prisma.user.findMany({
      where : {
        id : {
          not : id
        }
      },
      select : {
        id : true,
        email : true,
        firstName : true,
        lastName : true,
        userName : true,
        profileImage : true
      }
    });
  }
}
const userGetBulk = async (userIds: Array<number>) => {
    return await prisma.user.findMany({
      where : {
        id : {
          in : userIds
        }
      },
      select : {
        id : true,
        email : true,
        firstName : true,
        lastName : true,
        userName : true,
        profileImage : true
      }
    });
}
export default { userContacts, userProfileUpdate, getAllContact, searchUser, userByIdMongoRelation, userlist, userGetBulk };
