import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import Bet from "../models/documents/bet.model";
import Match from "../models/documents/match.model";
import MatchOdd from "../models/documents/matchOdd.model";
import Team from "../models/documents/team.model";
import MatchEvent from "../models/documents/matchEvent.model";
import { ObjectId } from "mongoose";

import AppError from "../utils/AppError";
import { ICreateBetRequest, IresponseBetRequest } from "./bet.interface";

const betWinAmountCalculationUsingOdd = function (amount : number, odd : number) {
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
//   const matchOdd = await MatchOdd.create({
//     matchId : match._id,
//     localTeamId: localTeam._id,
//     awayTeamId: awayTeam._id,
//     localTeamOdd : -160,
//     awayTeamOdd : +200,
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
  console.log(data)
  console.log(matchData)
  
  if (matchData.localTeamId != data.requestUserTeamId && matchData.awayTeamId != data.requestUserTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Your Team is Not Found in this Match"
    );
  }

  const matchOddsData = await MatchOdd.findOne({
    matchId: data.matchId
  }).sort({createdAt: 'desc'}).populate([
    { path : "localTeamId" },
    { path : "awayTeamId"},
    { path : "matchId" }
  ]).lean();

  if (!matchOddsData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Match Odd is Not Found"
    );
  }

  let minumumBetAmount = 0;
  if (data.requestUserTeamId === matchOddsData.localTeamId) {
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

  // const betFound = await prisma.OneToOneBat.findFirst({
  //   where: {
  //     OR: [
  //       { requestUserId: loggedInUserId },
  //       { opponentUserId: loggedInUserId },
  //     ],
  //     matchId: data.matchId,
  //   }
  // });

  // if (betFound) {
  //   throw new AppError(
  //     httpStatus.UNPROCESSABLE_ENTITY,
  //     "You already applied on this match"
  //   )
  // }
  const MatchEventId = matchOddsData.matchId.matchEventId;
  const preparedBetObject = {
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    requestUserAmount: data.amount,
    sportsType: data.sportsType,
    requestUserTeamId: data.requestUserTeamId,
    matchId: data.matchId,
    matchEventId: MatchEventId,
    matchOddsId: matchOddsData.id,
    requestUserOdds: (matchOddsData.localTeamId === data.requestUserTeamId ? matchOddsData.localTeamOdd : matchOddsData.awayTeamOdd),
  };
  const createBet = await Bet.create(preparedBetObject); 

  const createdBet = await Bet.findOne({
    _id : createBet._id
  }).populate([
    { path : "requestUserTeamId", select : "_id name sortName" },
    { path : "matchEventId", select : "_id name sortName" },
    { path : "matchId" },
    { path : "matchOddsId" }
  ]);
  return createdBet;
};

const responseBet = async (id: number, loggedInUserId: number, data: IresponseBetRequest) => {
  const Bet = await prisma.OneToOneBat.findUnique({
    where: {
      id: id
    },
    include: {
      matchOdds: true
    }
  });
  if (!Bet) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
  if (Bet.opponentUserId !== loggedInUserId) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can not repond this bet request"
    );
  }
  if (Bet.status !== 'REQUESTED') {
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
  if (Bet.matchOdds.localTeamId !== data.teamId && Bet.matchOdds.awayTeamId !== data.teamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Your Team is Not Found in this Match"
    );
  }
   if (Bet.requestUserTeamId === data.teamId) {
     let minumumBetAmount = 0;
     if (data.teamId === Bet.matchOdds.localTeamId) {
       minumumBetAmount = Bet.matchOdds.localTeamOdd > 0 ? Bet.matchOdds.localTeamOdd : 0
     } else {
       minumumBetAmount = Bet.matchOdds.awayTeamOdd > 0 ? Bet.matchOdds.awayTeamOdd : 0
     }
     if ( data.amount < minumumBetAmount || data.amount < 0) {
       throw new AppError(
         httpStatus.UNPROCESSABLE_ENTITY,
         "Minimum bet amount is greater than " + minumumBetAmount
       );
     }
    } else {
      if (data.amount !== Bet.requestUserAmount) {
        throw new AppError(
          httpStatus.UNPROCESSABLE_ENTITY,
          "bet amount must be " + Bet.requestUserAmount
        );
      }
    }
   const responseBet = await prisma.OneToOneBat.update({
    where: {
      id: id
    },
    data: {
      status: 'ACCEPTED',
      opponentUserAmount: data.amount,
      opponentUserTeamId : data.teamId,
      opponentUserOdds : (Bet.matchOdds.localTeamId === data.teamId ? Bet.matchOdds.localTeamOdd : Bet.matchOdds.awayTeamOdd),
      responseAt: new Date()
    }
  });
  return responseBet;
 } else {
   const responseBet = await prisma.OneToOneBat.update({
     where: {
       id: id
     },
     data: {
       status: 'REJECTED',
       responseAt: new Date()
     }
   });
   return responseBet;
 }
};

