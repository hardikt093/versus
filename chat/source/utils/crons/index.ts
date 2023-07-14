import DBCronJob from "./db.cron";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../../.env") });
const dBCronJob = new DBCronJob();
dBCronJob.start();