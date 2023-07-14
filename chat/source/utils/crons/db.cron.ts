import cron from "node-cron";
import ConversationDbCronService from "../../conversation/conversation.cron.service";

class DBCronJob {
  private iscreateSingleGameChatRunning = false;
  private isexpireSingleGameChatRunning = false;
  private createSingleGameChat: cron.ScheduledTask;
  private expireSingleGameChat: cron.ScheduledTask;

  constructor() {
    const conversationDbCronService = new ConversationDbCronService();
    this.createSingleGameChat = cron.schedule("*/2 * * * * *", this.createSingleGameChatMethod.bind(this, conversationDbCronService));
    this.expireSingleGameChat = cron.schedule("*/5 * * * * *", this.expireSingleGameChatMethod.bind(this, conversationDbCronService));
  }

  private async createSingleGameChatMethod(conversationDbCronService: ConversationDbCronService): Promise<void> {
    if (this.iscreateSingleGameChatRunning){
      console.log("SKIP createSingleGameChat");
      return;
    } 
    this.iscreateSingleGameChatRunning = true;
    try {
      console.log("createSingleGameChat");
      await conversationDbCronService.createSingleGameChat();
    } catch (error) {
      console.log(error);
    } finally {
      this.iscreateSingleGameChatRunning = false;
    }
  }

  private async expireSingleGameChatMethod(conversationDbCronService: ConversationDbCronService): Promise<void> {
    if (this.isexpireSingleGameChatRunning) return;
    this.isexpireSingleGameChatRunning = true;
    try {
      console.log("expireSingleGameChatMethod");
      await conversationDbCronService.expireSingleGameChat();
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
