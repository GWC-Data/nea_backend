import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import {
  createGroupValidator,
  updateGroupValidator,
  getGroupValidator,
  deleteGroupValidator
} from './groups.validator';
import {
  getAllGroupsHandler,
  getGroupByIdHandler,
  createGroupHandler,
  updateGroupHandler,
  deleteGroupHandler,
  getGroupUsersHandler
} from './groups.handler';

export const createGroupEndpoint = new Endpoint({
  path: '/groups',
  method: EndpointMethod.POST,
  handler: createGroupHandler,
  authType: EndpointAuthType.NONE,
  validator: createGroupValidator,
});

export const getAllGroupsEndpoint = new Endpoint({
  path: '/groups',
  method: EndpointMethod.GET,
  handler: getAllGroupsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getGroupByIdEndpoint = new Endpoint({
  path: '/groups/:groupId',
  method: EndpointMethod.GET,
  handler: getGroupByIdHandler,
  authType: EndpointAuthType.NONE,
  validator: getGroupValidator,
});

export const updateGroupEndpoint = new Endpoint({
  path: '/groups/:groupId',
  method: EndpointMethod.PUT,
  handler: updateGroupHandler,
  authType: EndpointAuthType.NONE,
  validator: updateGroupValidator,
});

export const deleteGroupEndpoint = new Endpoint({
  path: '/groups/:groupId',
  method: EndpointMethod.DELETE,
  handler: deleteGroupHandler,
  authType: EndpointAuthType.NONE,
  validator: deleteGroupValidator,
});

export const getGroupUsersEndpoint = new Endpoint({
  path: '/groups/:groupId/users',
  method: EndpointMethod.GET,
  handler: getGroupUsersHandler,
  authType: EndpointAuthType.NONE,
  validator: getGroupValidator,
});