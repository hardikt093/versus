const { PrismaClient } = require("@prisma/client");

import { io } from "../server";
import { HandshakeUserId, IConversation, IMessage } from "../interfaces/input";

const prisma = new PrismaClient();
const onlineUsers = new Map();

const connection = async (userId: any, socket: any) => {
  if (userId > 0) {
    onlineUsers.set(+userId, { socketRef: socket.id });
    await prisma.contactTry.updateMany({
      where: {
        userId,
      },
      data: {
        status: "online",
      },
    });
    io.emit("onlineUsers", Array.from(onlineUsers));
  } else {
    return;
  }
};

const disconnect = async (userId: HandshakeUserId, socket: any) => {
  if (userId) {
    onlineUsers.delete(+userId);
    await prisma.contactTry.updateMany({
      where: {
        userId,
      },
      data: {
        status: "offline",
      },
    });
    socket.disconnect();
    io.emit("onlineUsers", Array.from(onlineUsers));
  }
};

const myMessage = async (
  message: IMessage,
  conversation: IConversation,
  myUserId: number
) => {
  console.log("in my msg");
  const myUser = await prisma.user.findUnique({ where: { id: myUserId } });
  const newMessage = await prisma.message.create({
    include: {
      from: { select: { userName: true, id: true } },
      to: { select: { userName: true, id: true } },
      reaction: {
        select: {
          reaction: true,
          from: { select: { userName: true, id: true } },
        },
      },
      threads: {
        select: {
          text: true,
          from: { select: { userName: true, id: true } },
          filePath: true,
        },
      },
    },
    data: { ...message },
  });
  const filteredMyUserId = conversation.participants.filter(
    (id) => id !== myUserId
  );
  const otherUserId = filteredMyUserId[0];

  const relatedUser = await prisma.user.findUnique({
    where: { id: otherUserId },
  });
  const isRelatedUserOnline = onlineUsers.has(relatedUser?.id);
  const isContactExists = await prisma.contactTry.findFirst({
    where: { userId: otherUserId, contactUserId: myUser?.id },
  });

  if (!isContactExists) {
    if (!relatedUser || !myUser) {
      return;
    }

    const newContact = await prisma.contactTry.create({
      data: {
        contactUserId: myUserId,
        conversationId: conversation.id,
        userId: relatedUser.id,
        unreadMessages: 1,
      },
    });

    if (isRelatedUserOnline) {
      io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
        "newContact",
        newContact
      );
    }
  }
  if (isContactExists) {
    const prevUnreadMessages = isContactExists.unreadMessages;
    const contactId = isContactExists.id;
    let updatedUnreadMessagesCount = prevUnreadMessages;
    const onlineUser = onlineUsers.get(otherUserId);
    if (
      onlineUser?.conversationId !== message.conversationId &&
      !!onlineUser?.conversationId
    ) {
      updatedUnreadMessagesCount = prevUnreadMessages + 1;
    }

    const updatedContact = await prisma.contactTry.update({
      include: {
        contactUser: {
          select: { userName: true, id: true },
        },
      },

      where: { id: contactId },
      data: {
        unreadMessages: updatedUnreadMessagesCount,
      },
    });

    if (isRelatedUserOnline) {
      io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
        "newMessage",
        newMessage
      );
      io.to(onlineUsers.get(otherUserId)?.socketRef).emit(
        "updateContactValues",
        updatedContact
      );
    }
  }
  // this flow is going to run at the end of the message event dosent matter on any condition
  // send message to myself
  io.to(onlineUsers.get(myUserId)?.socketRef).emit("selfMessage", newMessage);
};

const editMessage = async (
  myUserId: number,
  text: string,
  conversationId: number,
  messageId: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    return;
  }

  const updateMessage = await prisma.message.updateMany({
    where: {
      AND: [{ id: messageId }, { fromId: myUserId }],
    },
    data: {
      text,
    },
  });

  io.emit("newMessage", updateMessage);
  return updateMessage;
};

const deleteMessage = async (conversationId: number, messageId: number) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    return;
  }

  const deleteMessage = await prisma.message.delete({
    where: {
      id: messageId,
    },
  });
  io.emit("newMessage", deleteMessage);
  return deleteMessage;
};

const messageReaction = async (
  reaction: string,
  conversationId: number,
  messageId: number,
  myUserId: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    return;
  }

  const newReaction = await prisma.messageReaction.create({
    data: { messageId, reaction, fromId: myUserId },
    include: {
      from: { select: { userName: true, id: true } },
    },
  });
  io.emit("newMessage", newReaction);
  return newReaction;
};

const messageThread = async (
  text: string,
  messageId: number,
  myUserId: number,
  conversationId: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    return;
  }

  const newThread = await prisma.threads.create({
    data: { messageId, text, fromId: myUserId },
    include: {
      from: { select: { userName: true, id: true } },
    },
  });
  io.emit("newMessage", newThread);
  return newThread;
};
const conversationChange = async (
  conversationId: number,
  myUserId: number,
  socket: any
) => {
  try {
    onlineUsers.set(myUserId, {
      socketRef: socket.id,
      conversationId: conversationId || null,
    });
    const contact = await prisma.contactTry.findFirst({
      where: { userId: myUserId, conversationId },
    });
    if (!contact) {
      return;
    }
    const updatedContact = await prisma.contactTry.update({
      include: {
        contactUser: {
          select: { userName: true, id: true },
        },
      },
      where: { id: contact.id },
      data: {
        unreadMessages: 0,
      },
    });
    io.emit("updateMyContact", updatedContact);
  } catch (error) {
    console.log(error);
  }
};

export {
  conversationChange,
  messageThread,
  messageReaction,
  connection,
  myMessage,
  editMessage,
  deleteMessage,
  disconnect,
};
