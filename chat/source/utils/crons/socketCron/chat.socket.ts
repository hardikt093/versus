import cron from "node-cron";
import channelService from "../../../singleGameChat/singleGameChat.service";

let getDashboardChannels: boolean = false;
const getDashboardChannelsSocket = cron.schedule("*/5 * * * * *", async () => {
  if (getDashboardChannels) {
    // console.log("getUpcomingMatch Skip");
    return;
  }
  getDashboardChannels = true;
  try {
    // console.info("inside score cron getUpcomingMatch");
    await channelService.getDashboardChannelsSocket();
  } catch (error) {
    console.log(error);
  } finally {
    getDashboardChannels = false;
  }
});

export default{getDashboardChannelsSocket}