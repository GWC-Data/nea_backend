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
  getUserRewardsSummaryHandler,
  getTimerHandler
} from './event-logs.handler';

// ✅ POST - Must be first to avoid conflicts
// export const createEventLogEndpoint = new Endpoint({
//   path: '/event-logs',
//   method: EndpointMethod.POST,
//   handler: createEventLogHandler,
//   authType: EndpointAuthType.JWT,
//   validator: {},
//   middleware: [wasteImageUpload.single('wasteImage')]
// });

export const createEventLogEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.POST,
  handler: createEventLogHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
  middleware: [wasteImageUpload.single('wasteImage')]
});

export const getTimerEndpoint = new Endpoint({
  path: '/timer',
  method: EndpointMethod.GET,
  handler: getTimerHandler,
  authType: EndpointAuthType.JWT,
   validator: {}
});

// ✅ MORE SPECIFIC ROUTES BEFORE GENERIC ONES - Critical for routing!
// Specific path: /event-logs/user/rewards
export const getUserRewardsSummaryEndpoint = new Endpoint({
  path: '/event-logs/user/rewards',
  method: EndpointMethod.GET,
  handler: getUserRewardsSummaryHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Specific path: /event-logs/user/date/:date
export const getUserEventLogsByDateEndpoint = new Endpoint({
  path: '/event-logs/user/date/:date',
  method: EndpointMethod.GET,
  handler: getUserEventLogsByDateHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Specific path: /event-logs/user
export const getEventLogsByUserEndpoint = new Endpoint({
  path: '/event-logs/user',
  method: EndpointMethod.GET,
  handler: getEventLogsByUserHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Specific path: /event-logs/event/:eventId
export const getEventLogsByEventEndpoint = new Endpoint({
  path: '/event-logs/event/:eventId',
  method: EndpointMethod.GET,
  handler: getEventLogsByEventHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// Specific path: /event-logs/date-range
export const getEventLogsByDateRangeEndpoint = new Endpoint({
  path: '/event-logs/date-range',
  method: EndpointMethod.POST,
  handler: getEventLogsByDateRangeHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// GENERIC ROUTES - Must be last to avoid shadowing specific routes
// Generic path: /event-logs/:id (GET, PUT, DELETE)
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

// Generic path: /event-logs (GET all)
export const getAllEventLogsEndpoint = new Endpoint({
  path: '/event-logs',
  method: EndpointMethod.GET,
  handler: getAllEventLogsHandler,
  authType: EndpointAuthType.JWT,
  validator: {},
});

// ✅ EXPORT IN PRIORITY ORDER - This ensures routes are matched correctly
// Specific paths MUST come before generic paths with parameters
export const orderedEventLogsEndpoints = [
  createEventLogEndpoint, // POST /event-logs
  getUserRewardsSummaryEndpoint, // GET /event-logs/user/rewards (most specific)
  getUserEventLogsByDateEndpoint, // GET /event-logs/user/date/:date
  getEventLogsByUserEndpoint, // GET /event-logs/user ✅ CRITICAL - before /:id
  getEventLogsByEventEndpoint, // GET /event-logs/event/:eventId
  getEventLogsByDateRangeEndpoint, // POST /event-logs/date-range
  getEventLogByIdEndpoint, // GET /event-logs/:id (generic - MUST be last)
  updateEventLogEndpoint, // PUT /event-logs/:id
  deleteEventLogEndpoint, // DELETE /event-logs/:id
  getAllEventLogsEndpoint, // GET /event-logs
];