import { Endpoint, EndpointMethod, EndpointAuthType } from 'node-server-engine';
import {
  createEventRequestHandler,
  getAllEventRequestsHandler,
  getMyEventRequestsHandler,
  updateEventRequestStatusHandler,
} from './event-requests.handler';

export const createEventRequestEndpoint = new Endpoint({
  method: EndpointMethod.POST,
  path: '/event-requests',
  handler: createEventRequestHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getMyEventRequestsEndpoint = new Endpoint({
  method: EndpointMethod.GET,
  path: '/event-requests/my',
  handler: getMyEventRequestsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getAllEventRequestsEndpoint = new Endpoint({
  method: EndpointMethod.GET,
  path: '/event-requests',
  handler: getAllEventRequestsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const updateEventRequestStatusEndpoint = new Endpoint({
  method: EndpointMethod.PUT,
  path: '/event-requests/:id/status',
  handler: updateEventRequestStatusHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});
