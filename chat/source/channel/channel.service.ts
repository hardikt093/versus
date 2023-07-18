import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { IUser } from "../interfaces/input";
import moment from "moment";
const prisma = new PrismaClient();

const getMatchPublicChannelConversation = async (data: any) => {
  const conversation = await prisma.channel.findFirst({
    where: {
      isDeleted: false, 
      goalServeMatchId: data.goalServeMatchId,
      goalServeLeagueId: data.goalServeLeagueId,
    },
  });
  let status = 'Not Started'
  const startMoment = moment.utc(conversation.channelStartAt);
  let endMoment = moment.utc(conversation.channelExpiredAt);
  if (!conversation.channelExpiredAt) {
    endMoment = moment.utc(conversation.matchStartAt).add(12, "hours");
  }
  const currentTime = moment().utc();
  if (currentTime.isSameOrAfter(startMoment) && currentTime.isSameOrBefore(endMoment)) {
    status = "Started"
  } else if (currentTime.isSameOrAfter(endMoment)) {
    status = "Expired"
  }
  return {status, ...conversation};
};
export default {
  getMatchPublicChannelConversation
};
