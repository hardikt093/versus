import { Request, Response } from "express";
import httpStatus from "http-status";
import matchOddService from "./matchOdds.service";
import createResponse from "../utils/response";


const matchOddsListBySportsAndMatch = async (req: Request, res: Response) => {
  try {   
    const data = await matchOddService.matchOddsListBySportsAndMatch(req.body);
    createResponse(res, httpStatus.OK, "Match data fetched succesfully", data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
export default { matchOddsListBySportsAndMatch };
