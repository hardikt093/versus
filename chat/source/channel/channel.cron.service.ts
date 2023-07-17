import moment from "moment";
import { axiosGetMicro } from "../services/axios.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
export default class ConversationDbCronServiceClass {
  public createSingleGameChat = async () => {
    try {
      const resp = await axiosGetMicro(
        `${process.env.LEAGUE_SERVER}/league/mlb/getAllUpcomingGameData`,
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
            const startDate = moment(utcDate).subtract(20, "hours");
            const endDate = moment(utcDate).add(2, "hours");
            const matchStartAt = utcDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
            const channelStartAt = startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
            const channelExpiredAt = endDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
            let matchDate = match.date ? match.date : match.datetime_utc;
            const date = matchDate.split(".");
            let day = date[0] ?? moment(utcDate).format("D");
            let month = date[1] ?? moment(utcDate).format("M");
            let awayTeamNameSplit = match.awayTeam.awayTeamName.split(" ");
            let homeTeamNameSplit = match.homeTeam.homeTeamName.split(" ");
            const chatName = `#${
              awayTeamNameSplit[awayTeamNameSplit.length - 1]
            }@${
              homeTeamNameSplit[awayTeamNameSplit.length - 1]
            }-${day}/${month}`;
            await prisma.channel.create({
              data: {
                goalServeMatchId: match.goalServeMatchId,
                goalServeLeagueId: match.goalServeLeagueId,
                channelType : 'matchChannel',
                matchChannelName: chatName,
                matchStartAt : matchStartAt,
                channelStartAt : channelStartAt,
                channelExpiredAt : channelExpiredAt
              },
            });
          }
        }
      }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };

  public expireSingleGameChat = async () => {
    try {
      const resp = await axiosGetMicro(
        `${process.env.LEAGUE_SERVER}/league/mlb/get24HoursFinalGameData`,
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
            const endDate = moment().add(2, "hours");
            const matchEndAt = endDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
          if (conversation && !conversation.channelExpiredAt) {
            await prisma.channel.update(
              {
                where : {
                  id : conversation.id
                },
                data : {
                  channelExpiredAt : matchEndAt
                }
              }
            );
          }
        }
      }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
