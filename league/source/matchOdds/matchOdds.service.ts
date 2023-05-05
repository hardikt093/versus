import { IinputmatchOddsListBySportsAndEvent } from "./matchOdds.interface";
import MatchOdd from "../models/documents/matchOdd.model";
import mongoose from "mongoose";

const matchOddsListBySportsAndMatch = async (data: IinputmatchOddsListBySportsAndEvent) => {
    return await MatchOdd.aggregate([
        {
            $match: {
                sportsType: data.sportsType,
                matchId: new mongoose.Types.ObjectId(data.matchId)
            }
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $skip: data.skip ? data.skip : 0,
        },
        {
            $limit: data.limit ? data.limit : 10,
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
        {
            "$lookup": {
                "from": "matches",
                "localField": "matchId",
                "foreignField": "_id",
                "as": "match"
            }
        },
        { $unwind : {path : "$match", preserveNullAndEmptyArrays: true} }
    ]);
};

export default {
    matchOddsListBySportsAndMatch
};
