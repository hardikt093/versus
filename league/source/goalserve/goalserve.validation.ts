import Joi from "@hapi/joi";
const createLeague = {
  body: Joi.object().keys({
    name: Joi.string(),
    year: Joi.string().allow(null, ""),
    goalServeLeagueId: Joi.number(),
  }),
};

const updateLeague = {
  body: Joi.object().keys({
    name: Joi.string().allow(null, ""),
    year: Joi.string().allow(null, ""),
  }),
  params: Joi.object().keys({
    id: Joi.string(),
  }),
};

const deleteApi = {
  params: Joi.object().keys({
    id: Joi.string(),
  }),
};
const createPlayer = {
  body: Joi.object().keys({
    image: Joi.string().allow(null, ""),
    name: Joi.string(),
    leagueId: Joi.string().allow(null, ""),
    teamId: Joi.string().allow(null, ""),
    age: Joi.number(),
    bats: Joi.string().allow(null, "").valid("R", "L", "B"),
    height: Joi.string(),
    goalServePlayerId: Joi.number(),
    number: Joi.number(),
    position: Joi.string().valid(
      "RP",
      "LP",
      "SS",
      "1B",
      "C",
      "2B",
      "3B",
      "LF",
      "RF",
      "CF",
      "SP",
      "DH",
      "OF"
    ),
    salary: Joi.string().allow(null, ""),
    throws: Joi.string().allow(null, "").valid("R", "L", "B"),
    weight: Joi.string(),
  }),
};

const updatePlayer = {
  body: Joi.object().keys({
    image: Joi.string().allow(null, ""),
    name: Joi.string().allow(null, ""),
    leagueId: Joi.string().allow(null, ""),
    teamId: Joi.string().allow(null, ""),
    age: Joi.number().allow(null, ""),
    bats: Joi.string().allow(null, "").valid("R", "L", "B"),
    height: Joi.string().allow(null, ""),
    number: Joi.number().allow(null, ""),
    position: Joi.string()
      .allow(null, "")
      .valid("RP", "LP", "SS", "1B", "C", "2B", "3B", "LF", "RF", "CF", "SP", "DH","OF"),
    salary: Joi.string().allow(null, ""),
    throws: Joi.string().allow(null, "").valid("R", "L", "B"),
    weight: Joi.string().allow(null, ""),
  }),
  params: Joi.object().keys({
    id: Joi.string(),
  }),
};

const updateTeam = {
  body: Joi.object().keys({
    logo: Joi.string().allow(null, ""),
    name: Joi.string().allow(null, ""),
    leagueId: Joi.string().allow(null, ""),
    position: Joi.number().allow(null, ""),
    won: Joi.number().allow(null, ""),
    lost: Joi.number().allow(null, ""),
    games_back: Joi.number().allow(null, ""),
    home_record: Joi.string().allow(null, ""),
    runs_scored: Joi.number().allow(null, ""),
    away_record: Joi.string().allow(null, ""),
    runs_allowed: Joi.number().allow(null, ""),
    runs_diff: Joi.number().allow(null, ""),
    current_streak: Joi.string().allow(null, ""),
    goalServeTeamId: Joi.number().allow(null, ""),
    divisionId: Joi.string().allow(null, ""),
  }),
  params: Joi.object().keys({
    id: Joi.string(),
  }),
};

const createTeam = {
  body: Joi.object().keys({
    logo: Joi.string(),
    name: Joi.string(),
    leagueId: Joi.string(),
    position: Joi.number(),
    won: Joi.number(),
    lost: Joi.number(),
    games_back: Joi.number(),
    home_record: Joi.string(),
    runs_scored: Joi.number(),
    away_record: Joi.string(),
    runs_allowed: Joi.number(),
    runs_diff: Joi.number(),
    current_streak: Joi.string(),
    goalServeTeamId: Joi.number(),
    divisionId: Joi.string(),
  }),
};
export default {
  createLeague,
  updateLeague,
  deleteApi,
  createPlayer,
  updatePlayer,
  updateTeam,
  createTeam,
};
