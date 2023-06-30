const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const walletDeduction = async (amount: number, userId: number) => {
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
        amount: amount,
      },
    });
    return updateWallet;
  }
};

export default {
  walletDeduction,
};
