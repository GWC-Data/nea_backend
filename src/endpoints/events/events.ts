// endpoints/events/events.ts

import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
import {
  getAllEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getEventsByDateHandler,
  getUpcomingEventsHandler,
  joinEventHandler,
  leaveEventHandler,
  getEventParticipantsHandler,
  getUserJoinedEventsHandler,
  getPopularEventsHandler
} from './events.handler';

export const createEventEndpoint = new Endpoint({
  path: '/events',
  method: EndpointMethod.POST,
  handler: createEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getAllEventsEndpoint = new Endpoint({
  path: '/events',
  method: EndpointMethod.GET,
  handler: getAllEventsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventByIdEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.GET,
  handler: getEventByIdHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const updateEventEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.PUT,
  handler: updateEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const deleteEventEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.DELETE,
  handler: deleteEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventsByDateEndpoint = new Endpoint({
  path: '/events/date/:date',
  method: EndpointMethod.GET,
  handler: getEventsByDateHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getUpcomingEventsEndpoint = new Endpoint({
  path: '/events/upcoming',
  method: EndpointMethod.GET,
  handler: getUpcomingEventsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const joinEventEndpoint = new Endpoint({
  path: '/events/:eventId/join',
  method: EndpointMethod.POST,
  handler: joinEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const leaveEventEndpoint = new Endpoint({
  path: '/events/:eventId/leave',
  method: EndpointMethod.POST,
  handler: leaveEventHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getEventParticipantsEndpoint = new Endpoint({
  path: '/events/:eventId/participants',
  method: EndpointMethod.GET,
  handler: getEventParticipantsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getUserJoinedEventsEndpoint = new Endpoint({
  path: '/users/:userId/joined-events',
  method: EndpointMethod.GET,
  handler: getUserJoinedEventsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

export const getPopularEventsEndpoint = new Endpoint({
  path: '/events/popular',
  method: EndpointMethod.GET,
  handler: getPopularEventsHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});