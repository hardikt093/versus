import { Request, Response } from "express";
import httpStatus from "http-status";
import walletService from "../wallet/wallet.service";
import createResponse from "./../utils/response";

import { IUser } from "../interfaces/input";

const walletDeduction = async (req: Request, res: Response) => {
    try {
      const wallet = await walletService.walletDeduction(req.body.amount,req.body.userId)
      createResponse(res, httpStatus.OK, "", wallet);
    } catch (error: any) {
      createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
    }
  };

  export default {
    walletDeduction
  };