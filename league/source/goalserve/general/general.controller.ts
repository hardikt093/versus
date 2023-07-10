import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../../utils/response";
import generalService from "./general.service";

const upcoming2DaysMatch = async (req: Request, res: Response) => {
    try {
        const scoreWithCurrentDate = await generalService.upcoming2DaysMatch(
            req.query.date1 as string, req.query.type as string
        );
        createResponse(res, httpStatus.OK, "", scoreWithCurrentDate);
    } catch (error: any) {
        createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
    }
}

export default {
    upcoming2DaysMatch
}