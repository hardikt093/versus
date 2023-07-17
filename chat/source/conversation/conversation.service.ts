import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { IUser } from "../interfaces/input";
const prisma = new PrismaClient();

const getConversation = async (data: IUser, param: string) => {
  const conversationId = Number(param);
  if (typeof conversationId !== "number") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.INVALID_CONVERSATION_ID
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          from: { select: { userName: true, id: true } },
          to: { select: { userName: true, id: true } },
          reaction: {
            select: {
              reaction: true,
              from: { select: { userName: true, id: true } },
            },
          },
          threads: {
            select: {
              text: true,
              from: { select: { userName: true, id: true } },
              filePath: true,
            },
          },
        },
      },
    },
  });
  if (!conversation) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CONVERSATION_NOT_FOUND
    );
  }

  if (!isMyConversation(data?.id, conversation)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ACCESS_DENIED_CONVERSATION
    );
  }

  return conversation;
};

const isMyConversation = async (id: number, conversation: any) => {
  return conversation.participants.includes(id);
};

const getMatchPublicChannelConversation = async (data: any) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      isDeleted: false, 
      goalServeMatchId: data.goalServeMatchId,
      goalServeLeagueId: data.goalServeLeagueId,
    },
  });
  if (!conversation) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.CONVERSATION_NOT_FOUND
    );
  }
  return conversation;
};
export default {
  getConversation,
  isMyConversation,
  getMatchPublicChannelConversation
};
