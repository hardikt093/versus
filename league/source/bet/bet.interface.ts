export interface ICreateOneToOneBatRequest {
    opponentUserId: number,
    amount: number,
    type: OneToOneBatType,
    requestUserTeamId: number,
    matchId: number,
    sportsType: sportsType
}

export interface IresponseOneToOneBatRequest {
    isAccepted: boolean,
    amount?: number,
    teamId?: number
}

enum OneToOneBatType {
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