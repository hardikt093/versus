export interface ICreateBetRequest {
    opponentUserId: number,
    amount: number,
    goalServeRequestUserTeamId:  number,
    goalServeOpponentUserTeamId:  number,
    goalServeLeagueId:  number,
    leagueType:  string,
    oddType:  string,
    goalServeMatchId: number,
    requestUserGoalServeOdd:  | string,
    opponentUserGoalServeOdd : number | string,
    requestUserFairOdds? : number,
    opponentUserFairOdds? : number,
    isConfirmed : boolean,
}

export interface IresponseBetRequest {
    isAccepted: boolean,
    amount?: number,
    teamId?: string
}

export interface IlistBetCondition {
    $and : [],
    $or: [],
    isDeleted: boolean,
    status?: string | object
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
export interface IOpponentCount {
    opponentUserId?:number|null,
    [opponentUserId:number]: number,
    count?:number |undefined
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