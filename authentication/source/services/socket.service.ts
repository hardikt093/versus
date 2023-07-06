import { io } from "../server";
let connectedUsers: any = {};
export const socketHandShake = () => {
    io.on("connection", (sockets) => {
        sockets.on("userConnected", (userId) => {
            const room = userId;
            sockets.join(room);
            connectedUsers[room] = sockets.id;
        });
    });
};
export const authSocket = async (
    eventName: string,
    user: number,
    data: object | Array<object>
) => {
    const filter = connectedUsers[user];
    io.to(filter).emit(eventName, data);
};


