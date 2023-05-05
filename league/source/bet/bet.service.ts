import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/match.model";
import MatchOdd from "../models/documents/matchOdd.model";
import AppError from "../utils/AppError";
import { ICreateBetRequest, IresponseBetRequest } from "./bet.interface";
import Messages from "../utils/messages";

const betWinAmountCalculationUsingOdd = function (amount: number, odd: number) {
  if (odd < 0) {
    if (amount >= Math.abs(odd)) {
      return amount + (amount + 100 - (Math.abs(odd)))
    } else {
      return amount + ((amount * 100) / (Math.abs(odd)))
    }
  } else {
    return ((amount - 100) + (Math.abs(odd)) + amount)
  }
}
const createBet = async (loggedInUserId: number, data: ICreateBetRequest) => {
  if (data.opponentUserId === loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.SELECT_DIFFERENT_OPPONENT_USER
    );
  }
  const betFound = await Bet.find({
    $or: [
      { requestUserId: loggedInUserId },
      { opponentUserId: loggedInUserId },
    ],
    matchId: data.matchId,
  });

  if (betFound && betFound.length > 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ALREADY_APPLIED_ON_MATCH
    )
  }

  if (data.amount <= 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.AMOUNT_GREATER_THAN + '0'
    );
  }
  const matchData = await Match.findOne({
    _id: data.matchId
  }).lean();

  if (!matchData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.MATCH_DATA_NOT_FOUND
    );
  }
  if (matchData.sportsType !== data.sportsType) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.MATCH_DATA_NOT_FOUND
    );
  }

  if (matchData.localTeamId != data.requestUserTeamId && matchData.awayTeamId != data.requestUserTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.TEAM_NOT_FOUND_IN_MATCH
    );
  }

  const matchOddsData = await MatchOdd.findOne({
    matchId: data.matchId
  }).sort({ createdAt: 'desc' }).populate([
    { path: "localTeamId" },
    { path: "awayTeamId" },
    { path: "matchId" }
  ]).lean();

  if (!matchOddsData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.MATCH_ODD_DATA_NOT_FOUND
    );
  }

  let minumumBetAmount = 0;
  if (data.requestUserTeamId == matchOddsData.localTeamId._id) {
    minumumBetAmount = matchOddsData.localTeamOdd > 0 ? matchOddsData.localTeamOdd : 0
  } else {
    minumumBetAmount = matchOddsData.awayTeamOdd > 0 ? matchOddsData.localTeamOdd : 0
  }

  if (data.amount <= minumumBetAmount) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.AMOUNT_GREATER_THAN + minumumBetAmount
    );
  }

  const preparedBetObject = {
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    requestUserAmount: data.amount,
    sportsType: data.sportsType,
    requestUserTeamId: data.requestUserTeamId,
    matchId: data.matchId,
    matchEventId: matchOddsData.matchId.matchEventId,
    matchOddsId: matchOddsData._id,
    requestUserOdds: (matchOddsData.localTeamId._id == data.requestUserTeamId ? matchOddsData.localTeamOdd : matchOddsData.awayTeamOdd),
  };
  const createBet = await Bet.create(preparedBetObject);

  const createdBet = await Bet.findOne({
    _id: createBet._id
  }).populate([
    { path: "requestUserTeamId", select: "_id name sortName" },
    { path: "matchEventId", select: "_id name sortName" },
    { path: "matchId" },
    { path: "matchOddsId" }
  ]);
  return createdBet;
};

const responseBet = async (id: string, loggedInUserId: number, data: IresponseBetRequest) => {

  const BetData = await Bet.findOne({
    _id: id
  }
  ).populate("matchOddsId").lean();
  if (!BetData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (BetData.opponentUserId !== loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.YOU_CAN_NOT_RESPONSE_TO_THIS_BET
    );
  }
  if (BetData.status !== "REQUESTED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + "`REQUESTED`"
    );
  }
  if (data && Number(data.amount) <= 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.AMOUNT_GREATER_THAN + '0'
    );
  }
  if (data.isAccepted && data.amount && data.amount > 0 && data.teamId) {
    if (BetData.matchOddsId.localTeamId != data.teamId && BetData.matchOddsId.awayTeamId != data.teamId) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.TEAM_NOT_FOUND_IN_MATCH
      );
    }
    if (BetData.requestUserTeamId == data.teamId) {
      let minumumBetAmount = 0;
      if (data.teamId == BetData.matchOddsId.localTeamId) {
        minumumBetAmount = BetData.matchOddsId.localTeamOdd > 0 ? BetData.matchOddsId.localTeamOdd : 0
      } else {
        minumumBetAmount = BetData.matchOddsId.awayTeamOdd > 0 ? BetData.matchOddsId.awayTeamOdd : 0
      }
      if (data.amount < minumumBetAmount || data.amount < 0) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          Messages.AMOUNT_GREATER_THAN + minumumBetAmount
        );
      }
    } else {
      if (data.amount !== BetData.requestUserAmount) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          Messages.AMOUNT_SHOULD_BE + BetData.requestUserAmount
        );
      }
    }

    await Bet.updateOne(
      {
        _id: id
      },
      {
        status: 'ACCEPTED',
        opponentUserAmount: data.amount,
        opponentUserTeamId: data.teamId,
        opponentUserOdds: (BetData.matchOddsId.localTeamId == data.teamId ? BetData.matchOddsId.localTeamOdd : BetData.matchOddsId.awayTeamOdd),
        responseAt: new Date()
      });

    const responseBet = await Bet.findOne({
      _id: id
    }).populate("requestUserTeamId opponentUserTeamId matchOddsId").lean();

    return responseBet;

  } else {
    await Bet.updateOne(
      {
        _id: id
      }, {
      status: 'REJECTED',
      responseAt: new Date()
    }
    );
    const responseBet = await Bet.findOne({
      _id: id
    }).populate("requestUserTeamId matchOddsId").lean();
    return responseBet;
  }
};

