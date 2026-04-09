// endpoints/event-logs/event-logs.ts

import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import { wasteImageUpload } from 'config/multerConfig';
import {
  getAllEventLogsHandler,
  getEventLogByIdHandler,
  createEventLogHandler,
  updateEventLogHandler,
  deleteEventLogHandler,
  getEventLogsByUserHandler,
  getEventLogsByEventHandler,
  getUserEventLogsByDateHandler,
  getEventLogsByDateRangeHandler,
  getUserRewardsSummaryHandler
} from './event-logs.handler';

export const createEventLogEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.POST,
  handler: createEventLogHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [wasteImageUpload.single('wasteImage')]
});

export const getAllEventLogsEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.GET,
  handler: getAllEventLogsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventLogByIdEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.GET,
  handler: getEventLogByIdHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const updateEventLogEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.PUT,
  handler: updateEventLogHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [wasteImageUpload.single('wasteImage')]
});

export const deleteEventLogEndpoint = new Endpoint({
  path: '/event-logs/:id',
  method: EndpointMethod.DELETE,
  handler: deleteEventLogHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventLogsByUserEndpoint = new Endpoint({
  path: '/event-logs/user',
  method: EndpointMethod.GET,
  handler: getEventLogsByUserHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventLogsByEventEndpoint = new Endpoint({
  path: '/event-logs/event/:eventId',
  method: EndpointMethod.GET,
  handler: getEventLogsByEventHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getUserEventLogsByDateEndpoint = new Endpoint({
  path: '/event-logs/user/date/:date',
  method: EndpointMethod.GET,
  handler: getUserEventLogsByDateHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventLogsByDateRangeEndpoint = new Endpoint({
  path: '/event-logs/date-range',
  method: EndpointMethod.POST,
  handler: getEventLogsByDateRangeHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getUserRewardsSummaryEndpoint = new Endpoint({
  path: '/event-logs/user/rewards',
  method: EndpointMethod.GET,
  handler: getUserRewardsSummaryHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});