import httpStatus from "http-status";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import AppError from "../utils/AppError";
import { ICreateOneToOneBatRequest } from "./bet.interface";


const createBet = async (loggedInUserId: number, data: ICreateOneToOneBatRequest) => {
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
  const matchData = await prisma.Match.findUnique({
    where: {
      id: data.matchId
    }
  });

  if (!matchData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Match data not found"
    );
  }
  if (matchData.sportsType !== data.sportsType || matchData.isDeleted === true) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Match data not found"
    );
  }
  if (matchData.localTeamId !== data.requestUserTeamId && matchData.awayTeamId !== data.requestUserTeamId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Your Team is Not Found in this Match"
    );
  }

  const matchOddsData = await prisma.MatchOdds.findFirst({
    where: {
      isDeleted: false,
      matchId: data.matchId
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      localTeam: true,
      awayTeam: true,
      match: true,
    }
  });



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

  const betFound = await prisma.OneToOneBat.findFirst({
    where: {
      OR: [
        { requestUserId: loggedInUserId },
        { opponentUserId: loggedInUserId },
      ],
      matchId: data.matchId,
    }
  });

  if (betFound) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "You already applied on this match"
    )
  }
  const preparedBetObject = {
    requestUserId: loggedInUserId,
    opponentUserId: data.opponentUserId,
    requestUserAmount: data.amount,
    type: data.type,
    sportsType: data.sportsType,
    requestUserTeamId: data.requestUserTeamId,
    matchId: data.matchId,
    matchEventId: matchOddsData.match.matchEventId,
    matchOddsId: matchOddsData.id,
    requestUserOdds: (matchOddsData.localTeamId === data.requestUserTeamId ? matchOddsData.localTeamOdd : matchOddsData.awayTeamOdd),
  };
  const createOneToOneBat = await prisma.OneToOneBat.create({
    data: preparedBetObject,
  }
  );

  const createdOneToOneBat = await prisma.OneToOneBat.findUnique({
    where: {
      id: createOneToOneBat.id,
    },
    include: {
      "matchOdds": true,
      "requestUserTeam": true,
      "matchEvent": true,
      "match": true,
      opponentUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userName: true,
          profileImage: true
        }
      }
    }
  });
  return createdOneToOneBat;
};
export default { createBet };
