import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../../utils/response";
import nhlService from "./nhl.service";

const addNhlMatch = async (req: Request, res: Response) => {
  try {
    const addNhlMatch = await nhlService.addNhlMatch();
    createResponse(res, httpStatus.OK, "", addNhlMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getNhlStandings = async (req: Request, res: Response) => {
  try {
    const getNhlStandings = await nhlService.getNHLStandingData();
    createResponse(res, httpStatus.OK, "", getNhlStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nhlSingleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScore = await nhlService.nhlSingleGameBoxScore(
      req.query.goalServeMatchId as string
    );
    createResponse(res, httpStatus.OK, "", nhlSingleGameBoxScore);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addMatchDataFutureForNhl = async (req: Request, res: Response) => {
  try {
    const addMatchDataFutureForNhl =
      await nhlService.addMatchDataFutureForNhl();
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nhlGetTeam = async (req: Request, res: Response) => {
  try {
    const nhlGetTeam = await nhlService.nhlGetTeam(req.query.goalServeTeamId as string);
    createResponse(res, httpStatus.OK, "", nhlGetTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlScoreWithDate = async (req: Request, res: Response) => {
  try {
    const nhlScoreWithDate = await nhlService.nhlScoreWithDate(
      req.query.date1 as string,
      ""
    );
    createResponse(res, httpStatus.OK, "", nhlScoreWithDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlScoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const nhlScoreWithCurrentDate =
      await nhlService.nhlScoreWithCurrentDate(req.query.date1 as string);
    createResponse(res, httpStatus.OK, "", nhlScoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlSingleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScoreUpcomming =
      await nhlService.nhlSingleGameBoxScoreUpcomming(
        req.query.goalServeMatchId as string
      );
    createResponse(res, httpStatus.OK, "", nhlSingleGameBoxScoreUpcomming);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlSingleGameBoxScoreLive = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScoreLive =
      await nhlService.nhlSingleGameBoxScoreLive(
        req.query.goalServeMatchId as string
      );
    createResponse(res, httpStatus.OK, "", nhlSingleGameBoxScoreLive);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const get2DaysUpcomingDataFromMongodb = async (req: Request, res: Response) => {
  try {
    const scoreWithCurrentDate =
      await nhlService.get2DaysUpcomingDataFromMongodb(
        req.query.date1 as string
      );
    createResponse(res, httpStatus.OK, "", scoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  addNhlMatch,
  getNhlStandings,
  nhlSingleGameBoxScore,
  addMatchDataFutureForNhl,
  nhlScoreWithDate,
  nhlScoreWithCurrentDate,
  nhlGetTeam,
  nhlSingleGameBoxScoreUpcomming,
  nhlSingleGameBoxScoreLive,
  get2DaysUpcomingDataFromMongodb
};
