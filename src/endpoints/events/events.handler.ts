import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventTable, User, EventLogs } from 'db';
import {
  EVENT_NOT_FOUND,
  EVENT_CREATION_ERROR,
  EVENT_UPDATE_ERROR,
  EVENT_DELETION_ERROR,
  EVENT_GET_ERROR,
  EVENT_DATE_PAST,
  USER_NOT_FOUND as USER_NOT_FOUND_ERROR
} from './events.const';
import { Op } from 'sequelize';
import { getRelativeImagePath} from 'config/multerConfig';

// ✅ Helper function to check if string is UUID format
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// ✅ Helper to resolve event by UUID or numeric ID
const getEventByUuidOrId = async (identifier: string) => {
  if (isUUID(identifier)) {
    return await EventTable.findOne({ where: { eventUuid: identifier } });
  } else {
    return await EventTable.findByPk(identifier);
  }
};

// ✅ Helper to resolve user by UUID or numeric ID
// const getUserByUuidOrId = async (identifier: string | number) => {
//   if (typeof identifier === 'string' && isUUID(identifier)) {
//     return await User.findOne({ where: { userUuid: identifier } });
//   } else {
//     return await User.findByPk(identifier);
//   }
// };

// Helper function to get user ID from request
const getUserIdFromRequest = (req: any): number | undefined => {
  // node-server-engine attaches decoded JWT to req.decoded or req.user
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

// ✅ Create Event
export const createEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { date, location, name, details, description, rewards } = req.body;
  const createdBy = getUserIdFromRequest(req);

  try {
    if (!createdBy) {
      res.status(401).json({ message: 'User ID not found in token' });
      return;
    }

    // Validate required fields
    if (!date || !location || !name) {
      res.status(400).json({ message: 'date, location, and name are required' });
      return;
    }

    // Check if event date is in the past
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      res.status(400).json({ message: EVENT_DATE_PAST });
      return;
    }

    // Handle event image upload
    let eventImagePath = null;
    if ((req as any).file) {
      eventImagePath = getRelativeImagePath((req as any).file.path);
      console.log('📸 Event image uploaded:', eventImagePath);
    }

    const newEvent = await EventTable.create({
      date,
      location,
      name,
      details: details || null,
      description: description || null,
      rewards: rewards || null,
      event_image: eventImagePath,
      joinsCount: 0,
      participants: [],
      createdBy: createdBy
    });

    console.log('✅ Event created:', newEvent.eventId);
    res.status(200).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.log('❌ Error in createEventHandler:', error);
    reportError(error);
    res.status(500).json({ message: EVENT_CREATION_ERROR, error });
  }
};

// ✅ Get All Events
export const getAllEventsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const events = await EventTable.findAll({
      order: [['date', 'ASC']]
    });

    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Event By ID
// ✅ Get Event By ID or UUID
export const getEventByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const event = await getEventByUuidOrId(id);

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    let participants = event.participants;
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    res.status(200).json({ 
      event,
      eventUuid: event.eventUuid,
      participantsCount: event.joinsCount,
      participantUuids: participants
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR });
  }
};

// ✅ Update Event By ID or UUID
export const updateEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { date, location, name, details, description, rewards } = req.body;
  const userId = getUserIdFromRequest(req);

  try {
    if (!userId) {
      res.status(401).json({ message: 'User ID not found in token' });
      return;
    }

    const event = await getEventByUuidOrId(id);

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    // Check if updating date and if it's in the past
    if (date) {
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        res.status(400).json({ message: EVENT_DATE_PAST });
        return;
      }
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (location !== undefined) updateData.location = location;
    if (name !== undefined) updateData.name = name;
    if (details !== undefined) updateData.details = details;
    if (description !== undefined) updateData.description = description;
    if (rewards !== undefined) updateData.rewards = rewards;

    await event.update(updateData);

    res.status(200).json({ 
      message: 'Event updated successfully', 
      event,
      eventUuid: event.eventUuid 
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_UPDATE_ERROR, error });
  }
};

