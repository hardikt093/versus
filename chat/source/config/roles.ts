import constant from "./constant";

const roles = [constant.ROLES.ADMIN, constant.ROLES.USER];
const roleRights = new Map();

roleRights.set(roles[0], []);
roleRights.set(roles[1], []);

export { roles, roleRights };
