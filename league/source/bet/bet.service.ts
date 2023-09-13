import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/MLB/match.model";
import AppError from "../utils/AppError";
import {
  IBetData,
  IBetSquared,
  ICreateBetRequest,
  IOpponentCount,
  IlistBetRequestData,
} from "./bet.interface";
import { betStatus } from "../models/interfaces/bet.interface";
import Messages from "../utils/messages";
import NbaMatch from "../models/documents/NBA/match.model";
import { axiosGetMicro, axiosPostMicro } from "../services/axios.service";
import config from "../config/config";
import socketService from "../services/socket.service";
import Notification from "../models/documents/notification.model";
import NflMatch from "../models/documents/NFL/match.model";
import NcaafMatch from "../models/documents/NCAAF/match.model";
import BetLike from "../models/documents/betLike.model";

const winAmountCalculationUsingOdd = function (amount: number, odd: number) {
  if (odd < 0) {
    return amount / ((-1 * odd) / 100);
  } else {
    return (amount * odd) / 100;
  }
};
const fairOddCalculation = function (favourite: number, underdog: number) {
  const FavIP =
    favourite < 0
      ? (-favourite / (-favourite + 100)) * 100
      : (100 / (favourite + 100)) * 10;
  const underIP =
    underdog < 0
      ? (-underdog / (-underdog + 100)) * 100
      : (100 / (underdog + 100)) * 10;
  const favFairOdd = FavIP / (FavIP + underIP);
  const underFairOdd = underIP / (underIP + FavIP);
  const fav = ((favFairOdd * 100) / underFairOdd) * -1;
  const under = 100 / underFairOdd - 100;
  return {
    favourite: Math.round(fav),
    underdog: Math.round(under),
  };
};

const createBet = async (loggedInUserId: number, data: ICreateBetRequest) => {
  let isConfirmed: boolean = false;
  isConfirmed = data.isConfirmed;
  if (data.opponentUserId === loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.SELECT_DIFFERENT_OPPONENT_USER
    );
  }

  const userData: any = await axiosPostMicro(
    {
      ids: [data.opponentUserId],
    },
    `${config.authServerUrl}/users/getBulk`,
    ""
  );
  if (userData && userData.data.data.length == 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.OPPONENT_USER_NOT_FOUND
    );
  }
  // check wallet Balance
  const resp = await axiosGetMicro(
    `${config.authServerUrl}/wallet/checkBalance`,
    {
      userId: loggedInUserId,
      requestAmount: parseFloat(data.amount.toFixed(2)),
    },
    ""
  );
  const betRequestUserDataFound = await Bet.findOne({
    isDeleted: false,
    status: {
      $ne: "REJECTED",
    },
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    requestUserBetAmount: parseFloat(data.amount.toFixed(2)),
    requestUserGoalServeOdd: data.requestUserGoalServeOdd,
    goalServeMatchId: data.goalServeMatchId,
  }).lean();
  if (betRequestUserDataFound && isConfirmed === false) {
    return { isDuplicate: true };
  }
  const betOpponentUserDataFound = await Bet.findOne({
    isDeleted: false,
    status: {
      $ne: "REJECTED",
    },
    opponentUserId: loggedInUserId,
    requestUserId: data.opponentUserId,
    opponentUserBetAmount: parseFloat(data.amount.toFixed(2)),
    opponentUserGoalServeOdd: data.opponentUserGoalServeOdd,
    goalServeMatchId: data.goalServeMatchId,
  }).lean();

  if (betOpponentUserDataFound && isConfirmed === false) {
    return { isDuplicate: true };
  }
  if (data.amount < 1) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.BET_AMOUNT_MUST_BE_GREATER_THAN_EQUALS_1
    );
  }
  let matchData;
  if (data.leagueType === "MLB") {
    matchData = await Match.findOne({
      goalServeMatchId: data.goalServeMatchId,
      status: "Not Started",
    }).lean();
  } else if (data.leagueType === "NFL") {
    matchData = await NflMatch.findOne({
      goalServeMatchId: data.goalServeMatchId,
      status: "Not Started",
    }).lean();
  } else if (data.leagueType === "NCAAF") {
    matchData = await NcaafMatch.findOne({
      goalServeMatchId: data.goalServeMatchId,
      status: "Not Started",
    }).lean();
  } else {
    matchData = await NbaMatch.findOne({
      goalServeMatchId: data.goalServeMatchId,
      status: "Not Started",
    }).lean();
  }

  if (!matchData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.MATCH_DATA_NOT_FOUND);
  }

  if (
    matchData.goalServeHomeTeamId != data.goalServeRequestUserTeamId &&
    matchData.goalServeAwayTeamId != data.goalServeRequestUserTeamId
  ) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.TEAM_NOT_FOUND_IN_MATCH);
  }

  let preparedBetObject = {
    goalServeMatchId: data.goalServeMatchId,
    requestUserId: loggedInUserId,
    leagueType: data.leagueType,
    oddType: data.oddType,
    opponentUserId: data.opponentUserId,
    goalServeLeagueId: data.goalServeLeagueId,
    goalServeRequestUserTeamId: data.goalServeRequestUserTeamId,
    goalServeOpponentUserTeamId: data.goalServeOpponentUserTeamId,
    requestUserGoalServeOdd: data.requestUserGoalServeOdd,
    opponentUserGoalServeOdd: data.opponentUserGoalServeOdd,
    requestUserFairOdds: data.requestUserFairOdds
      ? data.requestUserFairOdds
      : 0,
    opponentUserFairOdds: data.opponentUserFairOdds
      ? data.opponentUserFairOdds
      : 0,
    requestUserBetAmount: parseFloat(data.amount.toFixed(2)),
    opponentUserBetAmount: parseFloat(data.amount.toFixed(2)),
    betTotalAmount: parseFloat((data.amount * 2).toFixed(2)),
  };
  if (data.oddType === "Moneyline") {
    const winAmountRequestUser = winAmountCalculationUsingOdd(
      preparedBetObject.requestUserBetAmount,
      preparedBetObject.requestUserFairOdds
    );
    preparedBetObject.opponentUserBetAmount = parseFloat(
      winAmountRequestUser.toFixed(2)
    );
    preparedBetObject.betTotalAmount =
      preparedBetObject.requestUserBetAmount +
      preparedBetObject.opponentUserBetAmount;
  }
  preparedBetObject.betTotalAmount = parseFloat(
    preparedBetObject.betTotalAmount.toFixed(2)
  );
  const createBet = await Bet.create(preparedBetObject);
  const createdBet = await Bet.findOne({
    _id: createBet._id,
  });
  if (createdBet) {
    const resp = await axiosPostMicro(
      {
        amount: parseFloat((data?.amount).toFixed(2)),
        userId: createdBet.requestUserId,
        betData: createdBet,
      },
      `${config.authServerUrl}/wallet/deduct`,
      ""
    );
  }
  await Notification.create({
    fromUserId: loggedInUserId,
    toUserId: data.opponentUserId,
    betId: createBet._id,
  });
  pushNotification(data.opponentUserId);
  await socketService.socket("bet", {
    createdBet,
  });
  return createdBet;
};

