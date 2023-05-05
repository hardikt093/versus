
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import { IinputeventListBySports } from "./matchEvent.interface";
import MatchEvent from "../models/documents/matchEvent.model";
const eventListBySports = async (data: IinputeventListBySports) => {
    return await MatchEvent.aggregate([
        {
            $match : {
                sportsType: data.sportsType,
            }
        },
        {
            $sort  : {
                createdAt : -1
            }
        },
        {
            $skip : data.skip ? data.skip : 0,
        },
        {
            $limit : data.limit ? data.limit : 10,
        },
        {
            "$lookup": {
                "from": "matches",
                let: {
                    id: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$$id",
                                    "$matchEventId"
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
                ],
                "as": "matches"
            }
        }
    ]);
};

export default {
    eventListBySports
};
