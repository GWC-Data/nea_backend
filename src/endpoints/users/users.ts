import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import {  updateUserValidator } from './users.validator';
// import { getFullUserProfileValidator } from './fullProfile.validator';

import {
  getAllUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  getUserProfileHandler,
  getAllUsersProfileHandler,
  getUserLeaderboardHandler
} from './users.handler';
// import { getFullUserProfileHandler } from './fullProfile.handler';

export const createUserEndpoint = new Endpoint({
  path: '/users',
  method: EndpointMethod.POST,
  handler: createUserHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
  // middleware: [middleware.checkPermission('CreateUser')]
});

export const getAllUserEndpoint = new Endpoint({
  path: '/users',
  method: EndpointMethod.GET,
  handler: getAllUsersHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  // middleware: [middleware.checkPermission('GetUser')]
});

export const getUserByIdEndpoint = new Endpoint({
  path: '/users/details',
  method: EndpointMethod.GET,
  handler: getUserByIdHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  // middleware: [middleware.checkPermission('GetUser')]
});

// export const getFullUserProfileEndpoint = new Endpoint({
//   path: '/users/full-profile/:userId',
//   method: EndpointMethod.GET,
//   handler: getFullUserProfileHandler,
//   authType: EndpointAuthType.JWT,
//   validator: getFullUserProfileValidator,
// });

export const updateUserEndpoint = new Endpoint({
  path: '/users',
  method: EndpointMethod.PUT,
  handler: updateUserHandler,
  authType: EndpointAuthType.JWT,
  validator: updateUserValidator,
  // middleware: [middleware.checkPermission('UpdateUser')]
});

export const deleteUserEndpoint = new Endpoint({
  path: '/users',
  method: EndpointMethod.DELETE,
  handler: deleteUserHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  // middleware: [middleware.checkPermission('DeleteUser')]
});

// User Profile Endpoints
export const getUserProfileEndpoint = new Endpoint({
  path: '/users/profile',
  method: EndpointMethod.GET,
  handler: getUserProfileHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getAllUsersProfileEndpoint = new Endpoint({
  path: '/users-profiles',
  method: EndpointMethod.GET,
  handler: getAllUsersProfileHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getUserLeaderboardEndpoint = new Endpoint({
  path: '/users/leaderboard/top',
  method: EndpointMethod.GET,
  handler: getUserLeaderboardHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});