const responseBet = async (
  id: string,
  loggedInUserId: number,
  isConfirmed: boolean
) => {
  const betData = await Bet.findOne({
    isDeleted: false,
    _id: id,
  }).lean();

  if (isConfirmed == true && betData) {
    const resp = await axiosGetMicro(
      `${config.authServerUrl}/wallet/checkBalance`,
      {
        userId: loggedInUserId,
        requestAmount: betData?.opponentUserBetAmount,
      },
      ""
    );
  }

  if (!betData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  if (betData.opponentUserId !== loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.YOU_CAN_NOT_RESPONSE_TO_THIS_BET
    );
  }
  if (betData.status !== betStatus.PENDING) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.PENDING
    );
  }
  let prepareObject = {
    status: isConfirmed ? betStatus.CONFIRMED : betStatus.REJECTED,
    responseAt: new Date(),
  };

  const updateBet = await Bet.updateOne(
    {
      _id: id,
    },
    prepareObject
  );

  const responseBet = await Bet.findOne({
    _id: id,
  }).lean();

  if (updateBet && isConfirmed == false) {
    const resp = await axiosPostMicro(
      {
        amount: responseBet?.requestUserBetAmount,
        userId: responseBet?.requestUserId,
        betData: responseBet,
      },
      `${config.authServerUrl}/wallet/revertAmount`,
      ""
    );

    // notify
    if (betData) {
      await Notification.create({
        fromUserId: betData.opponentUserId,
        toUserId: betData.requestUserId,
        betId: id,
      });
      pushNotification(betData?.requestUserId);
    }
  }
  if (updateBet && isConfirmed == true) {
    const resp = await axiosPostMicro(
      {
        amount: responseBet?.opponentUserBetAmount,
        userId: responseBet?.opponentUserId,
        betData: responseBet,
      },
      `${config.authServerUrl}/wallet/deduct`,
      ""
    );
    // notify
    if (betData) {
      await Notification.create({
        fromUserId: betData.opponentUserId,
        toUserId: betData.requestUserId,
        betId: id,
      });
      pushNotification(betData?.requestUserId);
    }
  }
  return responseBet;
};

