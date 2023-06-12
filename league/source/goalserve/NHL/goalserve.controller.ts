import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../../utils/response";
import goalserveService from "./goalserve.service";

// NHL

const createTeamNHL = async (req: Request, res: Response) => {
  try {
    const createTeamNHL = await goalserveService.createTeamNHL(req.body);
    createResponse(res, httpStatus.OK, "", createTeamNHL);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createTeamImageNHL = async (req: Request, res: Response) => {
  try {
    const createTeamImageNHL = await goalserveService.addNHLTeamImage(req.body);
    createResponse(res, httpStatus.OK, "", createTeamNHL);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addNhlMatch = async (req: Request, res: Response) => {
  try {
    const addNhlMatch = await goalserveService.addNhlMatch();
    createResponse(res, httpStatus.OK, "", addNhlMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getNhlStandings = async (req: Request, res: Response) => {
  try {
    const getNhlStandings = await goalserveService.getNHLStandingData();
    createResponse(res, httpStatus.OK, "", getNhlStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nhlSingleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScore = await goalserveService.nhlSingleGameBoxScore(
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
      await goalserveService.addMatchDataFutureForNhl();
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nhlGetTeam = async (req: Request, res: Response) => {
  try {
    const nhlGetTeam = await goalserveService.nhlGetTeam(req.query.goalServeTeamId as string);
    createResponse(res, httpStatus.OK, "", nhlGetTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlScoreWithDate = async (req: Request, res: Response) => {
  try {
    const nhlScoreWithDate = await goalserveService.nhlScoreWithDate(
      req.query,
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
      await goalserveService.nhlScoreWithCurrentDate(req.query);
    createResponse(res, httpStatus.OK, "", nhlScoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nhlSingleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const nhlSingleGameBoxScoreUpcomming =
      await goalserveService.nhlSingleGameBoxScoreUpcomming(
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
      await goalserveService.nhlSingleGameBoxScoreLive(
        req.query.goalServeMatchId as string
      );
    createResponse(res, httpStatus.OK, "", nhlSingleGameBoxScoreLive);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  createTeamNHL,
  createTeamImageNHL,
  addNhlMatch,
  getNhlStandings,
  nhlSingleGameBoxScore,
  addMatchDataFutureForNhl,
  nhlScoreWithDate,
  nhlScoreWithCurrentDate,
  nhlGetTeam,
  nhlSingleGameBoxScoreUpcomming,
  nhlSingleGameBoxScoreLive,
};
