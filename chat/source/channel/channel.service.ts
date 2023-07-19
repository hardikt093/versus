import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");

import AppError from "../utils/AppError";
import Messages from "../utils/messages";
import { IUser } from "../interfaces/input";
import moment from "moment";
import { axiosGetMicro, axiosPostMicro } from "../services/axios.service";
const prisma = new PrismaClient();

const getMatchPublicChannelConversation = async (data: any) => {
  const conversation = await prisma.channel.findFirst({
    where: {
      isDeleted: false, 
      goalServeMatchId: data.goalServeMatchId,
      goalServeLeagueId: data.goalServeLeagueId,
    },
  });
  if (conversation) {
    let status = 'Not Started'
    const startMoment = moment.utc(conversation.channelStartAt);
    let endMoment = moment.utc();
    if (!conversation.channelExpiredAt) {
      endMoment = moment.utc(conversation.matchStartAt).add(12, "hours");
    } else {
      endMoment = moment.utc(conversation.channelExpiredAt);
    }
    const currentTime = moment().utc();
    if (currentTime.isSameOrAfter(startMoment) && currentTime.isSameOrBefore(endMoment)) {
      status = "Started"
    } else if (currentTime.isSameOrAfter(endMoment)) {
      status = "Expired"
    }
    return {status, ...conversation};
  } else {
    return null;
  }
};

const addFinalMatchChannel = async () => {
  try {
    const resp = await axiosGetMicro(
      `${process.env.LEAGUE_SERVER}/league/mlb/getAllFinalGameData`,
      {},
      ""
    );
    if (resp.data.data && resp.data.data.length) {
      for (let i = 0; i < resp.data.data.length; i++) {
        const match = resp.data.data[i];
        const conversation = await prisma.channel.findFirst({
          where: {
            isDeleted: false,
            goalServeMatchId: match.goalServeMatchId,
            goalServeLeagueId: match.goalServeLeagueId,
          },
        });
        if (!conversation) {
          const utcDate = moment.utc(match.datetime_utc, "DD.MM.YYYY HH:mm");
          console.log("addFinalMatchChannel date", utcDate);
          const startDate = moment(utcDate).subtract(20, "hours");
          const endDate = moment(utcDate).add(2, "hours");
          const matchStartAt = utcDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
          const channelStartAt = startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
          const matchEndAt = endDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
          let matchDate = match.date ? match.date : match.datetime_utc;
          const date = matchDate.split(".");
          let day = date[0] ?? moment(utcDate).format("D");
          let month = date[1] ?? moment(utcDate).format("M");
          let awayTeamNameSplit = match.awayTeam.awayTeamName.split(" ").pop();
          let homeTeamNameSplit = match.homeTeam.homeTeamName.split(" ").pop();
          const chatName = `#${
            awayTeamNameSplit
          }@${
            homeTeamNameSplit
          }-${day}/${month}`;
          const createdChannelDetail = await prisma.channel.create({
            data: {
              goalServeMatchId: match.goalServeMatchId,
              goalServeLeagueId: match.goalServeLeagueId,
              channelType : 'matchChannel',
              matchChannelName: chatName,
              matchStartAt : matchStartAt,
              channelStartAt : channelStartAt,
              channelExpiredAt: matchEndAt
            },
          });
          const resp = await axiosPostMicro(
            {
              goalServeMatchId: match.goalServeMatchId,
              goalServeLeagueId: match.goalServeLeagueId,
              chatChannelId: createdChannelDetail.id,
              chatChannelName: createdChannelDetail.matchChannelName,
            },
            `${process.env.LEAGUE_SERVER}/league/mlb/addChatDetailInMatch`,
            ""
          );
        }
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};
export default {
  getMatchPublicChannelConversation,
  addFinalMatchChannel
};
