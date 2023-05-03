import Joi from "@hapi/joi";

const createBet = {
  body: Joi.object().keys({
    opponentUserId: Joi.number().required(),
    amount: Joi.number().required(),
    type: Joi.string().valid("TEAM", "PLAYERS").required(),
    sportsType: Joi.string().valid(
      "SOCCER",
      "BASKET",
      "TENNIS",
      "TABLE_TENNIS",
      "HOCKEY",
      "FOOTBALL",
      "BASEBALL",
      "VOLLEYBALL"
    ).required(),
    requestUserTeamId: Joi.string().required(),
    matchId: Joi.string().required(),
  })
};
const responseBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    isAccepted: Joi.boolean().required(),
    amount : Joi.number().when('isAccepted', {
      is: true,
      then: Joi.number().required()
    }),
    teamId : Joi.string().when('isAccepted', {
      is: true,
      then: Joi.string().required()
    }),
  })
};

const responseToBatResultSatisfiedOrNot = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    isSatisfied: Joi.boolean().required()
  })
};

const resultBet = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    winTeamId: Joi.string().required()
  })
};

const listBetsByStatus = {
  body: Joi.object().keys({
    status: Joi.string().valid(
      "REQUESTED",
      "ACCEPTED",
      "REJECTED",
      "IN_PROGRESS",
      "RESULT_DECLARED",
      "RESULT_SATISFIED",
      "RESULT_NOT_SATISFIED",
      "COMPLETED"
    ).required()
  })
};

export default { listBetsByStatus, responseToBatResultSatisfiedOrNot, resultBet, createBet, responseBet };
