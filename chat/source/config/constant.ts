const ROLES = {
	ADMIN: 'Admin',
	USER: 'User'
};
const STATUS = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive',
	DELETE: 'Delete'
};
const TOKEN_TYPE = {
	ACCESS_TOKEN: 1,
	REFRESH_TOKEN: 2,
	VERIFICATION_TOKEN: 3,
	RESET_PASSWORD: 4,
};
export default {
	ROLES,
	TOKEN_TYPE,
	STATUS
};
