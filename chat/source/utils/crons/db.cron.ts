import cron from "node-cron";
import ChannelDbCronService from "../../channel/channel.cron.service";

class DBCronJob {
  private iscreateSingleGameChatRunning = false;
  private isexpireSingleGameChatRunning = false;
  private createSingleGameChat: cron.ScheduledTask;
  private expireSingleGameChat: cron.ScheduledTask;
  private getDashboadChannel: cron.ScheduledTask;

  constructor() {
    const channelDbCronService = new ChannelDbCronService();
    this.createSingleGameChat = cron.schedule("*/10 * * * * *", this.createSingleGameChatMethod.bind(this, channelDbCronService));
    this.expireSingleGameChat = cron.schedule("*/10 * * * * *", this.expireSingleGameChatMethod.bind(this, channelDbCronService));
    this.getDashboadChannel = cron.schedule("*/10 * * * * *", this.getDashboadChannelMethod.bind(this, channelDbCronService));
  }

  private async createSingleGameChatMethod(channelDbCronService: ChannelDbCronService): Promise<void> {
    if (this.iscreateSingleGameChatRunning){
      return;
    } 
    this.iscreateSingleGameChatRunning = true;
    try {
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
      await channelDbCronService.expireSingleGameChat();
    } catch (error) {
      console.log(error);
    } finally {
      this.isexpireSingleGameChatRunning = false;
    }
  }

  private async getDashboadChannelMethod(channelDbCronService: ChannelDbCronService): Promise<void> {
    if (this.isexpireSingleGameChatRunning) return;
    this.isexpireSingleGameChatRunning = true;
    try {
      await channelDbCronService.getDashboadChannel();
    } catch (error) {
      console.log(error);
    } finally {
      this.isexpireSingleGameChatRunning = false;
    }
  }

  start(): void {
    this.createSingleGameChat.start();
    this.expireSingleGameChat.start();
    this.getDashboadChannel.start();
  }

  stop(): void {
    this.createSingleGameChat.stop();
    this.expireSingleGameChat.stop();
    this.getDashboadChannel.stop();
  }
}

export default DBCronJob;
