export interface IinputeventListBySports {
    skip: number,
    limit: number,
    sportsType : sportsType
  }
  export interface IaddNewEvent {
    name : string,
    shortName? : string,
    sportsType : sportsType
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