const requestListBetByUserId = async (userId: number) => {
  const requestListBet = await prisma.OneToOneBat.findMany({
    where: {
      AND: [{ opponentUserId: userId }, { status: 'REQUESTED' }, { isDeleted: false }],
    }
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

const resultBet = async (id: number, winTeamId: string) => {
  const condition = {
    id: id
  };
  const Bet = await prisma.OneToOneBat.findUnique({
    where: condition,
    include: {
      match: true
    }
  });
  if (!Bet) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Bet data not found"
    );
  }
  if (Bet.status !== "ACCEPTED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can only repond when status is `ACCEPTED`"
    );
  }
  if (Bet.match.localTeamId !== winTeamId && winTeamId !== Bet.match.awayTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Please give correct team Id"
    );
  }
  let isRequestUserWinAmount = false;
  let isOpponentUserWinAmount = false;
  let resultAmountRequestUser = 0 - Bet.requestUserAmount;
  let resultAmountOpponentUser = 0 - Bet.opponentUserAmount;
  if (Bet.requestUserTeamId === Bet.opponentUserTeamId) {
    if (Bet.requestUserTeamId === winTeamId) {
      isRequestUserWinAmount = true;
      resultAmountRequestUser= betWinAmountCalculationUsingOdd(Bet.requestUserAmount, Bet.requestUserOdds);
      // resultAmountRequestUser = Bet.requestUserOdds < 0 ? Bet.requestUserAmount + (Bet.requestUserAmount + 100 - (Math.abs(Bet.requestUserOdds))) : ((Bet.requestUserAmount - 100) + (Math.abs(Bet.requestUserOdds)) + Bet.requestUserAmount)
      // resultAmountRequestUser = Bet.requestUserOdds < 0 ? Bet.requestUserAmount + ((Bet.requestUserAmount * 100) / (Math.abs(Bet.requestUserOdds))) : ((Bet.requestUserAmount - 100) + (Math.abs(Bet.requestUserOdds)) + Bet.requestUserAmount)
    }
    if (Bet.opponentUserTeamId === winTeamId) {
      isOpponentUserWinAmount = true;
      resultAmountOpponentUser = betWinAmountCalculationUsingOdd(Bet.opponentUserAmount, Bet.opponentUserOdds)
      // resultAmountOpponentUser = Bet.opponentUserOdds < 0 ? Bet.opponentUserAmount + (Bet.opponentUserAmount + 100 - (Math.abs(Bet.opponentUserOdds))) : ((Bet.opponentUserAmount - 100) + (Math.abs(Bet.opponentUserOdds)) + Bet.opponentUserAmount)
      // resultAmountOpponentUser = Bet.opponentUserOdds < 0 ? Bet.opponentUserAmount + ((Bet.opponentUserAmount * 100) / (Math.abs(Bet.opponentUserOdds))) : ((Bet.opponentUserAmount - 100) + (Math.abs(Bet.opponentUserOdds)) + Bet.opponentUserAmount)
    }
  } else {
    if (Bet.requestUserTeamId === winTeamId) {
      isRequestUserWinAmount = true;
      isOpponentUserWinAmount = false;
      resultAmountRequestUser = Bet.requestUserAmount * 2;
      resultAmountOpponentUser = 0 - Bet.opponentUserAmount;
    } else {
      isRequestUserWinAmount = false;
      isOpponentUserWinAmount = true;
      resultAmountRequestUser = 0 - Bet.requestUserAmount;
      resultAmountOpponentUser = Bet.opponentUserAmount * 2;
    }
  }

  await prisma.OneToOneBat.update({
    where: condition,
    data: {
      status: "RESULT_DECLARED",
      winTeamId: winTeamId,
      isRequestUserWinAmount: isRequestUserWinAmount,
      isOpponentUserWinAmount: isOpponentUserWinAmount,
      resultAmountRequestUser: resultAmountRequestUser,
      resultAmountOpponentUser: resultAmountOpponentUser,
      resultAt: new Date()
    }
  });
  const updatedData = await prisma.OneToOneBat.findUnique({
    where: condition
  });
  return updatedData
};


