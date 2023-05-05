export interface IinputmatchListBySportsAndEvent {
    skip: number,
    limit: number,
    sportsType : sportsType,
    matchEventId : string
  }
  export interface IinputmatchData {
    localTeamId : string,
    awayTeamId : string,
    scheduledAt: Date,
    sportsType : sportsType,
    matchEventId : number
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