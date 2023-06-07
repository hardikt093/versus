import Joi from "@hapi/joi";

const scoreWithDate = {
  query: Joi.object().keys({
    date1: Joi.string().required(),
  }),
};

const scoreWithCurrentDate = {
  query: Joi.object().keys({
    date1: Joi.string().required(),
  }),
};

const singleGameBoxscore = {
  query: Joi.object().keys({
    goalServeMatchId: Joi.string().required(),
  }),
};

const nbaGetTeam = {
  query: Joi.object().keys({
    goalServeTeamId: Joi.string().required(),
  }),
};
export default { scoreWithDate, singleGameBoxscore, scoreWithCurrentDate ,nbaGetTeam};
