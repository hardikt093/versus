const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
        amount: balance,
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

export default {
  walletDeduction,
};
