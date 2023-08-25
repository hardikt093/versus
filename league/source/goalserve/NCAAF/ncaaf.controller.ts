import { Request, Response } from "express";
import createResponse from "../../utils/response";
import httpStatus from "http-status";
import ncaafService from "./ncaaf.service";

const addTeamNCAAF = async (req: Request, res: Response) => {
  const addTeam = await ncaafService.addTeam(req.file);
  createResponse(res, httpStatus.OK, "", addTeam);
};

const getCalendar = async (req: Request, res: Response) => {
  try {
    const data = await ncaafService.getCalendar();
    createResponse(
      res,
      httpStatus.OK,
      "",
      data.reduce((obj:any, item:any) => Object.assign(obj, item), {})
    );
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default {
  addTeamNCAAF,
  getCalendar
};
