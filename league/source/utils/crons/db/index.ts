import nbaCron from './nba.cron';
import nhlCron from './nhl.cron';
import mlbCron from './mlb.cron';
import betCron from './bet.cron';
import config from "../../../config/config";
import mongoose from "mongoose";
import nflCron from './nfl.cron';

async function main() {
    await mongoose.connect(config.mongoose.url).then((result: any) => {
        console.info(`Connected to MongoDB -${config.mongoose.url}`);
    });
    nbaCron;
    nhlCron;
    mlbCron;
    betCron;
    nflCron
}
main();