const deleteBet = async (loggedInUserId: number, id: string) => {
  const betData = await Bet.findOne({
    isDeleted: false,
    _id: id,
    status: betStatus.PENDING,
    $or: [
      { requestUserId: loggedInUserId },
      { opponentUserId: loggedInUserId },
    ],
  });

  if (!betData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  const updateBet = await Bet.updateOne(
    {
      _id: id,
      status: betStatus.PENDING,
      $or: [
        { requestUserId: loggedInUserId },
        { opponentUserId: loggedInUserId },
      ],
    },
    {
      isDeleted: true,
    }
  );
  if (updateBet) {
    const resp = await axiosPostMicro(
      {
        amount: betData?.requestUserBetAmount,
        userId: betData?.requestUserId,
        betData: betData,
      },
      `${config.authServerUrl}/wallet/revertAmount`,
      ""
    );
  }

  return true;
};

const updateBetRequest = async (
  id: string,
  loggedInUserId: number,
  amount: number
) => {
  const betData = await Bet.findOne({
    _id: id,
  }).lean();
  if (!betData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  if (
    betData.opponentUserId !== loggedInUserId &&
    betData.requestUserId !== loggedInUserId
  ) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.YOU_CAN_NOT_RESPONSE_TO_THIS_BET
    );
  }
  if (betData.status !== betStatus.PENDING) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.PENDING
    );
  }
  if (
    betData.requestUserId === loggedInUserId &&
    betData.isRequestUserConfirmedBet === false
  ) {
    await Bet.updateOne(
      {
        _id: id,
      },
      {
        betAmount: amount,
        isRequestUserConfirmedBet: true,
        isOpponentUserConfirmedBet: false,
      }
    );
  } else if (
    betData.opponentUserId === loggedInUserId &&
    betData.isOpponentUserConfirmedBet === false
  ) {
    await Bet.updateOne(
      {
        _id: id,
      },
      {
        betAmount: amount,
        isRequestUserConfirmedBet: false,
        isOpponentUserConfirmedBet: true,
      }
    );
  } else {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ALREADY_CONFIRMED_BET
    );
  }
  const responsedBetData = await Bet.findOne({
    _id: id,
  }).lean();
  return responsedBetData;
};

const resultBet = async (id: string, winTeamId: number) => {
  const condition = {
    _id: id,
  };
  const betData = await Bet.findOne(condition).lean();
  if (!betData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  if (betData.status !== betStatus.CONFIRMED) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.CONFIRMED
    );
  }
  const matchData = await Match.findOne({
    goalServeMatchId: betData.goalServeMatchId,
  }).lean();
  if (!matchData) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.MATCH_DATA_NOT_FOUND
    );
  }
  if (
    matchData.goalServeHomeTeamId !== winTeamId &&
    winTeamId !== matchData.goalServeAwayTeamId
  ) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.TEAM_NOT_FOUND_IN_MATCH);
  }

  let isRequestUserWinAmount = false;
  let isOpponentUserWinAmount = false;
  let resultAmountRequestUser = 0 - betData.betAmount;
  let resultAmountOpponentUser = 0 - betData.betAmount;
  if (betData.goalServeRequestUserTeamId === winTeamId) {
    isRequestUserWinAmount = true;
    resultAmountRequestUser = betData.betAmount * 2;
  } else {
    isOpponentUserWinAmount = true;
    resultAmountOpponentUser = betData.betAmount * 2;
  }
  await Bet.updateOne(condition, {
    status: betStatus.RESULT_DECLARED,
    goalServeWinTeamId: winTeamId,
    isRequestUserWinAmount: isRequestUserWinAmount,
    isOpponentUserWinAmount: isOpponentUserWinAmount,
    resultAmountRequestUser: resultAmountRequestUser,
    resultAmountOpponentUser: resultAmountOpponentUser,
    resultAt: new Date(),
  });
  const updatedData = await Bet.findOne(condition).lean();
  return updatedData;
};

const declareResultMatch = async (
  matchId: number,
  winTeamId: number,
  leagueType: string
) => {
  await Bet.updateMany(
    {
      goalServeMatchId: matchId,
      status: betStatus.ACTIVE,
      leagueType: leagueType,
    },
    {
      status: betStatus.RESULT_DECLARED,
      goalServeWinTeamId: winTeamId,
      resultAt: new Date(),
    }
  );
};

