import { Request, Response } from "express";
import nflService from "./nfl.service";
import createResponse from "../../utils/response";
import httpStatus from "http-status";

const addTeam = async (req: Request, res: Response) => {
    const addTeam = await nflService.addTeam()
    createResponse(res,httpStatus.OK,"",addTeam)
};

const addStanding = async (req: Request, res: Response) => {
    const addStanding = await nflService.addStanding()
    createResponse(res,httpStatus.OK,"",addStanding)
};
const getNflStandings = async (req: Request, res: Response) => {
    try {
      const data = await nflService.getStandings();
      createResponse(res, httpStatus.OK, "", data);
    } catch (error: any) {
      createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
    }
  }
  
export default {addTeam,addStanding,getNflStandings};