// ✅ Delete Event By ID or UUID
export const deleteEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = getUserIdFromRequest(req);

  try {
    if (!userId) {
      res.status(401).json({ message: 'User ID not found in token' });
      return;
    }

    const event = await getEventByUuidOrId(id);

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    await event.destroy();

    res.status(200).json({ 
      message: 'Event deleted successfully',
      eventUuid: event.eventUuid 
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_DELETION_ERROR, error });
  }
};

// ✅ Get Events by Date
export const getEventsByDateHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { date } = req.params;

  try {
    console.log('📅 [getEventsByDateHandler] Querying events for date:', date);
    
    // Parse the date (format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(queryDate);
    nextDate.setDate(nextDate.getDate() + 1);

    console.log('   Start:', queryDate, 'End:', nextDate);

    const events = await EventTable.findAll({
      where: {
        date: {
          [Op.gte]: queryDate,
          [Op.lt]: nextDate
        }
      },
      order: [['date', 'ASC']]
    });

    console.log(`✅ Found ${events.length} events for date ${date}`);

    res.status(200).json({ events });
  } catch (error) {
    console.log('❌ Error in getEventsByDateHandler:', error);
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Upcoming Events
export const getUpcomingEventsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await EventTable.findAll({
      where: {
        date: {
          [Op.gte]: today
        }
      },
      order: [['date', 'ASC']]
    });

    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Popular Events
export const getPopularEventsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const { limit = 10 } = req.query;
    
    const events = await EventTable.findAll({
      order: [['joinsCount', 'DESC']],
      limit: parseInt(limit as string)
    });

    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Join Event (UUID or ID-based)
export const joinEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    // Get user details and UUID
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get event details and UUID (supports both UUID and numeric ID)
    const event = await getEventByUuidOrId(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Get current participants (array of user UUIDs)
    let participants: string[] = event.participants || [];
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    // Check if user already joined (by UUID)
    if (participants.includes(user.userUuid)) {
      res.status(400).json({ 
        message: 'You have already joined this event.',
        success: false
      });
      return;
    }

    // Handle image upload if provided
    let eventImagePath = null;
    if ((req as any).file) {
      eventImagePath = getRelativeImagePath((req as any).file.path);
      console.log('📸 Event image uploaded:', eventImagePath);
    }

    // Add user UUID to participants array
    const updatedParticipants = [...participants, user.userUuid];

    // Update EventTable
    const updateData: any = {
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length
    };
    if (eventImagePath) {
      updateData.event_image = eventImagePath;
    }
    await event.update(updateData);

    // Update user's joined events
    let joinedEvents: string[] = user.joinedEvents || [];
    if (typeof joinedEvents === 'string') {
      joinedEvents = JSON.parse(joinedEvents);
    }

    // Check if event UUID already in user's joined events
    if (!joinedEvents.includes(event.eventUuid)) {
      const updatedJoinedEvents = [...joinedEvents, event.eventUuid];
      await user.update({ joinedEvents: updatedJoinedEvents });
    }

    res.status(200).json({
      message: `Successfully joined the event: ${event.name}`,
      success: true,
      data: {
        eventId: event.eventId,
        eventUuid: event.eventUuid,
        eventName: event.name,
        totalParticipants: updatedParticipants.length,
        participantUuids: updatedParticipants
      }
    });
  } catch (error) {
    console.error('Error in joinEventHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error joining event', error });
  }
};