const getResultBet = async (loggedInUserId: number, betId: string) => {
  const betData = await Bet.findOne({
    _id: betId,
  }).lean();
  if (betData && betData.opponentUserId === loggedInUserId) {
    if (betData.isOpponentUserWinAmount) {
      return {
        win: true,
        winAmount: betData.resultAmountOpponentUser,
        data: betData,
      };
    } else {
      return {
        win: false,
        loseAmount: betData.resultAmountOpponentUser,
        data: betData,
      };
    }
  } else if (betData && betData.requestUserId === loggedInUserId) {
    if (betData.isRequestUserWinAmount) {
      return {
        win: true,
        winAmount: betData.resultAmountRequestUser,
        data: betData,
      };
    } else {
      return {
        win: false,
        loseAmount: betData.resultAmountRequestUser,
        data: betData,
      };
    }
  } else {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
};

const resultBetVerified = async (
  loggedInUserId: number,
  betId: string,
  isSatisfied: Boolean
) => {
  const betData = await Bet.findOne({
    _id: betId,
  });
  if (!betData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  if (betData.status !== betStatus.RESULT_DECLARED) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.RESULT_DECLARED
    );
  }
  let status: betStatus = betData.status;
  if (betData.opponentUserId == loggedInUserId) {
    if (betData.isOpponentUserResultSatisfied != null) {
      throw new AppError(httpStatus.NOT_FOUND, Messages.ALREADY_RESPOND);
    }
    if (betData.isRequestUserResultSatisfied != null) {
      status =
        betData.isRequestUserResultSatisfied && isSatisfied
          ? betStatus.COMPLETED
          : betStatus.RESULT_NOT_SATISFIED;
    }
    await Bet.updateOne(
      {
        _id: betId,
      },
      {
        isOpponentUserResultSatisfied: isSatisfied ? true : false,
        status: status,
      }
    );
  } else if (betData.requestUserId === loggedInUserId) {
    if (betData.isRequestUserResultSatisfied != null) {
      throw new AppError(httpStatus.NOT_FOUND, Messages.ALREADY_RESPOND);
    }
    if (betData.isOpponentUserResultSatisfied !== null) {
      status =
        betData.isOpponentUserResultSatisfied && isSatisfied
          ? betStatus.COMPLETED
          : betStatus.RESULT_NOT_SATISFIED;
    }
    await Bet.updateOne(
      {
        _id: betId,
      },
      {
        isRequestUserResultSatisfied: isSatisfied ? true : false,
        status: status,
      }
    );
  } else {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  return await Bet.findOne({
    _id: betId,
  }).lean();
};

const listBetsByStatus = async (loggedInUserId: number, status: string) => {
  const data = await Bet.aggregate([
    {
      $match: {
        status: status,
        $or: [
          { requestUserId: loggedInUserId },
          { opponentUserId: loggedInUserId },
        ],
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeRequestUserTeamId",
        foreignField: "goalServeTeamId",
        as: "goalServeRequestUserTeam",
      },
    },
    {
      $unwind: {
        path: "$goalServeRequestUserTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeOpponentUserTeamId",
        foreignField: "goalServeTeamId",
        as: "goalServeOpponentUserTeam",
      },
    },
    {
      $unwind: {
        path: "$goalServeOpponentUserTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);
  if (data && data.length == 0) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  return data;
};

const listBetsByType = async (
  loggedInUserId: number,
  body: IlistBetRequestData,
  token: string | ""
) => {
  let page = 1;
  let limit = body.size ?? 10;
  if (body.page) {
    page = body.page;
  }
  let skip = limit * (page - 1);
  let condition: any = {
    isDeleted: false,
    $and: [
      {
        $or: [
          { requestUserId: loggedInUserId },
          { opponentUserId: loggedInUserId },
        ],
      },
    ],
  };

  let query: any = [];
  if (body.type === "OPEN") {
    condition.status = "PENDING";
    query.push(
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  } else if (body.type === "ACTIVE") {
    condition["$and"].push({
      $or: [{ status: "CONFIRMED" }, { status: "ACTIVE" }],
    });
    query.push(
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  } else if (body.type === "SETTLED") {
    condition.status = "RESULT_DECLARED";
    query.push(
      {
        $match: condition,
      },
      {
        $addFields: {
          isWon: {
            $cond: {
              if: {
                $eq: ["$goalServeWinTeamId", "$goalServeRequestUserTeamId"],
              },
              then: { $eq: ["$requestUserId", loggedInUserId] },
              else: { $eq: ["$opponentUserId", loggedInUserId] },
            },
          },
        },
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  } else if (body.type === "WON") {
    condition.status = "RESULT_DECLARED";
    query.push(
      {
        $match: condition,
      },
      {
        $addFields: {
          isWon: {
            $cond: {
              if: {
                $eq: ["$goalServeWinTeamId", "$goalServeRequestUserTeamId"],
              },
              then: { $eq: ["$requestUserId", loggedInUserId] },
              else: { $eq: ["$opponentUserId", loggedInUserId] },
            },
          },
        },
      },
      {
        $match: {
          isWon: true,
        },
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  } else if (body.type === "LOST") {
    condition.status = "RESULT_DECLARED";
    query.push(
      {
        $match: condition,
      },
      {
        $addFields: {
          isWon: {
            $cond: {
              if: {
                $eq: ["$goalServeWinTeamId", "$goalServeRequestUserTeamId"],
              },
              then: { $eq: ["$requestUserId", loggedInUserId] },
              else: { $eq: ["$opponentUserId", loggedInUserId] },
            },
          },
        },
      },
      {
        $match: {
          isWon: false,
        },
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  } else {
    condition.status = {
      $nin: ["REJECTED", "EXPIRED", "CANCELED"],
    };
    query.push(
      {
        $match: condition,
      },
      {
        $addFields: {
          isWon: {
            $cond: {
              if: {
                $eq: ["$goalServeWinTeamId", "$goalServeRequestUserTeamId"],
              },
              then: { $eq: ["$requestUserId", loggedInUserId] },
              else: { $eq: ["$opponentUserId", loggedInUserId] },
            },
          },
        },
      },
      {
        $lookup: {
          from: "betlikes",
          let: {
            id: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$betId", "$$id"],
                    },
                    {
                      $eq: ["$isBetLike", true],
                    },
                  ],
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          loggedInUserLiked: {
            $in: [loggedInUserId, "$likes.betLikedUserId"],
          },
          likeCount: { $size: "$likes" },
        },
      }
    );
  }
  let countQuery: Array<any> = Array.from(query);
  countQuery.push({
    $facet: {
      count: [
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
          },
        },
      ],
    },
  });
  const count = await Bet.aggregate(countQuery);
  query.push(
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $facet: {
        mlbData: [
          {
            $match: {
              leagueType: "MLB",
            },
          },
          {
            $lookup: {
              from: "matches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "teamImages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      //added standing
                      {
                        $lookup: {
                          from: "standings",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$homeTeamId"],
                                },
                              },
                            },
                          ],
                          as: "homeTeamStanding",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: {
                            $arrayElemAt: ["$homeTeamStanding.won", 0],
                          },
                          lost: {
                            $arrayElemAt: ["$homeTeamStanding.lost", 0],
                          },
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "teamImages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      //added standing
                      {
                        $lookup: {
                          from: "standings",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$awayTeamId"],
                                },
                              },
                            },
                          ],
                          as: "awayTeamStanding",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: {
                            $arrayElemAt: ["$awayTeamStanding.won", 0],
                          },
                          lost: {
                            $arrayElemAt: ["$awayTeamStanding.lost", 0],
                          },
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                  
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"mlb",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        nflData: [
          {
            $match: {
              leagueType: "NFL",
            },
          },
          {
            $lookup: {
              from: "nflmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "nflteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nflteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "nflteams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nflteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"nfl",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        nhlData: [
          {
            $match: {
              leagueType: "NHL",
            },
          },
          {
            $lookup: {
              from: "nhlmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "nhlteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nhlteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nhlteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"nhl",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        ncaafData: [
          {
            $match: {
              leagueType: "NCAAF",
            },
          },
          {
            $lookup: {
              from: "ncaafmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "ncaafteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "ncaafteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: "$locality",
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "ncaafteams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "ncaafteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: "$locality",
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"ncaaf",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
      },
    },
    {
      $project: {
        root: { $concatArrays: ["$mlbData", "$nflData", "$ncaafData"] },
      },
    },
    { $unwind: "$root" },
    { $replaceRoot: { newRoot: "$root" } },
    {
      $unwind: {
        path: "$match",
        preserveNullAndEmptyArrays: true,
      },
    },
    // {
    //   $sort: body.sortBy,
    // },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        goalServeMatchId: 1,
        requestUserId: 1,
        opponentUserId: 1,
        isSquared: { $ifNull: ["$isSquared", false] },
        betTotalAmount: { $round: ["$betTotalAmount", 2] },
        requestUserBetAmount: { $round: ["$requestUserBetAmount", 2] },
        opponentUserBetAmount: { $round: ["$opponentUserBetAmount", 2] },
        oddType: 1,
        likeCount: 1,
        loggedInUserLiked: 1,
        goalServeLeagueId: 1,
        goalServeRequestUserTeamId: 1,
        goalServeOpponentUserTeamId: 1,
        isRequestUserWinAmount: 1,
        isOpponentUserWinAmount: 1,
        requestUserFairOdds: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$requestUserFairOdds" }, 0] },
                { $concat: ["+", { $toString: "$requestUserFairOdds" }] },
                { $toString: "$requestUserFairOdds" },
              ],
            },
            { $toString: "$requestUserFairOdds" },
          ],
        },
        opponentUserFairOdds: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$opponentUserFairOdds" }, 0] },
                { $concat: ["+", { $toString: "$opponentUserFairOdds" }] },
                { $toString: "$opponentUserFairOdds" },
              ],
            },
            { $toString: "$opponentUserFairOdds" },
          ],
        },
        requestUserGoalServeOdd: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$requestUserGoalServeOdd" }, 0] },
                { $toString: "$requestUserGoalServeOdd" },
                { $toString: "$requestUserGoalServeOdd" },
              ],
            },
            { $toString: "$requestUserGoalServeOdd" },
          ],
        },
        opponentUserGoalServeOdd: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$opponentUserGoalServeOdd" }, 0] },
                { $toString: "$opponentUserGoalServeOdd" },
                { $toString: "$opponentUserGoalServeOdd" },
              ],
            },
            { $toString: "$opponentUserGoalServeOdd" },
          ],
        },
        leagueType: 1,
        status: 1,
        paymentStatus: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
        responseAt: 1,
        goalServeWinTeamId: 1,
        resultAt: 1,
        isWon: 1,
        match: 1,
        requestUser: 1,
        opponentUser: 1,
        displayStatus: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$status", "CONFIRMED"] },
                then: "ACTIVE",
              },
              {
                case: {
                  $and: [
                    { $eq: ["$status", "RESULT_DECLARED"] },
                    { $eq: ["$isWon", true] },
                  ],
                },
                then: "WON",
              },
              {
                case: {
                  $and: [
                    { $eq: ["$status", "RESULT_DECLARED"] },
                    { $eq: ["$isWon", false] },
                  ],
                },
                then: "LOST",
              },
            ],
            default: "$status",
          },
        },
      },
    }
  );
  let data = await Bet.aggregate(query);
  if (data && data.length > 0) {
    const ids = [
      ...new Set(
        data.map((item) => [item.requestUserId, item.opponentUserId]).flat()
      ),
    ];
    const resp = await axiosPostMicro(
      {
        ids,
      },
      `${config.authServerUrl}/users/getBulk`,
      ""
    );
    const bindedObject: any = data.map(
      (item: { requestUserId: number; opponentUserId: number }) => {
        const requestUser = resp.data.data.find(
          (user: { id: number }) => user.id == item.requestUserId
        );
        const opponentUser = resp.data.data.find(
          (user: { id: number }) => user.id == item.opponentUserId
        );
        return {
          ...item,
          requestUser,
          opponentUser,
        };
      }
    );
    return { list: bindedObject, count: count[0]?.count[0]?.count ?? 0 };
  }
  return { list: data, count: count[0]?.count[0]?.count ?? 0 };
};

