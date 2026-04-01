import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
// import {
//   createEventLogValidator,
//   updateEventLogValidator,
//   getEventLogValidator,
//   deleteEventLogValidator,
//   getEventLogsByUserValidator,
//   getEventLogsByEventValidator
// } from './event-logs.validator';
import {
  getAllEventLogsHandler,
  getEventLogByIdHandler,
  createEventLogHandler,
  updateEventLogHandler,
  deleteEventLogHandler,
  getEventLogsByUserHandler,
  getEventLogsByEventHandler,
  getUserEventLogsByDateHandler,
  getEventLogsByDateRangeHandler
} from './event-logs.handler';

export const createEventLogEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.POST,
  handler: createEventLogHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getAllEventLogsEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.GET,
  handler: getAllEventLogsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventLogByIdEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.GET,
  handler: getEventLogByIdHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const updateEventLogEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.PUT,
  handler: updateEventLogHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const deleteEventLogEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.DELETE,
  handler: deleteEventLogHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventLogsByUserEndpoint = new Endpoint({
  path: '/event-logs/user/:userId',
  method: EndpointMethod.GET,
  handler: getEventLogsByUserHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventLogsByEventEndpoint = new Endpoint({
  path: '/event-logs/event/:eventId',
  method: EndpointMethod.GET,
  handler: getEventLogsByEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getUserEventLogsByDateEndpoint = new Endpoint({
  path: '/event-logs/user/:userId/date/:date',
  method: EndpointMethod.GET,
  handler: getUserEventLogsByDateHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventLogsByDateRangeEndpoint = new Endpoint({
  path: '/event-logs/date-range',
  method: EndpointMethod.POST,
  handler: getEventLogsByDateRangeHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});