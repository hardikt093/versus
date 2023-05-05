import Joi from "@hapi/joi";

const matchListBySports = {
  body: Joi.object().keys({
    skip: Joi.number().required(),
    limit: Joi.number().required(),
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
  })
};

export default { matchListBySports };
