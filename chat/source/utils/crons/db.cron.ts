import cron from "node-cron";
import ChannelDbCronService from "../../channel/channel.cron.service";

class DBCronJob {
  private iscreateSingleGameChatRunning = false;
  private isexpireSingleGameChatRunning = false;
  private createSingleGameChat: cron.ScheduledTask;
  private expireSingleGameChat: cron.ScheduledTask;

  constructor() {
    const channelDbCronService = new ChannelDbCronService();
    this.createSingleGameChat = cron.schedule("*/10 * * * * *", this.createSingleGameChatMethod.bind(this, channelDbCronService));
    this.expireSingleGameChat = cron.schedule("*/10 * * * * *", this.expireSingleGameChatMethod.bind(this, channelDbCronService));
  }

  private async createSingleGameChatMethod(channelDbCronService: ChannelDbCronService): Promise<void> {
    if (this.iscreateSingleGameChatRunning){
      console.log("SKIP createSingleGameChat");
      return;
    } 
    this.iscreateSingleGameChatRunning = true;
    try {
      console.log("createSingleGameChat");
      await channelDbCronService.createSingleGameChat();
    } catch (error) {
      console.log(error);
    } finally {
      this.iscreateSingleGameChatRunning = false;
    }
  }

  private async expireSingleGameChatMethod(channelDbCronService: ChannelDbCronService): Promise<void> {
    if (this.isexpireSingleGameChatRunning) return;
    this.isexpireSingleGameChatRunning = true;
    try {
      console.log("expireSingleGameChatMethod");
      await channelDbCronService.expireSingleGameChat();
    } catch (error) {
      console.log(error);
    } finally {
      this.isexpireSingleGameChatRunning = false;
    }
  }

  start(): void {
    this.createSingleGameChat.start();
    this.expireSingleGameChat.start();
  }

  stop(): void {
    this.createSingleGameChat.stop();
    this.expireSingleGameChat.stop();
  }
}

export default DBCronJob;
