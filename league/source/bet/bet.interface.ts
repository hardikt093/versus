export interface ICreateBetRequest {
    opponentUserId: number,
    amount: number,
    requestUserTeamId:  string,
    matchId: string,
    sportsType: sportsType
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