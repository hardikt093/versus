import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../../utils/response";
import goalserveService from "./goalserve.service";
import { string } from "joi";

const createTeamNBA = async (req: Request, res: Response) => {
  try {
    const createdTeamData = await goalserveService.createTeamNBA(req.body);
    createResponse(res, httpStatus.OK, "", createdTeamData);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createTeamImageNBA = async (req: Request, res: Response) => {
  try {
    const createTeamImageNBA = await goalserveService.addNBATeamImage(req.body);
    createResponse(res, httpStatus.OK, "", createTeamImageNBA);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addNbaMatch = async (req: Request, res: Response) => {
  try {
    const addNbaMatch = await goalserveService.addNbaMatch();
    createResponse(res, httpStatus.OK, "", addNbaMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addMatchDataFutureForNba = async (req: Request, res: Response) => {
  try {
    const addMatchDataFutureForNba = await goalserveService.addMatchDataFutureForNba()
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addNbaPlayer = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.addNbaPlayer();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addNbaInjuredPlayer = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.addNbaInjuredPlayer();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addNbaStandings = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.addNbaStandings();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const getNbaStandings = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.getNbaStandingData();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const nbaScoreWithDate = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.nbaScoreWithDate(req.query, "")
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const nbaScoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.nbaScoreWithCurrentDate(req.query)
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
const nbaGetTeam = async (req: Request, res: Response) => {
  try {
    const nbaGetTeam = await goalserveService.nbaGetTeam(req.query)
    createResponse(res, httpStatus.OK, "", nbaGetTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const nbaSingleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.nbaSingleGameBoxScore(req.query);
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
const nbaSingleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const data = await goalserveService.nbaSingleGameBoxScoreUpcomming(req.query);
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
export default {
  createTeamNBA,
  createTeamImageNBA,
  addNbaMatch,
  addMatchDataFutureForNba,
  addNbaPlayer,
  addNbaInjuredPlayer,
  addNbaStandings,
  getNbaStandings,
  nbaScoreWithDate,
  nbaScoreWithCurrentDate,
  nbaGetTeam,
  nbaSingleGameBoxScore,
  nbaSingleGameBoxScoreUpcomming
};
