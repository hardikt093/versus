export interface ICreateBetRequest {
    opponentUserId: number,
    amount: number,
    goalServeRequestUserTeamId:  number,
    goalServeOpponentUserTeamId:  number,
    goalServeLeagueId:  number,
    leagueType:  string,
    oddType:  string,
    goalServeMatchId: number,
    requestUserGoalServeOdd: number,
    opponentUserGoalServeOdd : number,
}

export interface IresponseBetRequest {
    isAccepted: boolean,
    amount?: number,
    teamId?: string
}

export interface IlistBetCondition {
    $or: [{ requestUserId: number }, { opponentUserId: number }],
    isDeleted: boolean,
    status?: string
}

export interface IlistBetRequestData {
    size? : number,
    page? : number,
    type?: IlistBetTypes
}

export enum IlistBetTypes {
   ALL = "ALL",
   OPEN = "OPEN",
   ACTIVE = "ACTIVE",
   WON = "WON",
   SETTLED = "SETTLED",
   LOST = "LOST",
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