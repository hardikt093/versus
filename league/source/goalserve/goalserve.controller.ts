import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../utils/response";
import goalserveService from "./goalserve.service";

const baseballStandings = async (req: Request, res: Response) => {
  try {
    const getStandings = await goalserveService.getMLBStandings();
    createResponse(res, httpStatus.OK, "", getStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

export default {
  baseballStandings,
};
