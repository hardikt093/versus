import { Request, Response } from "express";
import nflService from "./nfl.service";
import createResponse from "../../utils/response";
import httpStatus from "http-status";

const addTeam = async (req: Request, res: Response) => {
    const addTeam = await nflService.addTeam()
    createResponse(res,httpStatus.OK,"",addTeam)
};

export default {addTeam};
