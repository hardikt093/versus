import { Request, Response } from "express";
import createResponse from "../../utils/response";
import httpStatus from "http-status";
import ncaafService from "./ncaaf.service";

const addTeamNCAAF = async (req: Request, res: Response) => {
  const addTeam = await ncaafService.addTeam(req.file);
  createResponse(res, httpStatus.OK, "", addTeam);
};

export default {
  addTeamNCAAF,
};