const requestListBetByUserId = async (userId: number) => {
  const requestListBet = await Bet.find({
    opponentUserId: userId, status: 'REQUESTED',
  });
  return requestListBet;
};

const resultBet = async (id: string, winTeamId: string) => {
  const condition = {
    _id: id
  };
  const BetData = await Bet.findOne(condition).populate("matchId").lean();
  if (!BetData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (BetData.status !== "ACCEPTED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + "`ACCEPTED`"
    );
  }
  if (BetData.matchId.localTeamId != winTeamId && winTeamId != BetData.matchId.awayTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.TEAM_NOT_FOUND_IN_MATCH
    );
  }
  let isRequestUserWinAmount = false;
  let isOpponentUserWinAmount = false;
  let resultAmountRequestUser = 0 - BetData.requestUserAmount;
  let resultAmountOpponentUser = 0 - BetData.opponentUserAmount;
  if (BetData.requestUserTeamId.toHexString() == BetData.opponentUserTeamId.toHexString()) {
    if (BetData.requestUserTeamId == winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser = betWinAmountCalculationUsingOdd(BetData.requestUserAmount, BetData.requestUserOdds);
    }
    if (BetData.opponentUserTeamId == winTeamId) {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = betWinAmountCalculationUsingOdd(BetData.opponentUserAmount, BetData.opponentUserOdds)
    }
  } else {
    if (BetData.requestUserTeamId == winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser = BetData.requestUserAmount * 2;
    } else {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = BetData.opponentUserAmount * 2;
    }
  }

  await Bet.updateOne(condition,
    {
      status: "RESULT_DECLARED",
      winTeamId: winTeamId,
      isRequestUserWinAmount: isRequestUserWinAmount,
      isOpponentUserWinAmount: isOpponentUserWinAmount,
      resultAmountRequestUser: resultAmountRequestUser,
      resultAmountOpponentUser: resultAmountOpponentUser,
      resultAt: new Date()
    });
  const updatedData = await Bet.findOne(condition).lean();
  return updatedData
};


const getResultBet = async (loggedInUserId: number, betId: string) => {
  const BetData = await Bet.findOne({
    _id: betId
  }).populate("requestUserTeamId opponentUserTeamId matchEventId matchId").lean();

  if (BetData && BetData.opponentUserId == loggedInUserId) {
    if (BetData.isOpponentUserWinAmount) {
      return {
        win: true,
        winAmount: BetData.resultAmountOpponentUser,
        data: BetData
      }
    } else {
      return {
        win: false,
        loseAmount: BetData.resultAmountOpponentUser,
        data: BetData
      }
    }
  } else if (BetData && BetData.requestUserId == loggedInUserId) {
    if (BetData.isRequestUserWinAmount) {
      return {
        win: true,
        winAmount: BetData.resultAmountRequestUser,
        data: BetData
      }
    } else {
      return {
        win: false,
        loseAmount: BetData.resultAmountRequestUser,
        data: BetData
      }
    }
  } else {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
};

const resultBetVerified = async (loggedInUserId: number, betId: string, isSatisfied: Boolean) => {
  const BetData = await Bet.findOne({
    _id: betId
  });
  if (!BetData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (BetData.status !== "RESULT_DECLARED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + "`RESULT_DECLARED`"
    );
  }
  let status = BetData.status;
  if (BetData.opponentUserId == loggedInUserId) {
    if (BetData.isOpponentUserResultSatisfied != null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.ALREADY_RESPOND
      );
    }
    if (BetData.isRequestUserResultSatisfied != null) {
      status = (BetData.isRequestUserResultSatisfied && isSatisfied) ? "COMPLETED" : "RESULT_NOT_SATISFIED"
    }
    await Bet.updateOne(
      {
        _id: betId
      }, {
      isOpponentUserResultSatisfied: isSatisfied ? true : false,
      status: status
    }
    );
  } else if (BetData.requestUserId == loggedInUserId) {
    if (BetData.isRequestUserResultSatisfied != null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.ALREADY_RESPOND
      );
    }
    if (BetData.isOpponentUserResultSatisfied != null) {
      status = (BetData.isOpponentUserResultSatisfied && isSatisfied) ? "COMPLETED" : "RESULT_NOT_SATISFIED"
    }
    await Bet.updateOne(
      {
        _id: betId
      }, {
      isRequestUserResultSatisfied: isSatisfied ? true : false,
      status: status
    }
    );
  } else {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  return await Bet.findOne({
    _id: betId
  }).lean();
};

const listBetsByStatus = async (loggedInUserId: number, status: String) => {
  const list = await Bet.find({
    status: status,
    $or: [
      { requestUserId: loggedInUserId },
      { opponentUserId: loggedInUserId }
    ]
  });
  if (list && list.length == 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  return list;
};
export default { listBetsByStatus, resultBetVerified, getResultBet, responseBet, requestListBetByUserId, resultBet, createBet };
