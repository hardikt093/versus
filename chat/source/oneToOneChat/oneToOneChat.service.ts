const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createChannel = async (data: { users: Number[] }) => {
  const existingChannel = await prisma.channel.findFirst({
    where: {
      AND: [
        { channelType: "oneToOne" },
        {
          channelUser: {
            every: {
              userId: { in: data.users },
            },
          },
        },
      ],
    },
    include: {
      channelUser: true,
    },
  });
  if (existingChannel) {
    return existingChannel;
  } else {
    const newChannel = await prisma.channel.create({
      data: {
        channelType: "oneToOne",
        channelUser: {
          create: data.users.map((user: any) => ({
            userId: user,
            channelType: "oneToOne",
          })),
        },
      },
      include: {
        channelUser: true,
      },
    });
    return newChannel;
  }
};

export default { createChannel };
