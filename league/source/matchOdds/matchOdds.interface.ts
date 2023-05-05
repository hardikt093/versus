export interface IinputmatchOddsListBySportsAndEvent {
    skip: number,
    limit: number,
    sportsType : sportsType,
    matchId : number
  }
  export interface IinputmatchData {
    localTeamId : number,
    awayTeamId : number,
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