import Joi from "@hapi/joi";

const createBet = {
  body: Joi.object().keys({
    opponentUserId: Joi.number().required(),
    amount: Joi.number().required().min(1),
    requestUserTeamId: Joi.number().required(),
    matchId: Joi.number().required(),
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

export default {
  listBetsByStatus,
  responseToBatResultSatisfiedOrNot,
  resultBet,
  createBet,
  responseBet,
  modifyBet,
};
