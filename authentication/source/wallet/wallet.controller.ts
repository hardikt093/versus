import { Request, Response } from "express";
import httpStatus from "http-status";
import walletService from "../wallet/wallet.service";
import createResponse from "./../utils/response";

import { IUser } from "../interfaces/input";

const walletDeduction = async (req: Request, res: Response) => {
    try {
      const wallet = await walletService.walletDeduction(req.body.amount, req.body.userId, req.body)
      createResponse(res, httpStatus.OK, "", wallet);
    } catch (error: any) {
      console.log("error", error)
      createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
    }
  };

const checkBalance = async (req: Request, res: Response) => {
  try {
    const wallet = await walletService.checkBalance(req.query as { userId: string | number, requestAmount: number | string })
    if (wallet.length > 0) {
      createResponse(res, httpStatus.OK, "", true);
    } else {
      createResponse(res, httpStatus.BAD_REQUEST, "insufficient balance", {});
    }

  } catch (error: any) {
    console.log("error", error)
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const revertAmount = async (req: Request, res: Response) => {
  try {
    const wallet = await walletService.revertAmount(req.body.amount, req.body.userId, req.body)
    createResponse(res, httpStatus.OK, "", wallet);
  } catch (error: any) {
    console.log("error", error)
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const paymentRelease = async (req: Request, res: Response) => {
  try {
    const paymentRelease = await walletService.paymentRelease(req.body.amount, req.body.userId, req.body)
    createResponse(res, httpStatus.OK, "", true);
  } catch (error: any) {
    console.log("error", error)
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

  export default {
  walletDeduction,
  checkBalance,
  revertAmount,
  paymentRelease
  };