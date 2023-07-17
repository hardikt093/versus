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
          const conversation = await prisma.conversation.findFirst({
            where: {
              isDeleted : false,
              goalServeMatchId: match.goalServeMatchId,
              goalServeLeagueId: match.goalServeLeagueId,
            },
          });
          if (!conversation) {
            let matchDate = match.date ? match.date : match.datetime_utc
            const date = matchDate.split(".");
            let day = date[0] ?? moment().format('D');
            let month = date[1] ?? moment().format('M');
            let awayTeamNameSplit = ((match.awayTeam.awayTeamName).split(" "));
            let homeTeamNameSplit = ((match.homeTeam.homeTeamName).split(" "));
            const chatName = `#${awayTeamNameSplit[awayTeamNameSplit.length -1 ]}@${homeTeamNameSplit[awayTeamNameSplit.length -1 ]}-${day}/${month}`
            await prisma.conversation.create({
              data: {
                goalServeMatchId: match.goalServeMatchId,
                goalServeLeagueId: match.goalServeLeagueId,
                name: chatName,
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
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
