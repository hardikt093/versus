import moment from "moment";
import { axiosGetMicro } from "../services/axios.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
export default class ConversationDbCronServiceClass {
  public createSingleGameChat = async () => {
    try {
      const resp = await axiosGetMicro(
        `${process.env.LEAGUE_SERVER}/league/mlb/upcoming12HoursGame`,
        {},
        ""
      );
      if (resp.data.data && resp.data.data.length) {
        for (let i = 0; i < resp.data.data.length; i++) {
          const match = resp.data.data[i];
          const conversation = await prisma.conversation.findFirst({
            where: {
              goalServeMatchId: match.goalServeMatchId,
              goalServeLeagueId: match.goalServeLeagueId,
            },
          });
          if (!conversation) {
            const date = match.datetime_utc.split(" ");
            let day = moment().format('D');
            let month = moment().format('M');
            const chatName = `#${match.awayTeam.abbreviation}@${match.homeTeam.abbreviation}-${day}/${month}`
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