const listBetsDashboard = async (body: IlistBetRequestData) => {
  let page = 1;
  let limit = body.size ?? 10;
  if (body.page) {
    page = body.page;
  }
  let skip = limit * (page - 1);
  let condition: any = {
    isDeleted: false,
    $or: [
      { status: "CONFIRMED" },
      { status: "ACTIVE" },
      { status: "RESULT_DECLARED" },
    ],
  };

  let query: any = [];

  query.push(
    {
      $match: condition,
    },
    {
      $lookup: {
        from: "betlikes",
        let: {
          id: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$betId", "$$id"],
                  },
                  {
                    $eq: ["$isBetLike", true],
                  },
                ],
              },
            },
          },
        ],
        as: "likes",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
      },
    }
  );

  let countQuery: Array<any> = Array.from(query);
  countQuery.push({
    $facet: {
      count: [
        {
          $group: {
            _id: null,
            count: {
              $sum: 1,
            },
          },
        },
      ],
    },
  });
  const count = await Bet.aggregate(countQuery);
  query.push(
    {
      $addFields: {
        isWon: {
          $cond: {
            if: {
              $eq: ["$goalServeWinTeamId", "$goalServeRequestUserTeamId"],
            },
            then: "$requestUserId",
            else: "$opponentUserId",
          },
        },
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $facet: {
        mlbData: [
          {
            $match: {
              leagueType: "MLB",
            },
          },
          {
            $lookup: {
              from: "matches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "teamImages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      //added standing
                      {
                        $lookup: {
                          from: "standings",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$homeTeamId"],
                                },
                              },
                            },
                          ],
                          as: "homeTeamStanding",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: {
                            $arrayElemAt: ["$homeTeamStanding.won", 0],
                          },
                          lost: {
                            $arrayElemAt: ["$homeTeamStanding.lost", 0],
                          },
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "teamImages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      //added standing
                      {
                        $lookup: {
                          from: "standings",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$awayTeamId"],
                                },
                              },
                            },
                          ],
                          as: "awayTeamStanding",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: {
                            $arrayElemAt: ["$awayTeamStanding.won", 0],
                          },
                          lost: {
                            $arrayElemAt: ["$awayTeamStanding.lost", 0],
                          },
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"mlb",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        nflData: [
          {
            $match: {
              leagueType: "NFL",
            },
          },
          {
            $lookup: {
              from: "nflmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "nflteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nflteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "nflteams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nflteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"nfl",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        nhlData: [
          {
            $match: {
              leagueType: "NHL",
            },
          },
          {
            $lookup: {
              from: "nhlmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "nhlteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nhlteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "teams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "nhlteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: 1,
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"nhl",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
        ncaafData: [
          {
            $match: {
              leagueType: "NCAAF",
            },
          },
          {
            $lookup: {
              from: "ncaafmatches",
              let: {
                matchId: "$goalServeMatchId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeMatchId", "$$matchId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "ncaafteams",
                    let: {
                      homeTeamId: "$goalServeHomeTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$homeTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "ncaafteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: "$locality",
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "homeTeam",
                  },
                },
                {
                  $lookup: {
                    from: "ncaafteams",
                    let: {
                      awayTeamId: "$goalServeAwayTeamId",
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ["$goalServeTeamId", "$$awayTeamId"],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "ncaafteamimages",
                          let: {
                            teamId: "$goalServeTeamId",
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ["$goalServeTeamId", "$$teamId"],
                                },
                              },
                            },
                          ],
                          as: "teamImages",
                        },
                      },
                      {
                        $project: {
                          name: 1,
                          teamImages: {
                            $arrayElemAt: ["$teamImages.image", 0],
                          },
                          abbreviation: "$locality",
                          won: 1,
                          lost: 1,
                          _id: 1,
                        },
                      },
                    ],
                    as: "awayTeam",
                  },
                },
                {
                  $project: {
                    goalServeLeagueId: 1,
                    goalServeMatchId: 1,
                    awayTeamId: 1,
                    awayTeam: { $arrayElemAt: ["$awayTeam", 0] },
                    homeTeam: { $arrayElemAt: ["$homeTeam", 0] },
                    goalServeAwayTeamId: 1,
                    homeTeamId: 1,
                    goalServeHomeTeamId: 1,
                    dateTimeUtc: 1,
                    formattedDate: 1,
                    status: 1,
                    awayTeamTotalScore: 1,
                    homeTeamTotalScore: 1,
                    time: 1,
                    homeTeamHit: 1,
                    homeTeamError: 1,
                    awayTeamHit: 1,
                    awayTeamError: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    attendance: 1,
                    date: 1,
                    outs: 1,
                    timezone: 1,
                    league:"ncaaf",
                    _id: 1,
                  },
                },
              ],
              as: "match",
            },
          },
        ],
      },
    },
    {
      $project: {
        root: { $concatArrays: ["$mlbData", "$nflData", "$ncaafData"] },
      },
    },
    { $unwind: "$root" },
    { $replaceRoot: { newRoot: "$root" } },
    {
      $unwind: {
        path: "$match",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        goalServeMatchId: 1,
        requestUserId: 1,
        opponentUserId: 1,
        isSquared: { $ifNull: ["$isSquared", false] },
        betTotalAmount: { $round: ["$betTotalAmount", 2] },
        requestUserBetAmount: { $round: ["$requestUserBetAmount", 2] },
        opponentUserBetAmount: { $round: ["$opponentUserBetAmount", 2] },
        oddType: 1,
        likeCount: 1,
        goalServeLeagueId: 1,
        goalServeRequestUserTeamId: 1,
        goalServeOpponentUserTeamId: 1,
        isRequestUserWinAmount: 1,
        isOpponentUserWinAmount: 1,
        requestUserFairOdds: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$requestUserFairOdds" }, 0] },
                { $concat: ["+", { $toString: "$requestUserFairOdds" }] },
                { $toString: "$requestUserFairOdds" },
              ],
            },
            { $toString: "$requestUserFairOdds" },
          ],
        },
        opponentUserFairOdds: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$opponentUserFairOdds" }, 0] },
                { $concat: ["+", { $toString: "$opponentUserFairOdds" }] },
                { $toString: "$opponentUserFairOdds" },
              ],
            },
            { $toString: "$opponentUserFairOdds" },
          ],
        },
        requestUserGoalServeOdd: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$requestUserGoalServeOdd" }, 0] },
                { $toString: "$requestUserGoalServeOdd" },
                { $toString: "$requestUserGoalServeOdd" },
              ],
            },
            { $toString: "$requestUserGoalServeOdd" },
          ],
        },
        opponentUserGoalServeOdd: {
          $cond: [
            { $ne: ["$oddType", "Total"] }, // Check if oddType is not equal to "Total"
            {
              $cond: [
                { $gte: [{ $toDouble: "$opponentUserGoalServeOdd" }, 0] },
                { $toString: "$opponentUserGoalServeOdd" },
                { $toString: "$opponentUserGoalServeOdd" },
              ],
            },
            { $toString: "$opponentUserGoalServeOdd" },
          ],
        },
        leagueType: 1,
        status: 1,
        paymentStatus: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
        responseAt: 1,
        goalServeWinTeamId: 1,
        resultAt: 1,
        isWon: 1,
        match: 1,
        requestUser: 1,
        opponentUser: 1,
        displayStatus: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$status", "CONFIRMED"] },
                then: "ACTIVE",
              },
              {
                case: { $eq: ["$status", "RESULT_DECLARED"] },
                then: "FINAL",
              },
            ],
            default: "$status",
          },
        },
      },
    }
  );
  let data = await Bet.aggregate(query);
  if (data && data.length > 0) {
    const ids = [
      ...new Set(
        data.map((item) => [item.requestUserId, item.opponentUserId]).flat()
      ),
    ];
    const resp = await axiosPostMicro(
      {
        ids,
      },
      `${config.authServerUrl}/users/getBulk`,
      ""
    );
    const bindedObject: any = data.map(
      (item: { requestUserId: number; opponentUserId: number }) => {
        const requestUser = resp.data.data.find(
          (user: { id: number }) => user.id == item.requestUserId
        );
        const opponentUser = resp.data.data.find(
          (user: { id: number }) => user.id == item.opponentUserId
        );
        return {
          ...item,
          requestUser,
          opponentUser,
        };
      }
    );
    return { list: bindedObject, count: count[0]?.count[0]?.count ?? 0 };
  }
  return { list: data, count: count[0]?.count[0]?.count ?? 0 };
};

