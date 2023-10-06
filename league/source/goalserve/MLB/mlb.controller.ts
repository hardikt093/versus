import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../../utils/response";
import goalserveService from "./mlb.service";
import mlbService from "./mlb.service";

const baseballStandings = async (req: Request, res: Response) => {
  try {
    const getStandings = await goalserveService.getMLBStandings();
    createResponse(res, httpStatus.OK, "", getStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const mlbScoreWithDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await goalserveService.mlbScoreWithDate(
      req.query.date1 as string
    );
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createLeague = async (req: Request, res: Response) => {
  try {
    const createLeague = await goalserveService.createLeague(req.body);
    createResponse(res, httpStatus.OK, "", createLeague);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createPlayer = async (req: Request, res: Response) => {
  try {
    const createPlayer = await goalserveService.createPlayer();
    createResponse(res, httpStatus.OK, "", createPlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const scoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const scoreWithCurrentDate = await goalserveService.scoreWithCurrentDate(
      req.query.date1 as string
    );
    createResponse(res, httpStatus.OK, "", scoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addMatchData = async (req: Request, res: Response) => {
  try {
    const addMatch = await goalserveService.addMatchWithNewModel();
    createResponse(res, httpStatus.OK, "", {});
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const addStanding = async (req: Request, res: Response) => {
  try {
    const addMatch = await goalserveService.addStanding();
    createResponse(res, httpStatus.OK, "", addMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const singleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const singleGameBoxScore = await goalserveService.singleGameBoxScore(
      req.query.goalServeMatchId as string
    );
    createResponse(res, httpStatus.OK, "", singleGameBoxScore);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addMatchDataFuture = async (req: Request, res: Response) => {
  try {
    const addMatchDataFuture = await goalserveService.addMatchDataFuture(
      req.body
    );
    createResponse(res, httpStatus.OK, "", {});
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getBseballStandings = async (req: Request, res: Response) => {
  try {
    const getStanding = await goalserveService.getStandingData();
    createResponse(res, httpStatus.OK, "", getStanding);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const singleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const singleGameBoxScoreUpcomming =
      await goalserveService.singleGameBoxScoreUpcomming(
        req.query.goalServeMatchId as string
      );
    createResponse(res, httpStatus.OK, "", singleGameBoxScoreUpcomming);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const statsTeam = async (req: Request, res: Response) => {
  try {
    const teamStats = await goalserveService.teamStats();
    createResponse(res, httpStatus.OK, "", teamStats);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const mlbGetTeam = async (req: Request, res: Response) => {
  try {
    const mlbGetTeam = await goalserveService.mlbGetTeam(
      req.query.goalServeTeamId as string
    );
    createResponse(res, httpStatus.OK, "", mlbGetTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const mlbSingleGameBoxScoreLive = async (req: Request, res: Response) => {
  try {
    const mlbSingleGanbaGetTeammeBoxScoreLive =
      await goalserveService.mlbSingleGameBoxScoreLive(
        req.query.goalServeMatchId as string
      );
    createResponse(res, httpStatus.OK, "", mlbSingleGanbaGetTeammeBoxScoreLive);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const get2DaysUpcomingDataFromMongodb = async (req: Request, res: Response) => {
  try {
    const scoreWithCurrentDate =
      await goalserveService.get2DaysUpcomingDataFromMongodb(
        req.query.date1 as string
      );
    createResponse(res, httpStatus.OK, "", scoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const get20HoursUpcomingGameData = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.get20HoursUpcomingGameData();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getAllUpcomingGameData = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.getAllUpcomingGameData();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const get24HoursFinalGameData = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.get24HoursFinalGameData();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const addChatDetailInMatch = async (req: Request, res: Response) => {
  try {
    await goalserveService.addChatDetailInMatch(req.body);
    createResponse(res, httpStatus.OK, "", {});
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getAllFinalGameData = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.getAllFinalGameData();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getSingleMlbGame = async (req: Request, res: Response) => {
  try {
    const getSingleMlbGame = await mlbService.getSingleMlbGame(req.query as {goalServeMatchId:string | number});
    createResponse(res, httpStatus.OK, "", ...getSingleMlbGame);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  baseballStandings,
  mlbScoreWithDate,
  createLeague,
  createPlayer,
  scoreWithCurrentDate,
  addMatchData,
  addStanding,
  addMatchDataFuture,
  singleGameBoxScore,
  getBseballStandings,
  singleGameBoxScoreUpcomming,
  statsTeam,
  mlbGetTeam,
  mlbSingleGameBoxScoreLive,
  get2DaysUpcomingDataFromMongodb,
  get20HoursUpcomingGameData,
  getAllUpcomingGameData,
  get24HoursFinalGameData,
  addChatDetailInMatch,
  getAllFinalGameData,
  getSingleMlbGame,
};