// ✅ Leave Event (UUID or ID-based)
export const leaveEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    // Check if event exists (supports both UUID and numeric ID)
    const event = await getEventByUuidOrId(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get current participants (array of user UUIDs)
    let participants: string[] = event.participants || [];
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    // Check if user UUID is in participants
    if (!participants.includes(user.userUuid)) {
      res.status(400).json({ message: 'User has not joined this event' });
      return;
    }

    // Remove user UUID from participants
    const updatedParticipants = participants.filter(uuid => uuid !== user.userUuid);

    // Update event
    await event.update({
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length
    });

    // Update user's joinedEvents (array of event UUIDs)
    let joinedEvents: string[] = user.joinedEvents || [];
    if (typeof joinedEvents === 'string') {
      joinedEvents = JSON.parse(joinedEvents);
    }

    // Remove event UUID from user's joined events
    const updatedJoinedEvents = joinedEvents.filter(uuid => uuid !== event.eventUuid);
    await user.update({ joinedEvents: updatedJoinedEvents });

    res.status(200).json({
      message: 'Successfully left the event',
      event: {
        eventId: event.eventId,
        eventUuid: event.eventUuid,
        name: event.name,
        joinsCount: updatedParticipants.length,
        participantUuids: updatedParticipants
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error leaving event', error });
  }
};

// ✅ Get Event Participants (UUID or ID-based)
export const getEventParticipantsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await getEventByUuidOrId(eventId);
    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    // Get participant details from UUIDs
    let participantUuids: string[] = event.participants || [];
    if (typeof participantUuids === 'string') {
      participantUuids = JSON.parse(participantUuids);
    }

    // Fetch user details for each UUID
    const participants = await User.findAll({
      where: { userUuid: participantUuids },
      attributes: ['id', 'userUuid', 'name', 'email']
    });

    res.status(200).json({ 
      eventId: event.eventId,
      eventUuid: event.eventUuid,
      eventName: event.name,
      joinsCount: event.joinsCount,
      participantUuids: participantUuids,
      participants: participants.map(p => ({
        userId: p.id,
        userUuid: p.userUuid,
        name: p.name,
        email: p.email
      }))
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get User Joined Events (extract userId from token, UUID-based)
export const getUserJoinedEventsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'userUuid', 'name', 'email', 'joinedEvents']
    });
    
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND_ERROR });
      return;
    }

    // Get event UUIDs
    let eventUuids: string[] = user.joinedEvents || [];
    if (typeof eventUuids === 'string') {
      eventUuids = JSON.parse(eventUuids);
    }

    // Fetch event details for each UUID
    let joinedEventsWithDetails: any[] = [];
    if (eventUuids.length > 0) {
      const events = await EventTable.findAll({
        where: { eventUuid: eventUuids },
        attributes: ['eventId', 'eventUuid', 'name', 'location', 'date', 'joinsCount']
      });

      joinedEventsWithDetails = events.map(event => ({
        eventId: event.eventId,
        eventUuid: event.eventUuid,
        eventName: event.name,
        location: event.location,
        eventDate: event.date,
        participantsCount: event.joinsCount
      }));
    }

    res.status(200).json({ 
      userId: user.id,
      userUuid: user.userUuid,
      userName: user.name,
      userEmail: user.email,
      totalEventsJoined: eventUuids.length,
      joinedEventUuids: eventUuids,
      joinedEvents: joinedEventsWithDetails
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Event Profile
// ✅ Get Event Profile (UUID or ID-based, No Auth)
export const getEventProfileHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: any,
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await (isUUID(eventId) 
      ? EventTable.findOne({ 
          where: { eventUuid: eventId },
          include: [
            {
              association: 'eventLogs',
              attributes: ['id', 'userId', 'checkInTime', 'checkOutTime', 'totalHours']
            }
          ]
        })
      : EventTable.findByPk(eventId, {
          include: [
            {
              association: 'eventLogs',
              attributes: ['id', 'userId', 'checkInTime', 'checkOutTime', 'totalHours']
            }
          ]
        })
    );

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Calculate joined count
    const joinedCount = event.eventLogs?.length || 0;

    // Prepare event profile response
    const eventProfile = {
      eventId: event.eventId,
      eventUuid: event.eventUuid,
      eventName: event.name,
      location: event.location,
      joinedCount: joinedCount,
      eventDate: event.date,
      details: event.details,
      description: event.description,
      reward: event.rewards,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      participants: event.eventLogs ? event.eventLogs.length : 0
    };

    res.status(200).json({
      message: 'Event profile retrieved successfully',
      eventProfile
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching event profile', error });
  }
};

// ✅ Get All Events Profiles
export const getAllEventsProfileHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req: any,
  res: Response
): Promise<void> => {
  try {
    const events = await EventTable.findAll({
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'userId']
        }
      ],
      order: [['date', 'DESC']]
    });

    const eventsProfile = events.map(event => ({
      eventId: event.eventId,
      eventName: event.name,
      location: event.location,
      joinedCount: event.eventLogs?.length || 0,
      eventDate: event.date,
      details: event.details,
      description: event.description,
      reward: event.rewards,
      createdAt: event.createdAt
    }));

    res.status(200).json({
      message: 'All events profiles retrieved successfully',
      totalEvents: eventsProfile.length,
      eventsProfile
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching events profiles', error });
  }
};

