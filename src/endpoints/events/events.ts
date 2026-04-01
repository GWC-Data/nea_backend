import { Endpoint, EndpointAuthType, EndpointMethod } from 'node-server-engine';
// import {
//   createEventValidator,
//   updateEventValidator,
//   getEventValidator,
//   deleteEventValidator
// } from './events.validator';
import {
  getAllEventsHandler,
  getEventByIdHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getEventsByDateHandler,
  getUpcomingEventsHandler
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