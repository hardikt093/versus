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
    const data = await nflService.scoreWithDate(req.query);
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
};
