const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createChannel = async (data: any) => {
    const findChannel = await prisma.channelUser.groupBy({
        by: ['userId','channelId'],
        where:{
            userId:{
                in: data.users.map((user:any) => user.id)
            }
        }
    })
};

export default { createChannel };