const getResultBet = async (loggedInUserId: number, betId: number) => {
  const Bet = await prisma.OneToOneBat.findUnique({
    where: {
      id: betId
    },
    include: {
      requestUserTeam: true,
      opponentUserTeam: true,
      matchEvent: true,
      match: true,
      requestUser: {
        select: {
          firstName: true,
          lastName: true,
          userName: true,
          phone: true,
          profileImage: true,
          id: true,
        }
      },
      opponentUser: {
        select: {
          firstName: true,
          lastName: true,
          userName: true,
          phone: true,
          profileImage: true,
          id: true,
        }
      },
    },
  });
  if (Bet.opponentUserId === loggedInUserId) {
    if (Bet.isOpponentUserWinAmount) {
      return {
        win: true,
        winAmount: Bet.resultAmountOpponentUser,
        data: Bet
      }
    } else {
      return {
        win: false,
        loseAmount: Bet.resultAmountOpponentUser,
        data: Bet
      }
    }
  } else if (Bet.requestUserId === loggedInUserId) {
    if (Bet.isRequestUserWinAmount) {
      return {
        win: true,
        winAmount: Bet.resultAmountRequestUser,
        data: Bet
      }
    } else {
      return {
        win: false,
        loseAmount: Bet.resultAmountRequestUser,
        data: Bet
      }
    }
  } else {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
};

const resultBetVerified = async (loggedInUserId: number, betId: number, isSatisfied: Boolean) => {
  const Bet = await prisma.OneToOneBat.findUnique({
    where: {
      id: betId
    }
  });
  if (!Bet) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Bet Data not found"
    );
  }
  if (Bet.status !== "RESULT_DECLARED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can only repond when status is `RESULT_DECLARED`"
    );
  }
  let status = Bet.status;
  if (Bet.opponentUserId === loggedInUserId) {
    if (Bet.isOpponentUserResultSatisfied !== null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "you already respond to this result"
      );
    }
    if (Bet.isRequestUserResultSatisfied !== null) {
      status = (Bet.isRequestUserResultSatisfied && isSatisfied) ? "COMPLETED" : "RESULT_NOT_SATISFIED"
    }
    await prisma.OneToOneBat.update({
      where: {
        id: betId
      },
      data: {
        isOpponentUserResultSatisfied: isSatisfied ? true : false,
        status: status
      }
    });
  } else if (Bet.requestUserId === loggedInUserId) {
    if (Bet.isRequestUserResultSatisfied !== null) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "you already respond to this result"
      );
    }
    if (Bet.isOpponentUserResultSatisfied !== null) {
      status = (Bet.isOpponentUserResultSatisfied && isSatisfied) ? "COMPLETED" : "RESULT_NOT_SATISFIED"
    }
    await prisma.OneToOneBat.update({
      where: {
        id: betId
      },
      data: {
        isRequestUserResultSatisfied: isSatisfied ? true : false,
        status: status
      }
    });
  } else {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
  if (status === "COMPLETED") {
    const opponentUserWallet = await prisma.UserWallet.findFirst({
      where: {
        isDeleted: false,
        userId: Bet.opponentUserId
      }
    });
    if (opponentUserWallet) {
      await prisma.UserWallet.update({
        where: {
          userId: Bet.opponentUserId
        }, data: {
          balance: Bet.isOpponentUserWinAmount ? opponentUserWallet.balance + (Bet.resultAmountOpponentUser - Bet.opponentUserAmount) : opponentUserWallet.balance + Bet.resultAmountOpponentUser
        }
      });
    } else {
      await prisma.UserWallet.create({
        data: {
          userId: Bet.opponentUserId,
          balance: Bet.isOpponentUserWinAmount ? (Bet.resultAmountOpponentUser - Bet.opponentUserAmount) : Bet.resultAmountOpponentUser
        }
      });
    }

    const requestUserWallet = await prisma.UserWallet.findFirst({
      where: {
        isDeleted: false,
        userId: Bet.requestUserId
      }
    });
    if (requestUserWallet) {
      await prisma.UserWallet.update({
        where: {
          userId: Bet.requestUserId
        }, data: {
          balance: Bet.isRequestUserWinAmount ? requestUserWallet.balance + (Bet.resultAmountRequestUser - Bet.requestUserAmount) : requestUserWallet.balance + Bet.resultAmountRequestUser
        }
      });
    } else {
      await prisma.UserWallet.create({
        data: {
          userId: Bet.requestUserId,
          balance: Bet.isRequestUserWinAmount ? (Bet.resultAmountRequestUser - Bet.requestUserAmount) : Bet.resultAmountRequestUser
        }
      });
    }
  }
  return await prisma.OneToOneBat.findUnique({
    where: {
      id: betId
    }
  });
};

const completeResultBet = async (betId: number) => {
  const Bet = await prisma.OneToOneBat.findUnique({
    where: {
      id: betId
    },
  });
  if (!Bet) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
  if (Bet.status !== "RESULT_SATISFIED") {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You can only repond when status is `RESULT_SATISFIED`"
    );
  }

  return await prisma.OneToOneBat.update({
    where: {
      id: betId
    },
    data: {
      status: "COMPLETED"
    }
  });
};

const listBetsByStatus = async (loggedInUserId: number, status: String) => {
  const list = await prisma.OneToOneBat.findMany({
    where: {
      AND: [
        {
          OR: [
            { requestUserId: loggedInUserId },
            { opponentUserId: loggedInUserId }
          ]
        },
        { status: status }
      ]
    },
  });
  if (list && list.length == 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "bet data not found"
    );
  }
  return list;
};
export default { listBetsByStatus, completeResultBet, resultBetVerified, getResultBet, responseBet, requestListBetByUserId, listBetsByUserId, resultBet, createBet };
