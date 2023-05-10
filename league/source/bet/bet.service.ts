import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/match.model";
import MatchOdd from "../models/documents/matchOdd.model";
import AppError from "../utils/AppError";
import { ICreateBetRequest, IresponseBetRequest } from "./bet.interface";
import { TBet, betStatus} from "../models/interfaces/bet.interface";
import Messages from "../utils/messages";

const winAmountCalculationUsingOdd = function (amount: number, odd: number) {
  if (odd < 0) {
    if (amount >= Math.abs(odd)) {
      return amount + (amount + 100 - (Math.abs(odd)))
    } else {
      return amount + ((amount * 100) / (Math.abs(odd)))
    }
  } else {
    return (amount - 100) + Math.abs(odd) + amount
  }
}
const createBet = async (loggedInUserId: number, data: ICreateBetRequest) => {
  if (data.opponentUserId === loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.SELECT_DIFFERENT_OPPONENT_USER
    );
  }
  const betFound = await Bet.findOne({
    $or: [
      { requestUserId: loggedInUserId },
      { opponentUserId: loggedInUserId },
    ],
    matchId: data.matchId,
  }).lean();

  if ( betFound ) {
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

  if (matchData.localTeamId.toHexString() !== data.requestUserTeamId && matchData.awayTeamId.toHexString() !== data.requestUserTeamId) {
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

  let minimumBetAmount = 0;
  if (data.requestUserTeamId == matchOddsData.localTeamId._id) {
    minimumBetAmount = matchOddsData.localTeamOdd > 0 ? matchOddsData.localTeamOdd : 0
  } else {
    minimumBetAmount = matchOddsData.awayTeamOdd > 0 ? matchOddsData.localTeamOdd : 0
  }

  if (data.amount <= minimumBetAmount) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.AMOUNT_GREATER_THAN + minimumBetAmount
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

  const betData = await Bet.findOne({
    _id: id
  }
  ).populate("matchOddsId").lean();
  if (!betData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (betData.opponentUserId !== loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.YOU_CAN_NOT_RESPONSE_TO_THIS_BET
    );
  }
  if (betData.status !== betStatus.REQUESTED) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.REQUESTED
    );
  }
  if (data && Number(data.amount) <= 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.AMOUNT_GREATER_THAN + '0'
    );
  }
  if (data.isAccepted && data.amount && data.amount > 0 && data.teamId) {
    if (betData.matchOddsId.localTeamId != data.teamId && betData.matchOddsId.awayTeamId != data.teamId) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.TEAM_NOT_FOUND_IN_MATCH
      );
    }
    if (betData.requestUserTeamId == data.teamId) {
      let minimumBetAmount = 0;
      if (data.teamId == betData.matchOddsId.localTeamId) {
        minimumBetAmount = betData.matchOddsId.localTeamOdd > 0 ? betData.matchOddsId.localTeamOdd : 0
      } else {
        minimumBetAmount = betData.matchOddsId.awayTeamOdd > 0 ? betData.matchOddsId.awayTeamOdd : 0
      }
      if (data.amount < minimumBetAmount || data.amount < 0) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          Messages.AMOUNT_GREATER_THAN + minimumBetAmount
        );
      }
    } else {
      if (data.amount !== betData.requestUserAmount) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          Messages.AMOUNT_SHOULD_BE + betData.requestUserAmount
        );
      }
    }

    await Bet.updateOne(
      {
        _id: id
      },
      {
        status: betStatus.ACCEPTED,
        opponentUserAmount: data.amount,
        opponentUserTeamId: data.teamId,
        opponentUserOdds: (betData.matchOddsId.localTeamId == data.teamId ? betData.matchOddsId.localTeamOdd : betData.matchOddsId.awayTeamOdd),
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
      status: betStatus.REJECTED,
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
    opponentUserId: userId, status: betStatus.REQUESTED,
  });
  return requestListBet;
};

const resultBet = async (id: string, winTeamId: string) => {
  const condition = {
    _id: id
  };
  const betData = await Bet.findOne(condition).populate("matchId").lean();
  if (!betData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (betData.status !== betStatus.ACCEPTED) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.ACCEPTED
    );
  }
  if (betData.matchId.localTeamId.toHexString() !== winTeamId && winTeamId !== betData.matchId.awayTeamId.toHexString()) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.TEAM_NOT_FOUND_IN_MATCH
    );
  }
  let isRequestUserWinAmount = false;
  let isOpponentUserWinAmount = false;
  let resultAmountRequestUser = 0 - betData.requestUserAmount;
  let resultAmountOpponentUser = 0 - betData.opponentUserAmount;
  if (betData.requestUserTeamId.toHexString() === betData.opponentUserTeamId.toHexString()) {
    if (betData.requestUserTeamId.toHexString() === winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser = winAmountCalculationUsingOdd(betData.requestUserAmount, betData.requestUserOdds);
    }
    if (betData.opponentUserTeamId.toHexString() === winTeamId) {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = winAmountCalculationUsingOdd(betData.opponentUserAmount, betData.opponentUserOdds)
    }
  } else {
    if (betData.requestUserTeamId.toHexString() === winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser = betData.requestUserAmount * 2;
    } else {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = betData.opponentUserAmount * 2;
    }
  }

  await Bet.updateOne(condition,
    {
      status: betStatus.RESULT_DECLARED,
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
  const betData = await Bet.findOne({
    _id: betId
  }).populate("requestUserTeamId opponentUserTeamId matchEventId matchId").lean();
  if (betData && betData.opponentUserId === loggedInUserId) {
    if (betData.isOpponentUserWinAmount) {
      return {
        win: true,
        winAmount: betData.resultAmountOpponentUser,
        data: betData
      }
    } else {
      return {
        win: false,
        loseAmount: betData.resultAmountOpponentUser,
        data: betData
      }
    }
  } else if (betData && betData.requestUserId === loggedInUserId) {
    if (betData.isRequestUserWinAmount) {
      return {
        win: true,
        winAmount: betData.resultAmountRequestUser,
        data: betData
      }
    } else {
      return {
        win: false,
        loseAmount: betData.resultAmountRequestUser,
        data: betData
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
  const betData = await Bet.findOne({
    _id: betId
  });
  if (!betData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      Messages.BET_DATA_NOT_FOUND
    );
  }
  if (betData.status !== betStatus.RESULT_DECLARED) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ONLY_RESP_WHEN_STATUS + betStatus.RESULT_DECLARED
    );
  }
  let status:betStatus = betData.status;
  if (betData.opponentUserId == loggedInUserId) {
    if (betData.isOpponentUserResultSatisfied != null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.ALREADY_RESPOND
      );
    }
    if (betData.isRequestUserResultSatisfied != null) {
      status = (betData.isRequestUserResultSatisfied && isSatisfied) ? betStatus.COMPLETED : betStatus.RESULT_NOT_SATISFIED
    }
    await Bet.updateOne(
      {
        _id: betId
      }, {
      isOpponentUserResultSatisfied: isSatisfied ? true : false,
      status: status
    }
    );
  } else if (betData.requestUserId === loggedInUserId) {
    if (betData.isRequestUserResultSatisfied != null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        Messages.ALREADY_RESPOND
      );
    }
    if (betData.isOpponentUserResultSatisfied !== null) {
      status = (betData.isOpponentUserResultSatisfied && isSatisfied) ? betStatus.COMPLETED : betStatus.RESULT_NOT_SATISFIED
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

const listBetsByStatus = async (loggedInUserId: number, status: string) => {
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
