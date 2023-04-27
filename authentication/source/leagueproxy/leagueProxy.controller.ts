import { Request, Response } from "express";
import httpStatus from "http-status";

import createResponse from "../utils/response";
import Messages from "../utils/messages";
import { axiosGet, axiosPost, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";

const standings = async (req: Request, res: Response) => {
  try {
    let token: any = req.header("Authorization");
    const getContact = await axiosGet(
      `${config.leagueServer}/mlb/standings`,
      {},
      token
    );
    createResponse(res, httpStatus.OK, "", getContact.data.data);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message);
  }
};

export default { standings };
