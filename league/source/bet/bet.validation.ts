import Joi from "@hapi/joi";

const createBet = {
  body: Joi.object().keys({
    opponentUserId: Joi.number().required(),
    amount: Joi.number().required().min(1),
    goalServeRequestUserTeamId: Joi.number().required(),
    goalServeOpponentUserTeamId: Joi.number().required(),
    goalServeMatchId: Joi.number().required(),
    goalServeLeagueId : Joi.number().required(),
    leagueType : Joi.string().required(),
    oddType : Joi.string().required(),
    requestUserGoalServeOdd : Joi.string().required(),
    opponentUserGoalServeOdd : Joi.string().required(),
    requestUserFairOdds : Joi.number().required(),
    opponentUserFairOdds : Joi.number().required(),
    isConfirmed : Joi.boolean().required()
  }),
};
const responseBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    isConfirmed: Joi.boolean().required(),
  }),
};

const modifyBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    amount: Joi.number().required().min(1),
  }),
};

const responseToBatResultSatisfiedOrNot = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    isSatisfied: Joi.boolean().required(),
  }),
};

const resultBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    winTeamId: Joi.number().required(),
  }),
};

const listBetsByStatus = {
  body: Joi.object().keys({
    status: Joi.string()
      .valid(
        "PENDING",
        "CONFIRMED",
        "REJECTED",
        "ACTIVE",
        "RESULT_DECLARED",
        "RESULT_NOT_SATISFIED",
        "COMPLETED"
      )
      .required(),
  }),
};
const betLike={
  body:Joi.object().keys({
    betId:Joi.string().required(),
    isBetLike:Joi.boolean().required(),
  }),
}
const listbyType = {
  body: Joi.object().keys({
    size : Joi.number(),
    page : Joi.number(),
    type: Joi.string()
      .valid(
        "OPEN",
        "ACTIVE",
        "SETTLED",
        "WON",
        "LOST",
      ),
  }),
};

const deleteBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  })
};
export default {
  listBetsByStatus,
  responseToBatResultSatisfiedOrNot,
  resultBet,
  createBet,
  responseBet,
  modifyBet,
  listbyType,
  deleteBet,
  betLike
};
