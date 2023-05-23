import httpStatus from "http-status";
import { Request, Response } from "express";
import createResponse from "../utils/response";
import goalserveService from "./goalserve.service";

const baseballStandings = async (req: Request, res: Response) => {
  try {
    const getStandings = await goalserveService.getMLBStandings();
    createResponse(res, httpStatus.OK, "", getStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const mlbScoreWithDate = async (req: Request, res: Response) => {
  try {
    const mlbScoreWithDate = await goalserveService.mlbScoreWithDate(req.query);
    createResponse(res, httpStatus.OK, "", mlbScoreWithDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createLeague = async (req: Request, res: Response) => {
  try {
    const createLeague = await goalserveService.createLeague(req.body);
    createResponse(res, httpStatus.OK, "", createLeague);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const updateLeague = async (req: Request, res: Response) => {
  try {
    const updateLeague = await goalserveService.updateLeague(
      req.params,
      req.body
    );
    createResponse(res, httpStatus.OK, "", updateLeague);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const deleteLeague = async (req: Request, res: Response) => {
  try {
    const deleteLeague = await goalserveService.deleteLeague(req.params);
    createResponse(res, httpStatus.OK, "", deleteLeague);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getAllLeague = async (req: Request, res: Response) => {
  try {
    const getAllLeague = await goalserveService.getAllLeague();
    createResponse(res, httpStatus.OK, "", getAllLeague);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getAllPlayer = async (req: Request, res: Response) => {
  try {
    const getAllPlayer = await goalserveService.getAllPlayer();
    createResponse(res, httpStatus.OK, "", getAllPlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const deletePlayer = async (req: Request, res: Response) => {
  try {
    const deletePlayer = await goalserveService.deletePlayer(req.params);
    createResponse(res, httpStatus.OK, "", deletePlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createPlayer = async (req: Request, res: Response) => {
  try {
    const createPlayer = await goalserveService.createPlayer(req.body);
    createResponse(res, httpStatus.OK, "", createPlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const updatePlayer = async (req: Request, res: Response) => {
  try {
    const updatePlayer = await goalserveService.updatePlayer(
      req.params,
      req.body
    );
    createResponse(res, httpStatus.OK, "", updatePlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createTeam = async (req: Request, res: Response) => {
  try {
    const createTeam = await goalserveService.createTeam(req.body);
    createResponse(res, httpStatus.OK, "", createTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const updateTeam = async (req: Request, res: Response) => {
  try {
    const updateTeam = await goalserveService.updateTeam(req.params, req.body);
    createResponse(res, httpStatus.OK, "", updateTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const deleteTeam = async (req: Request, res: Response) => {
  try {
    const deleteTeam = await goalserveService.deleteTeam(req.params);
    createResponse(res, httpStatus.OK, "", deleteTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const getAllTeam = async (req: Request, res: Response) => {
  try {
    const getAllTeam = await goalserveService.getAllTeam();
    createResponse(res, httpStatus.OK, "", getAllTeam);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getAllDivison = async (req: Request, res: Response) => {
  try {
    const getAllDivison = await goalserveService.getAllDivison();
    createResponse(res, httpStatus.OK, "", getAllDivison);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const deleteDivision = async (req: Request, res: Response) => {
  try {
    const deleteDivision = await goalserveService.deleteDivision(req.params);
    createResponse(res, httpStatus.OK, "", deleteDivision);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const updateDivison = async (req: Request, res: Response) => {
  try {
    const updateDivison = await goalserveService.updateDivison(
      req.params,
      req.body
    );
    createResponse(res, httpStatus.OK, "", updateDivison);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const createDivison = async (req: Request, res: Response) => {
  try {
    const createDivison = await goalserveService.createDivison(req.body);
    createResponse(res, httpStatus.OK, "", createDivison);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const scoreWithCurrentDate = async (req: Request, res: Response) => {
  try {
    const scoreWithCurrentDate = await goalserveService.scoreWithCurrentDate();
    createResponse(res, httpStatus.OK, "", scoreWithCurrentDate);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addMatchData = async (req: Request, res: Response) => {
  try {
    const addMatch = await goalserveService.addMatchWithNewModel();
    createResponse(res, httpStatus.OK, "", {});
  } catch (error: any) {
    console.log("error", error);
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const addStanding = async (req: Request, res: Response) => {
  try {
    const addMatch = await goalserveService.addStanding();
    createResponse(res, httpStatus.OK, "", addMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const singleGameBoxScore = async (req: Request, res: Response) => {
  try {
    const singleGameBoxScore = await goalserveService.singleGameBoxScore(
      req.query
    );
    createResponse(res, httpStatus.OK, "", singleGameBoxScore);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addMatchDataFuture = async (req: Request, res: Response) => {
  try {
    const addMatchDataFuture = await goalserveService.addMatchDataFuture(
      req.body
    );
    createResponse(res, httpStatus.OK, "", {});
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const getBseballStandings = async (req: Request, res: Response) => {
  try {
    const getStanding = await goalserveService.getStandingData();
    createResponse(res, httpStatus.OK, "", getStanding);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const singleGameBoxScoreUpcomming = async (req: Request, res: Response) => {
  try {
    const singleGameBoxScoreUpcomming =
      await goalserveService.singleGameBoxScoreUpcomming(req.query);
    createResponse(res, httpStatus.OK, "", singleGameBoxScoreUpcomming);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const addInjuredPlayers = async (req: Request, res: Response) => {
  try {
    const addInjuredPlayers = await goalserveService.addInjuryReport();
    createResponse(res, httpStatus.OK, "", addInjuredPlayers);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const statsPlayerPitching = async (req: Request, res: Response) => {
  try {
    const statsPlayerPitching = await goalserveService.statsPlayerPitching();
    createResponse(res, httpStatus.OK, "", statsPlayerPitching);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};
const statsTeam = async (req: Request, res: Response) => {
  try {
    const teamStats = await goalserveService.teamStats();
    createResponse(res, httpStatus.OK, "", teamStats);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};


// NHL

const createTeamNHL = async (req: Request, res: Response) => {
  try {
    const createTeamNHL = await goalserveService.createTeamNHL(req.body);
    createResponse(res, httpStatus.OK, "", createTeamNHL);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const createTeamImageNHL = async (req: Request, res: Response) => {
  try {
    const createTeamImageNHL = await goalserveService.addNHLTeamImage(req.body);
    createResponse(res, httpStatus.OK, "", createTeamNHL);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
};

const addNhlMatch = async (req: Request, res: Response) => {
  try {
    const addNhlMatch = await goalserveService.addNhlMatch();
    createResponse(res, httpStatus.OK, "", addNhlMatch);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addNhlPlayer = async (req: Request, res: Response) => {
  try {
    const addNhlPlayer = await goalserveService.addNhlPlayer();
    createResponse(res, httpStatus.OK, "", addNhlPlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
const addNhlInjuredPlayer = async (req: Request, res: Response) => {
  try {
    const addNhlInjuredPlayer = await goalserveService.addNhlInjuredPlayer();
    createResponse(res, httpStatus.OK, "", addNhlInjuredPlayer);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const addNhlStandings = async (req: Request, res: Response) => {
  try {
    const addNhlStandings = await goalserveService.addNhlStandings();
    createResponse(res, httpStatus.OK, "", addNhlStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}

const getNhlStandings = async (req: Request, res: Response) => {
  try {
    const getNhlStandings = await goalserveService.getNHLStandingData();
    createResponse(res, httpStatus.OK, "", getNhlStandings);
  } catch (error: any) {
    createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
  }
}
export default {
  baseballStandings,
  mlbScoreWithDate,
  createLeague,
  updateLeague,
  deleteLeague,
  getAllLeague,
  getAllPlayer,
  deletePlayer,
  createPlayer,
  updatePlayer,
  createTeam,
  updateTeam,
  deleteTeam,
  getAllTeam,
  createDivison,
  updateDivison,
  deleteDivision,
  getAllDivison,
  scoreWithCurrentDate,
  addMatchData,
  addStanding,
  addMatchDataFuture,
  singleGameBoxScore,
  getBseballStandings,
  singleGameBoxScoreUpcomming,
  addInjuredPlayers,
  statsPlayerPitching,
  statsTeam,
  createTeamNHL,
  createTeamImageNHL,
  addNhlMatch,
  addNhlPlayer,
  addNhlInjuredPlayer,
  addNhlStandings,
  getNhlStandings
};
