import moment from "moment";
import { axiosGetMicro, axiosPostMicro } from "../services/axios.service";

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
            const matchStartAt = utcDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
            const channelStartAt = startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
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
                channelStartAt : channelStartAt
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
          else{
            const utcDate = moment.utc(match.datetime_utc, "DD.MM.YYYY HH:mm");
            const startDate = moment(utcDate).subtract(20, "hours");
            const matchStartAt = utcDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
            const channelStartAt = startDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
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
            const createdChannelDetail = await prisma.channel.updateMany({
              where:{
                goalServeMatchId:match.goalServeMatchId,
                goalServeLeagueId: match.goalServeLeagueId,
              },
              data: {
                channelType : 'matchChannel',
                matchChannelName: chatName,
                matchStartAt : matchStartAt,
                channelStartAt : channelStartAt
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

  public getDashboadChannel = async () => {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(24, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(48, "hours").utc().toISOString();

    const conversation = await prisma.channel.findMany({
      where: {
        isDeleted: false,
        matchStartAt:{
          gte: subtractOneDay,
          lte: addOneDay,
        },
      },
    });
    if (conversation) {
      const getChannels = await conversation.map((data:any)=>{
        let status = "Not Started";
        const startMoment = moment.utc(data.channelStartAt);
        let endMoment = moment.utc();
        if (!data.channelExpiredAt) {
          endMoment = moment.utc(data.matchStartAt).add(12, "hours");
        } else {
          endMoment = moment.utc(data.channelExpiredAt);
        }
        const currentTime = moment().utc();
        if (
          currentTime.isSameOrAfter(startMoment) &&
          currentTime.isSameOrBefore(endMoment)
        ) {
          status = "Started";
        } else if (currentTime.isSameOrAfter(endMoment)) {
          status = "Expired";
        }
        // socket code
        return { status, data };
      } )
      return getChannels
      }
      else {
        return null;
      }
  }
}
