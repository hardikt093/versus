import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { ICreateContact, IUser } from "../interfaces/input";

const prisma = new PrismaClient();

const getContacts = async (data: IUser) => {
  const contacts = await prisma.contactTry.findMany({
    where: { userId: data.id },
    include: {
      contactUser: {
        select: { userName: true, id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return contacts;
};

const createContact = async (user: IUser, body: ICreateContact) => {
  const { email }: { email: string } = body;
  const relatedUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!relatedUser) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.EMAIL_NOT_FOUND
    );
  }
  if (relatedUser.id === user?.id) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, Messages.INVALID_USER);
  }
  const isContactExists = await prisma.contactTry.findFirst({
    where: {
      userId: user?.id,
      contactUser: {
        email: email,
      },
    },
  });

  if (isContactExists) {
    return;
  }

  const foundConversation = await prisma.conversation.findFirst({
    where: { participants: { hasEvery: [user?.id, relatedUser.id] } },
  });

  if (foundConversation) {
    const contact = await newContact({
      userId: user?.id,
      conversationId: foundConversation.id,
      contactUserId: relatedUser.id,
    });

    return contact;
  }
  const conversation = await newConversation([user?.id, relatedUser.id]);
  const contact = await newContact({
    userId: user?.id,
    conversationId: conversation.id,
    contactUserId: relatedUser.id,
  });

  return contact;
};

const newContact = async ({
  userId,
  conversationId,
  contactUserId,
}: {
  userId: number;
  conversationId: number;
  contactUserId: number;
}) => {
  return await prisma.contactTry.create({
    data: {
      userId,
      conversationId,
      contactUserId,
    },
  });
};

const newConversation = async (idArray: number[]) => {
  return await prisma.conversation.create({
    data: {
      participants: idArray,
    },
  });
};

export default { getContacts, createContact };
