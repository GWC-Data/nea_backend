import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import {  updateUserValidator } from './users.validator';

import {
  getAllUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler
} from './users.handler';

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
  authType: EndpointAuthType.NONE,
  validator: {},
  // middleware: [middleware.checkPermission('GetUser')]
});

export const getUserByIdEndpoint = new Endpoint({
  path: '/users/:id',
  method: EndpointMethod.GET,
  handler: getUserByIdHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
  // middleware: [middleware.checkPermission('GetUser')]
});

export const updateUserEndpoint = new Endpoint({
  path: '/users/:id',
  method: EndpointMethod.PUT,
  handler: updateUserHandler,
  authType: EndpointAuthType.NONE,
  validator: updateUserValidator,
  // middleware: [middleware.checkPermission('UpdateUser')]
});

export const deleteUserEndpoint = new Endpoint({
  path: '/users/:id',
  method: EndpointMethod.DELETE,
  handler: deleteUserHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
  // middleware: [middleware.checkPermission('DeleteUser')]
});
