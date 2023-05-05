import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import AppError from "../utils/AppError";
import Messages from "./../utils/messages";
import Match from "../models/documents/match.model";
import { IinputmatchListBySportsAndEvent } from "./match.interface";
import mongoose from "mongoose";

const matchListBySportsAndEvent = async (data: IinputmatchListBySportsAndEvent) => {
    return await Match.aggregate([
        {
            $match: {
                sportsType: data.sportsType,
                matchEventId: new mongoose.Types.ObjectId(data.matchEventId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        { $skip: data.skip ? data.skip : 0 },
        { $limit: data.limit ? data.limit : 10 },
        {
            "$lookup": {
                "from": "matchevents",
                "localField": "matchEventId",
                "foreignField": "_id",
                "as": "matchEvent"
            }
        },
        { $unwind : {path : "$matchEvent", preserveNullAndEmptyArrays: true} },
        {
            "$lookup": {
                "from": "teams",
                "localField": "localTeamId",
                "foreignField": "_id",
                "as": "localTeam"
            }
        },
        { $unwind : {path : "$localTeam", preserveNullAndEmptyArrays: true} },
        {
            "$lookup": {
                "from": "teams",
                "localField": "awayTeamId",
                "foreignField": "_id",
                "as": "awayTeam"
            }
        },
        { $unwind : {path : "$awayTeam", preserveNullAndEmptyArrays: true} },
        {
            "$lookup": {
                "from": "matchodds",
                let: {
                    id: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$$id",
                                    "$matchId"
                                ]
                            }
                        },
                    },
                    {
                        $sort : {
                            createdAt : -1
                        }
                    },
                    {
                        $limit: 1
                    }
                ],
                "as": "matchOdd"
            }
        },
        { $unwind : {path : "$matchOdd", preserveNullAndEmptyArrays: true} }
    ]);
};

export default {
    matchListBySportsAndEvent
};
