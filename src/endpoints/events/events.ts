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
  getPopularEventsHandler,
  getEventProfileHandler,
  getAllEventsProfileHandler,
  getLeaderboardHandler,
  getDashboardHandler,
  getEventLeaderboardHandler
} from './events.handler';
import { eventImageUpload } from 'config/multerConfig';

// All endpoints require JWT authentication

// ✅ POST - Must be first
export const createEventEndpoint = new Endpoint({
  path: '/events',
  method: EndpointMethod.POST,
  handler: createEventHandler,
  authType: EndpointAuthType.JWT,
  middleware: [eventImageUpload.single('eventImage')],
  validator: {},
});

// ✅ MORE SPECIFIC ROUTES BEFORE GENERIC ONES - Critical for routing!
// Specific single-word paths
export const getEventsByDateEndpoint = new Endpoint({
  path: '/events/date/:date',
  method: EndpointMethod.GET,
  handler: getEventsByDateHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getUpcomingEventsEndpoint = new Endpoint({
  path: '/events/upcoming',
  method: EndpointMethod.GET,
  handler: getUpcomingEventsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getUserJoinedEventsEndpoint = new Endpoint({
  path: '/events/joined',
  method: EndpointMethod.GET,
  handler: getUserJoinedEventsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getPopularEventsEndpoint = new Endpoint({
  path: '/events/popular',
  method: EndpointMethod.GET,
  handler: getPopularEventsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Specific parameterized paths (with :eventId before :id)
export const joinEventEndpoint = new Endpoint({
  path: '/events/:eventId/join',
  method: EndpointMethod.POST,
  handler: joinEventHandler,
  authType: EndpointAuthType.JWT,
  middleware: [eventImageUpload.single('eventImage')],
  validator: {},
});

export const leaveEventEndpoint = new Endpoint({
  path: '/events/:eventId/leave',
  method: EndpointMethod.POST,
  handler: leaveEventHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventParticipantsEndpoint = new Endpoint({
  path: '/events/:eventId/participants',
  method: EndpointMethod.GET,
  handler: getEventParticipantsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});



export const getEventProfileEndpoint = new Endpoint({
  path: '/events/:eventId/profile',
  method: EndpointMethod.GET,
  handler: getEventProfileHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});

// ✅ Dashboard and Leaderboard endpoints
export const getDashboardEndpoint = new Endpoint({
  path: '/dashboard',
  method: EndpointMethod.GET,
  handler: getDashboardHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getLeaderboardEndpoint = new Endpoint({
  path: '/leaderboard',
  method: EndpointMethod.GET,
  handler: getLeaderboardHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const getEventLeaderboardEndpoint = new Endpoint({
  path: '/events/:eventId/leaderboard',
  method: EndpointMethod.GET,
  handler: getEventLeaderboardHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// GENERIC ROUTES - Must be last to avoid shadowing specific routes
export const getEventByIdEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.GET,
  handler: getEventByIdHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

export const updateEventEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.PUT,
  handler: updateEventHandler,
  authType: EndpointAuthType.JWT,
  middleware: [eventImageUpload.single('eventImage')],
  validator: {},
});

export const deleteEventEndpoint = new Endpoint({
  path: '/events/:id',
  method: EndpointMethod.DELETE,
  handler: deleteEventHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Generic path: /events (GET all)
export const getAllEventsEndpoint = new Endpoint({
  path: '/events',
  method: EndpointMethod.GET,
  handler: getAllEventsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Non-JWT Profile Endpoints (last)
export const getAllEventsProfileEndpoint = new Endpoint({
  path: '/events-profiles',
  method: EndpointMethod.GET,
  handler: getAllEventsProfileHandler,
  authType: EndpointAuthType.NONE,
  validator: {},
});