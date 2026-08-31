import type { UserWithRoles } from "#modules/users/user.types.js";

export const toDto = (user: UserWithRoles) => {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.roles,
  };
};