// ✅ Get Leaderboard (User-based ranking across all events)
export const getLeaderboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    console.log('🏆 [getLeaderboardHandler] Fetching user-based leaderboard');

    // Get all event logs with user details
    const eventLogs = await EventLogs.findAll({
      include: [
        {
          association: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: ['userId', 'totalHours', 'garbageWeight', 'eventId']
    });

    // Group by userId and aggregate stats
    const userStatsMap = new Map<number, any>();

    eventLogs.forEach((log: any) => {
      const userId = log.userId;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId: userId,
          userName: log.user?.name || 'Unknown',
          userEmail: log.user?.email || null,
          totalHours: 0,
          totalGarbageWeight: 0,
          eventsParticipated: 0
        });
      }

      const stats = userStatsMap.get(userId);
      stats.totalHours += log.totalHours || 0;
      stats.totalGarbageWeight += log.garbageWeight || 0;
      stats.eventsParticipated += 1;
    });

    // Convert map to array and sort by totalHours (descending)
    const leaderboard = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        totalHours: user.totalHours,
        totalGarbageWeight: parseFloat(user.totalGarbageWeight.toFixed(2)),
        eventsParticipated: user.eventsParticipated,
        co2Offset: parseFloat((user.totalGarbageWeight * 0.5).toFixed(2)),
        points: Math.floor((user.totalHours * 60 / 30) * 5)
      }));

    console.log(`✅ Leaderboard has ${leaderboard.length} users`);

    res.status(200).json({
      message: 'User leaderboard retrieved successfully',
      totalUsers: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    console.log('❌ Error in getLeaderboardHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error fetching leaderboard', error });
  }
};

// ✅ Get Dashboard (User Profile with Full Event Details)
export const getDashboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    console.log(`📊 [getDashboardHandler] Fetching dashboard for userId: ${userId}`);

    // Get user details
    const user = await User.findByPk(userId, {
      attributes: ['id', 'userUuid', 'name', 'email', 'role', 'joinedEvents']
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Parse joinedEvents array (array of event UUIDs)
    let eventUuids: string[] = user.joinedEvents || [];
    if (typeof eventUuids === 'string') {
      eventUuids = JSON.parse(eventUuids);
    }

    // Get full event details for each joined event UUID
    let eventsJoinedWithDetails: any[] = [];
    if (eventUuids.length > 0) {
      const fullEvents = await EventTable.findAll({
        where: {
          eventUuid: {
            [Op.in]: eventUuids
          }
        },
        attributes: ['eventId', 'eventUuid', 'name', 'location', 'date', 'joinsCount', 'event_image']
      });

      eventsJoinedWithDetails = fullEvents.map(event => ({
        eventId: event.eventId,
        eventUuid: event.eventUuid,
        eventName: event.name,
        location: event.location,
        eventDate: event.date,
        joinedCount: event.joinsCount,
        eventImage: event.event_image || null
      }));
    }

    // Get user's event logs stats
    const eventLogs = await EventLogs.findAll({
      where: { userId },
      attributes: ['id', 'totalHours', 'checkOutTime', 'garbageWeight']
    });

    const totalHours = eventLogs.reduce((sum: number, log: any) => sum + (log.totalHours || 0), 0);
    const totalMinutesLogged = Math.floor(totalHours * 60);
    const totalGarbageCollected = eventLogs.reduce((sum: number, log: any) => sum + (log.garbageWeight || 0), 0);
    
    // Calculate CO2 collected (0.5 kg CO2 per kg waste)
    const co2Collected = (totalGarbageCollected * 0.5).toFixed(2);
    
    // Calculate total points (5 points per 30 minutes)
    const totalPoints = Math.floor((totalMinutesLogged / 30) * 5);

    console.log(`✅ Dashboard data: ${eventsJoinedWithDetails.length} events, ${totalPoints} points`);

    res.status(200).json({
      message: 'Dashboard retrieved successfully',
      profile: {
        userId: user.id,
        userUuid: user.userUuid,
        name: user.name,
        email: user.email,
        role: user.role
      },
      stats: {
        totalPoints,
        co2Collected: parseFloat(co2Collected),
        totalMinutesLogged,
        totalWeight: parseFloat(totalGarbageCollected.toFixed(2))
      },
      eventsJoined: eventsJoinedWithDetails
    });
  } catch (error) {
    console.log('❌ Error in getDashboardHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error fetching dashboard', error });
  }
};

