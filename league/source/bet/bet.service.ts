import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/match.model";
import MatchOdd from "../models/documents/matchOdd.model";
import Team from "../models/documents/team.model";
import MatchEvent from "../models/documents/matchEvent.model";
import { IbetModel, TBet } from "../models/interfaces/bet.interface";
import { IMatchModel, TMatch } from "../models/interfaces/match.interface";


import AppError from "../utils/AppError";
import { ICreateBetRequest, IresponseBetRequest } from "./bet.interface";

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
// const createBet = async (loggedInUserId: number, data: ICreateBetRequest) => {
//   const localTeam = await Team.create({
//     name : "Gujarat Titans",
//     shortName : "GT",
//     sportsType : "HOCKEY"
//   });
//   const awayTeam = await Team.create({
//     name : "Mumbai Indians",
//     shortName : "MI",
//     sportsType : "HOCKEY"
//   });
//   const matchEvent = await MatchEvent.create({
//     name : "Indian Hockey Leauge",
//     shortName : "IHL",
//     sportsType : "HOCKEY"
//   });
//   const match = await Match.create({
//     matchEventId : matchEvent._id,
//     localTeamId: localTeam._id,
//     awayTeamId: awayTeam._id,
//     sportsType : "HOCKEY"
//   });
//   await MatchOdd.create({
//     matchId : match._id,
//     localTeamId: localTeam._id,
//     awayTeamId: awayTeam._id,
//     localTeamOdd : 120,
//     awayTeamOdd : -150,
//     sportsType : "HOCKEY"
//   });
//   await MatchOdd.create({
//     matchId : match._id,
//     localTeamId: localTeam._id,
//     awayTeamId: awayTeam._id,
//     localTeamOdd : 230,
//     awayTeamOdd : -160,
//     sportsType : "HOCKEY"
//   });
//   return {};
// };
const createBet = async (loggedInUserId: number, data: ICreateBetRequest) => {
  if (data.opponentUserId === loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Please, Select different Opponent User"
    );
  }
  if (data.amount <= 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Amount Must Be Greater Than 0"
    );
  }
  const matchData = await Match.findOne({
    _id: data.matchId
  }).lean();

  if (!matchData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Match data not found"
    );
  }
  if (matchData.sportsType !== data.sportsType) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Match data not found"
    );
  }

  if (matchData.localTeamId != data.requestUserTeamId && matchData.awayTeamId != data.requestUserTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Your Team is Not Found in this Match"
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
      "Match Odd is Not Found"
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
      "Minimum bet amount is " + minumumBetAmount
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
      "You already applied on this match"
    )
  }

  const MatchEventId = matchOddsData.matchId.matchEventId;
  const preparedBetObject = {
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    requestUserAmount: data.amount,
    sportsType: data.sportsType,
    requestUserTeamId: data.requestUserTeamId,
    matchId: data.matchId,
    matchEventId: MatchEventId,
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

  const BetData = await Bet.findOne(
    {
      _id: id
    }
  ).populate("matchOddsId").lean();
  if (!BetData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
  if (BetData.opponentUserId !== loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can not repond this bet request"
    );
  }
  if (BetData.status !== "REQUESTED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Invalid Status"
    );
  }
  if (data && Number(data.amount) <= 0) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Amount Must Be Greater Than 0"
    );
  }
  if (data.isAccepted && data.amount && data.amount > 0 && data.teamId) {
    if (BetData.matchOddsId.localTeamId != data.teamId && BetData.matchOddsId.awayTeamId != data.teamId) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Your Team is Not Found in this Match"
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
          "Minimum bet amount is greater than " + minumumBetAmount
        );
      }
    } else {
      if (data.amount !== BetData.requestUserAmount) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          "bet amount must be " + BetData.requestUserAmount
        );
      }
    }
    await Bet.updateOne({
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

const listBetsByUserId = async (userId: number) => {
  const requestListBet = await prisma.OneToOneBat.findMany({
    where: {
      AND: [{
        OR: [{
          requestUserId: userId
        }, {
          opponentUserId: userId
        }]
      },
      { status: 'ACCEPTED' },
      { isDeleted: false }],
    }
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
      "Bet data not found"
    );
  }
  if (BetData.status !== "ACCEPTED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can only repond when status is `ACCEPTED`"
    );
  }
  if (BetData.matchId.localTeamId != winTeamId && winTeamId != BetData.matchId.awayTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Please give correct team Id"
    );
  }
  let isRequestUserWinAmount = false;
  let isOpponentUserWinAmount = false;
  let resultAmountRequestUser = 0 - BetData.requestUserAmount;
  let resultAmountOpponentUser = 0 - BetData.opponentUserAmount;
  if (BetData.requestUserTeamId.toHexString() ==  BetData.opponentUserTeamId.toHexString()) {
    if (BetData.requestUserTeamId == winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser = betWinAmountCalculationUsingOdd(BetData.requestUserAmount, BetData.requestUserOdds);
      // resultAmountRequestUser = Bet.requestUserOdds < 0 ? Bet.requestUserAmount + (Bet.requestUserAmount + 100 - (Math.abs(Bet.requestUserOdds))) : ((Bet.requestUserAmount - 100) + (Math.abs(Bet.requestUserOdds)) + Bet.requestUserAmount)
      // resultAmountRequestUser = Bet.requestUserOdds < 0 ? Bet.requestUserAmount + ((Bet.requestUserAmount * 100) / (Math.abs(Bet.requestUserOdds))) : ((Bet.requestUserAmount - 100) + (Math.abs(Bet.requestUserOdds)) + Bet.requestUserAmount)
    }
    if (BetData.opponentUserTeamId == winTeamId) {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = betWinAmountCalculationUsingOdd(BetData.opponentUserAmount, BetData.opponentUserOdds)
      // resultAmountOpponentUser = Bet.opponentUserOdds < 0 ? Bet.opponentUserAmount + (Bet.opponentUserAmount + 100 - (Math.abs(Bet.opponentUserOdds))) : ((Bet.opponentUserAmount - 100) + (Math.abs(Bet.opponentUserOdds)) + Bet.opponentUserAmount)
      // resultAmountOpponentUser = Bet.opponentUserOdds < 0 ? Bet.opponentUserAmount + ((Bet.opponentUserAmount * 100) / (Math.abs(Bet.opponentUserOdds))) : ((Bet.opponentUserAmount - 100) + (Math.abs(Bet.opponentUserOdds)) + Bet.opponentUserAmount)
    }
  } else {
    if (BetData.requestUserTeamId == winTeamId) {
      isRequestUserWinAmount = true;
      isOpponentUserWinAmount = false;
      resultAmountRequestUser = BetData.requestUserAmount * 2;
      resultAmountOpponentUser = 0 - BetData.opponentUserAmount;
    } else {
      isRequestUserWinAmount = false;
      isOpponentUserWinAmount = true;
      resultAmountRequestUser = 0 - BetData.requestUserAmount;
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
    _id : betId
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
      "bet data not found"
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
      "Bet Data not found"
    );
  }
  if (BetData.status !== "RESULT_DECLARED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can only repond when status is `RESULT_DECLARED`"
    );
  }
  let status = BetData.status;
  if (BetData.opponentUserId == loggedInUserId) {
    if (BetData.isOpponentUserResultSatisfied != null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "you already respond to this result"
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
        "you already respond to this result"
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
      "bet data not found"
    );
  }
  // if (status === "COMPLETED") {
  //   const opponentUserWallet = await prisma.UserWallet.findFirst({
  //     where: {
  //       isDeleted: false,
  //       userId: BetData.opponentUserId
  //     }
  //   });
  //   if (opponentUserWallet) {
  //     await prisma.UserWallet.update({
  //       where: {
  //         userId: BetData.opponentUserId
  //       }, data: {
  //         balance: BetData.isOpponentUserWinAmount ? opponentUserWallet.balance + (BetData.resultAmountOpponentUser - BetData.opponentUserAmount) : opponentUserWallet.balance + BetData.resultAmountOpponentUser
  //       }
  //     });
  //   } else {
  //     await prisma.UserWallet.create({
  //       data: {
  //         userId: BetData.opponentUserId,
  //         balance: BetData.isOpponentUserWinAmount ? (BetData.resultAmountOpponentUser - BetData.opponentUserAmount) : BetData.resultAmountOpponentUser
  //       }
  //     });
  //   }

  //   const requestUserWallet = await prisma.UserWallet.findFirst({
  //     where: {
  //       isDeleted: false,
  //       userId: BetData.requestUserId
  //     }
  //   });
  //   if (requestUserWallet) {
  //     await prisma.UserWallet.update({
  //       where: {
  //         userId: BetData.requestUserId
  //       }, data: {
  //         balance: BetData.isRequestUserWinAmount ? requestUserWallet.balance + (BetData.resultAmountRequestUser - BetData.requestUserAmount) : requestUserWallet.balance + BetData.resultAmountRequestUser
  //       }
  //     });
  //   } else {
  //     await prisma.UserWallet.create({
  //       data: {
  //         userId: BetData.requestUserId,
  //         balance: BetData.isRequestUserWinAmount ? (BetData.resultAmountRequestUser - BetData.requestUserAmount) : BetData.resultAmountRequestUser
  //       }
  //     });
  //   }
  // }
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
      "bet data not found"
    );
  }
  return list;
};
export default { listBetsByStatus, resultBetVerified, getResultBet, responseBet, requestListBetByUserId, listBetsByUserId, resultBet, createBet };
