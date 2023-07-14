import { axiosGetMicro } from "../services/axios.service";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
export default class ConversationDbCronServiceClass {
  public createSingleGameChat = async () => {
    try {
      const users = await prisma.user.findMany();
      const resp = await axiosGetMicro(
        `${process.env.LEAGUE_SERVER}/league/mlb/upcoming12HoursGame`,
        {},
        ""
      );
      if (resp.data.data && resp.data.data.length) {
        // console.log("CHATs", JSON.stringify(resp.data, null, 2));
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
