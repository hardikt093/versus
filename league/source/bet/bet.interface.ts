export interface ICreateBetRequest {
    opponentUserId: number,
    amount: number,
    type: BetType,
    requestUserTeamId: number,
    matchId: number,
    sportsType: sportsType
}

export interface IresponseBetRequest {
    isAccepted: boolean,
    amount?: number,
    teamId?: number
}

enum BetType {
    TEAM,
    PLAYERS
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