const getBetUser = async (userId: number) => {
  const allApponentUser = await Bet.find({ requestUserId: userId }).sort({
    updatedAt: -1,
  });
  const opponentCount: IOpponentCount = {};
  for (const item of allApponentUser) {
    const { opponentUserId } = item;
    if (opponentCount[opponentUserId]) {
      opponentCount[opponentUserId]++;
    } else {
      opponentCount[opponentUserId] = 1;
    }
  }
  const result = Object.entries(opponentCount).map(
    ([opponentUserId, count]) => ({
      opponentUserId: parseInt(opponentUserId),
      count,
    })
  );
  result.sort((a: any, b: any) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    } else {
      const lastBetA: any = allApponentUser.find(
        (bet) => bet.opponentUserId === a.opponentUserId
      );
      const lastBetB: any = allApponentUser.find(
        (bet) => bet.opponentUserId === b.opponentUserId
      );
      return lastBetB.updatedAt - lastBetA.updatedAt;
    }
  });
  const top5Opponents = result
    .slice(0, 5)
    .map((item: IOpponentCount) => item.opponentUserId);
  return top5Opponents;
};

const pushNotification = async (userId: number) => {
  const unseenNotification = await Notification.find({
    toUserId: userId,
    seen: false,
  });

  await socketService.notficationSocket("notify", userId, {
    notifications: unseenNotification.length,
  });
};
const readNotification = async (userId: number) => {
  if (userId) {
    const data = await Notification.updateMany(
      {
        toUserId: userId,
        seen: false,
      },
      {
        $set: {
          seen: true,
          readAt: new Date(),
        },
      },
      {
        multi: true,
      }
    );
    await socketService.notficationSocket("notify", userId, {
      notifications: 0,
    });
  }
};

