export interface ICreateBetRequest {
    opponentUserId: number,
    amount: number,
    requestUserTeamId:  number,
    matchId: number
}

export interface IresponseBetRequest {
    isAccepted: boolean,
    amount?: number,
    teamId?: string
}

enum sportsType {
    SOCCER,
    BASKET,
    TENNIS,
    TABLE_TENNIS,
    HOCKEY,
    FOOTBALL,
    BASEBALL,
    VOLLEYBALL
}