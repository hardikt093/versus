import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { IUser } from "../interfaces/input";
const prisma = new PrismaClient();

const getMatchPublicChannelConversation = async (data: any) => {
  const conversation = await prisma.channel.findFirst({
    where: {
      isDeleted: false, 
      goalServeMatchId: data.goalServeMatchId,
      goalServeLeagueId: data.goalServeLeagueId,
    },
  });
  return conversation;
};
export default {
  getMatchPublicChannelConversation
};
