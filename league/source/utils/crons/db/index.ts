import nbaCron from './nba.cron';
import nhlCron from './nhl.cron';
import mlbCron from './mlb.cron';
import config from "../../../config/config";
import mongoose from "mongoose";

async function main() {
    await mongoose.connect(config.mongoose.url).then((result: any) => {
        console.info(`Connected to MongoDB -${config.mongoose.url}`);
    });
    nbaCron;
    nhlCron;
    mlbCron;
}
main();