// ✅ Get Event Leaderboard (User-based ranking for a specific event)
// ✅ Get Event Leaderboard (User-based ranking for a specific event, UUID or ID-based)
export const getEventLeaderboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    console.log(`🏆 [getEventLeaderboardHandler] Fetching leaderboard for eventId: ${eventId}`);

    // Get event details
    const event = await (isUUID(eventId)
      ? EventTable.findOne({
          where: { eventUuid: eventId },
          attributes: ['eventId', 'eventUuid', 'name', 'date', 'location']
        })
      : EventTable.findByPk(eventId, {
          attributes: ['eventId', 'eventUuid', 'name', 'date', 'location']
        })
    );

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    // Get all event logs for this event
    const eventLogs = await EventLogs.findAll({
      where: { eventId: event.eventId },
      include: [
        {
          association: 'user',
          attributes: ['id', 'userUuid', 'name', 'email']
        }
      ],
      attributes: ['id', 'userId', 'totalHours', 'garbageWeight', 'checkInTime', 'checkOutTime']
    });

    // Group by userId and aggregate stats
    const userStatsMap = new Map<number, any>();

    eventLogs.forEach((log: any) => {
      const userId = log.userId;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId: userId,
          userUuid: log.user?.userUuid || null,
          userName: log.user?.name || 'Unknown',
          userEmail: log.user?.email || null,
          totalHours: 0,
          totalGarbageWeight: 0,
          checkInTime: log.checkInTime,
          checkOutTime: log.checkOutTime,
          logsCount: 0
        });
      }

      const stats = userStatsMap.get(userId);
      stats.totalHours += log.totalHours || 0;
      stats.totalGarbageWeight += log.garbageWeight || 0;
      stats.logsCount += 1;
      // Update to earliest check-in and latest check-out
      if (log.checkInTime && (!stats.checkInTime || new Date(log.checkInTime) < new Date(stats.checkInTime))) {
        stats.checkInTime = log.checkInTime;
      }
      if (log.checkOutTime && (!stats.checkOutTime || new Date(log.checkOutTime) > new Date(stats.checkOutTime))) {
        stats.checkOutTime = log.checkOutTime;
      }
    });

    // Convert map to array and sort by totalHours (descending)
    const leaderboard = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        userUuid: user.userUuid,
        userName: user.userName,
        userEmail: user.userEmail,
        totalHours: user.totalHours,
        garbageWeightCollected: parseFloat(user.totalGarbageWeight.toFixed(2)),
        checkInTime: user.checkInTime,
        checkOutTime: user.checkOutTime,
        eventName: event.name,
        eventDate: event.date,
        logEntries: user.logsCount
      }));

    console.log(`✅ Event leaderboard has ${leaderboard.length} participants`);

    res.status(200).json({
      message: 'Event leaderboard retrieved successfully',
      eventDetails: {
        eventId: event.eventId,
        eventUuid: event.eventUuid,
        eventName: event.name,
        eventDate: event.date,
        location: event.location,
        totalParticipants: leaderboard.length
      },
      leaderboard
    });
  } catch (error) {
    console.log('❌ Error in getEventLeaderboardHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error fetching event leaderboard', error });
  }
};