const likeBet = async (userId: number, betData: IBetData) => {
  const bet = await Bet.findOne({
    _id: betData.betId,
  }).lean();
  if (!bet) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  await BetLike.updateOne(
    {
      goalServeMatchId: bet.goalServeMatchId,
      betId: betData.betId,
      betLikedUserId: userId,
    },
    {
      $set: {
        opponentUserId: bet.opponentUserId,
        requestUserId: bet.requestUserId,
        isBetLike: betData.isBetLike,
      },
    },
    { upsert: true }
  );
  const betLikedResponse = await Bet.aggregate([
    { $match: { _id: bet._id } },
    { $limit: 1 },
    {
      $lookup: {
        from: "betlikes",
        let: {
          id: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$betId", "$$id"],
                  },
                  {
                    $eq: ["$isBetLike", true],
                  },
                ],
              },
            },
          },
        ],
        as: "likes",
      },
    },
    {
      $addFields: {
        loggedInUserLiked: {
          $in: [userId, "$likes.betLikedUserId"],
        },
        likeCount: { $size: "$likes" },
      },
    },
    {
      $project: {
        _id: 1,
        likeCount: 1,
        loggedInUserLiked: 1,
      },
    },
  ]);
  return betLikedResponse[0];
};

const betSettledUpdate = async (userId: number, betData: IBetSquared) => {
  const bet = await Bet.findOne({
    _id: betData.betId,
  }).lean();
  if (!bet) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  if (
    (userId === bet.requestUserId &&
      bet?.goalServeWinTeamId === bet.goalServeRequestUserTeamId) ||
    (userId === bet.opponentUserId &&
      bet?.goalServeWinTeamId === bet.goalServeOpponentUserTeamId)
  ) {
    await Bet.updateOne(
      {
        goalServeMatchId: bet.goalServeMatchId,
        _id: betData.betId,
      },
      {
        $set: {
          squaredUser: userId,
          isSquared: betData.isSquaredBet,
        },
      }
    );
    const betSettledResponse = await Bet.aggregate([
      { $match: { _id: bet._id } },
      {
        $project: {
          _id: 1,
          isSquared: { $ifNull: ["$isSquared", false] },
        },
      },
    ]);
    return betSettledResponse[0];
  } else {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.YOU_CAN_NOT_RESPONSE_TO_THIS_BET
    );
  }
};
export default {
  getBetUser,
  listBetsByStatus,
  resultBetVerified,
  getResultBet,
  responseBet,
  deleteBet,
  resultBet,
  createBet,
  updateBetRequest,
  declareResultMatch,
  listBetsByType,
  readNotification,
  pushNotification,
  likeBet,
  betSettledUpdate,
  listBetsDashboard,
};
