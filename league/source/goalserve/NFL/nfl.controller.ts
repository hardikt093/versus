import { Request, Response } from "express";
import nflService from "./nfl.service";
import createResponse from "../../utils/response";
import httpStatus from "http-status";

const addStanding = async (req: Request, res: Response) => {
  const addStanding = await nflService.addStanding();
  createResponse(res, httpStatus.OK, "", addStanding);
};
const getNflStandings = async (req: Request, res: Response) => {
  try {
    const data = await nflService.getStandings();
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getCalendar = async (req: Request, res: Response) => {
  try {
    const data = await nflService.getCalendar();
    createResponse(
      res,
      httpStatus.OK,
      "",
      data.reduce((obj, item) => Object.assign(obj, item), {})
      // data.reduce((obj, item) => Object.assign(obj, item), {})
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nflScoreWithDate = async (req: Request, res: Response) => {
  try {
    const data = await nflService.scoreWithDate(req.body);
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addFinalMatch = async (req: Request, res: Response) => {
  try {
    const data = await nflService.addFinalMatch(req.query);
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nflUpcomming = async (req: Request, res: Response) => {
  try {
    const data = await nflService.nflUpcomming(
      req.query.goalServeMatchId as string
    );
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const nflFinal = async (req: Request, res: Response) => {
  try {
    const data = await nflService.nflFinal(
      req.query.goalServeMatchId as string
    );
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const nflLive = async (req: Request, res: Response) => {
  try {
    const data = await nflService.nflLive(
      req.query.goalServeMatchId as string
    );
    createResponse(res, httpStatus.OK, "", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default {
  addStanding,
  getNflStandings,
  getCalendar,
  nflScoreWithDate,
  addFinalMatch,
  nflUpcomming,
  nflFinal,
  nflLive
};
