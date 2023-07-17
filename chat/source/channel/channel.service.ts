import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { IUser } from "../interfaces/input";
const prisma = new PrismaClient();

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
  getMatchPublicChannelConversation
};
