const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
export default class ConversationDbCronServiceClass {
    public createSingleGameChat = async () => {
        try {
            const users = await prisma.user.findMany();
            console.log("USERS", JSON.stringify(users,null,2));
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
