import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";

import createResponse from "./../utils/response";

const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secratekey: string = process.env.JWT_SECRET as string;
    const token: string | undefined = req.header("Authorization");
    if (!token) {
      return createResponse(
        res,
        httpStatus.UNAUTHORIZED,
        "Please authenticate",
        {}
      );
    } else {
      const tokenArray = token.split(" ");
      const decoded = jwt.verify(tokenArray[1], secratekey);
      if (!decoded) {
        return createResponse(
          res,
          httpStatus.UNAUTHORIZED,
          "Please authenticate",
          {}
        );
      }
      const data = JSON.parse(JSON.stringify(decoded)).sub;
      req.loggedInUser = {
        id: data.id,
      };
      next();
    }
  } catch (err: any) {
    createResponse(res, httpStatus.UNAUTHORIZED, "Please authenticate", {});
  }
};

export default auth;
