import { number } from "joi";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

import { authSocket } from "../services/socket.service";
import authService from "../auth/auth.service"


const walletDeduction = async (amount: number, userId: number, body: any) => {
  const findWallet = await prisma.wallet.findUnique({
    where: {
      userId: userId,
    },
  });
  if (findWallet) {
    const balance = findWallet.amount - amount;
    const updateWallet = await prisma.wallet.update({
      where: {
        userId: userId,
      },
      data: {
        amount: parseFloat((balance).toFixed(2)),
      },
    });
    await prisma.holdAmount.create({
      data: {
        walletId: updateWallet.id,
        userId: userId,
        amount: parseFloat((amount).toFixed(2)),
        goalServeMatchId: body.betData.goalServeMatchId,
        requestUserId: body.betData.requestUserId,
        opponentUserId: body.betData.opponentUserId,
        requestUserBetAmount: parseFloat((body.betData.requestUserBetAmount).toFixed(2)),
        opponentUserBetAmount: parseFloat((body.betData.opponentUserBetAmount).toFixed(2)),
        goalServeLeagueId: body.betData.goalServeLeagueId,
        betId: body.betData._id
      },
    });
    return updateWallet;
  }
};
const checkBalance = async (data: { userId: string | number, requestAmount: number | string }) => {
  return await prisma.wallet.findMany({
    where: {
      userId: Number(data?.userId),
      amount: {
        gt: Number(data.requestAmount)
      }
    }
  })

}

const revertAmount = async (amount: number, userId: number, body: any) => {
  const updateHoldingAmount = await prisma.holdAmount.updateMany({
    where: {
      AND: [
        { betId: body._id, },
        { userId: userId, }
      ]
    },
    data: {
      revertAmount: parseFloat((amount).toFixed(2))
    }
  })
  const findWallet = await prisma.wallet.findUnique({
    where: {
      userId: userId
    }
  })
  const finalAmount = findWallet.amount + amount
  const updateWallet = await prisma.wallet.update({
    where: {
      userId: userId
    },
    data: {
      amount: parseFloat((finalAmount).toFixed(2))
    }
  })
  // call socket 
  await authSocket("getUser", userId, await authService.getUser({ id: userId }))

  return true
}

const paymentRelease = async (amount: string | number, userId: string | number, body: any) => {
  try {
    const removeHoldingAmount = await prisma.holdAmount.updateMany({
      where: {
        userId: userId,
        betId: body._id
      },
      data: {
        amount: 0
      }
    })
    const findWallet = await prisma.wallet.findUnique({
      where: {
        userId: userId
      }
    })
    const finalAmount = findWallet.amount + amount
    const releaseAmountToWallet = await prisma.wallet.update({
      where: {
        userId: userId
      },
      data: {
        amount: parseFloat((finalAmount).toFixed(2))
      }
    })
    return true
  } catch (error: any) {
    console.log("error", error)
  }
}

export default {
  walletDeduction,
  checkBalance,
  revertAmount,
  paymentRelease
};
