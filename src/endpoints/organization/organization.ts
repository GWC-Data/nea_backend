import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import {
  createOrganizationValidator,
  updateOrganizationValidator,
  getOrganizationValidator,
  deleteOrganizationValidator,
} from './organization.validator';
import {
  createOrganizationHandler,
  getAllOrganizationsHandler,
  getOrganizationByIdHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationDashboardHandler,
  addUserToOrganizationHandler,
  getOrganizationLeaderboardHandler,
  getOrganizationDetailsHandler,
} from './organization.handler';

// ✅ POST - Create Organization (no auth required for registration)
export const createOrganizationEndpoint = new Endpoint({
  path: '/organizations',
  method: EndpointMethod.POST,
  handler: createOrganizationHandler,
  authType: EndpointAuthType.NONE,
  validator: createOrganizationValidator,
});

// ✅ GET - Organization Leaderboard (no auth required)
export const getOrganizationLeaderboardEndpoint = new Endpoint({
  path: '/organizations/leaderboard/top',
  method: EndpointMethod.GET,
  handler: getOrganizationLeaderboardHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

// ✅ MORE SPECIFIC ROUTES BEFORE GENERIC ONES
export const getOrganizationDashboardEndpoint = new Endpoint({
  path: '/organization/dashboard',
  method: EndpointMethod.GET,
  handler: getOrganizationDashboardHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getOrganizationDetailsEndpoint = new Endpoint({
  path: '/organization/details',
  method: EndpointMethod.GET,
  handler: getOrganizationDetailsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const addUserToOrganizationEndpoint = new Endpoint({
  path: '/organization/:orgId/users',
  method: EndpointMethod.POST,
  handler: addUserToOrganizationHandler,
  authType: EndpointAuthType.JWT,
  validator: getOrganizationValidator,
});

// ✅ GENERIC ROUTES - Must be last
export const getAllOrganizationsEndpoint = new Endpoint({
  path: '/organizations',
  method: EndpointMethod.GET,
  handler: getAllOrganizationsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getOrganizationByIdEndpoint = new Endpoint({
  path: '/organizations/:orgId',
  method: EndpointMethod.GET,
  handler: getOrganizationByIdHandler,
  authType: EndpointAuthType.JWT,
  validator: getOrganizationValidator,
});

export const updateOrganizationEndpoint = new Endpoint({
  path: '/organizations/:orgId',
  method: EndpointMethod.PUT,
  handler: updateOrganizationHandler,
  authType: EndpointAuthType.JWT,
  validator: updateOrganizationValidator,
});

export const deleteOrganizationEndpoint = new Endpoint({
  path: '/organizations/:orgId',
  method: EndpointMethod.DELETE,
  handler: deleteOrganizationHandler,
  authType: EndpointAuthType.JWT,
  validator: deleteOrganizationValidator,
});
