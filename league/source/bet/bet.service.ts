import httpStatus from "http-status";
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/match.model";
import Odd from "../models/documents/odd.model";
import AppError from "../utils/AppError";
import { ICreateBetRequest, IresponseBetRequest } from "./bet.interface";
import { betStatus } from "../models/interfaces/bet.interface";
import Messages from "../utils/messages";

const winAmountCalculationUsingOdd = function (amount: number, odd: number) {
  if (odd < 0) {
    if (amount >= Math.abs(odd)) {
      return amount + (amount + 100 - Math.abs(odd));
    } else {
      return amount + (amount * 100) / Math.abs(odd);
    }
  } else {
    return amount - 100 + Math.abs(odd) + amount;
  }
};
const fairOddCalculation = function (favourite: number, underdog: number) {
  const FavIP = (-favourite / (-favourite + 100)) * 100;
  const underIP = (100 / (underdog + 100)) * 100;
  const favFairOdd = FavIP / (FavIP + underIP);
  const underFairOdd = underIP / (underIP + FavIP);
  const fav = ((favFairOdd * 100) / underFairOdd) * -1;
  const under = 100 / underFairOdd - 100;
  return {
    favourite: fav,
    underdog: under,
  };
};

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
    goalServeMatchId: data.matchId,
  }).lean();

  if (betFound) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.ALREADY_APPLIED_ON_MATCH
    );
  }

  if (data.amount < 1) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      Messages.BET_AMOUNT_MUST_BE_GREATER_THAN_EQUALS_1
    );
  }
  const matchData = await Match.findOne({
    goalServeMatchId: data.matchId,
  }).lean();

  if (!matchData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.MATCH_DATA_NOT_FOUND);
  }

  if (
    matchData.goalServeHomeTeamId != data.requestUserTeamId &&
    matchData.goalServeAwayTeamId != data.requestUserTeamId
  ) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.TEAM_NOT_FOUND_IN_MATCH);
  }
  const oddData = await Odd.findOne({
    goalServeMatchId: data.matchId,
  }).lean();

  if (!oddData) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.MATCH_ODD_DATA_NOT_FOUND);
  }

  let fairOddCalRes = {
    favourite: 0,
    underdog: 0,
  };
  if (parseInt(oddData.homeTeamMoneyline.us) > 0) {
    fairOddCalRes = fairOddCalculation(
      parseInt(oddData.awayTeamMoneyline.us),
      parseInt(oddData.homeTeamMoneyline.us)
    );
  } else {
    fairOddCalRes = fairOddCalculation(
      parseInt(oddData.homeTeamMoneyline.us),
      parseInt(oddData.awayTeamMoneyline.us)
    );
  }

  let preparedBetObject = {
    goalServeMatchId: data.matchId,
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    isRequestUserConfirmedBet: true,
    betAmount: data.amount,
    goalServeLeagueId: matchData.goalServeLeagueId,
    goalServeRequestUserTeamId: matchData.goalServeHomeTeamId,
    goalServeOpponentUserTeamId: matchData.goalServeHomeTeamId,
    requestUserFairOdds:
      parseInt(oddData.homeTeamMoneyline.us) > 0
        ? fairOddCalRes.underdog
        : fairOddCalRes.favourite,
    requestUserMoneylineOdds: oddData.homeTeamMoneyline.us,
    opponentUserFairOdds:
      parseInt(oddData.homeTeamMoneyline.us) > 0
        ? fairOddCalRes.underdog
        : fairOddCalRes.favourite,
    opponentUserMoneylineOdds: oddData.homeTeamMoneyline.us,
  };
  if (matchData.goalServeHomeTeamId === data.requestUserTeamId) {
    preparedBetObject.goalServeOpponentUserTeamId =
      matchData.goalServeAwayTeamId;
    preparedBetObject.opponentUserMoneylineOdds = oddData.awayTeamMoneyline.us;
    preparedBetObject.opponentUserFairOdds =
      parseInt(oddData.awayTeamMoneyline.us) > 0
        ? fairOddCalRes.underdog
        : fairOddCalRes.favourite;
  } else {
    preparedBetObject.goalServeRequestUserTeamId =
      matchData.goalServeAwayTeamId;
    preparedBetObject.requestUserMoneylineOdds = oddData.awayTeamMoneyline.us;
    preparedBetObject.requestUserFairOdds =
      parseInt(oddData.awayTeamMoneyline.us) > 0
        ? fairOddCalRes.underdog
        : fairOddCalRes.favourite;
  }
  const createBet = await Bet.create(preparedBetObject);

  const createdBet = await Bet.findOne({
    _id: createBet._id,
  });
  return createdBet;
};

const responseBet = async (
  id: string,
  loggedInUserId: number,
  isConfirmed: boolean
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
  let prepareObject = {
    isRequestUserConfirmedBet: betData.isRequestUserConfirmedBet,
    isOpponentUserConfirmedBet: betData.isOpponentUserConfirmedBet,
    status: betData.status as betStatus,
    responseAt: betData.responseAt,
  };
  if (loggedInUserId === betData.requestUserId) {
    if (betData.isRequestUserConfirmedBet) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        Messages.ALREADY_CONFIRMED_BET
      );
    }
    if (isConfirmed) {
      prepareObject.isRequestUserConfirmedBet = true;
      prepareObject.status =
        betData.isOpponentUserConfirmedBet && isConfirmed
          ? betStatus.CONFIRMED
          : betStatus.PENDING;
      prepareObject.responseAt =
        betData.isOpponentUserConfirmedBet && isConfirmed
          ? new Date()
          : betData.responseAt;
    } else {
      prepareObject.isRequestUserConfirmedBet = false;
      prepareObject.status = betStatus.REJECTED;
      prepareObject.responseAt = new Date();
    }
  } else {
    if (betData.isOpponentUserConfirmedBet) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        Messages.ALREADY_CONFIRMED_BET
      );
    }
    if (isConfirmed) {
      prepareObject.isOpponentUserConfirmedBet = true;
      prepareObject.status =
        betData.isRequestUserConfirmedBet && isConfirmed
          ? betStatus.CONFIRMED
          : betStatus.PENDING;
      prepareObject.responseAt =
        betData.isRequestUserConfirmedBet && isConfirmed
          ? new Date()
          : betData.responseAt;
    } else {
      prepareObject.isOpponentUserConfirmedBet = false;
      prepareObject.status = betStatus.REJECTED;
      prepareObject.responseAt = new Date();
    }
  }

  await Bet.updateOne(
    {
      _id: id,
    },
    prepareObject
  );

  const responseBet = await Bet.findOne({
    _id: id,
  }).lean();
  return responseBet;
};

const requestListBetByUserId = async (userId: number) => {
  const requestListBet = await Bet.find({
    opponentUserId: userId,
    status: betStatus.PENDING,
  });
  return requestListBet;
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
  const list = await Bet.find({
    status: status,
    $or: [
      { requestUserId: loggedInUserId },
      { opponentUserId: loggedInUserId },
    ],
  });
  if (list && list.length == 0) {
    throw new AppError(httpStatus.NOT_FOUND, Messages.BET_DATA_NOT_FOUND);
  }
  return list;
};
export default {
  listBetsByStatus,
  resultBetVerified,
  getResultBet,
  responseBet,
  requestListBetByUserId,
  resultBet,
  createBet,
  updateBetRequest,
};
