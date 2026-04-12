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
export const getEventByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const event = await EventTable.findByPk(id);

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
      participantsCount: event.joinsCount,
      participantsList: participants
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR });
  }
};

// ✅ Update Event
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

    const event = await EventTable.findByPk(id);

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

    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_UPDATE_ERROR, error });
  }
};

// ✅ Delete Event
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

    const event = await EventTable.findByPk(id);

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    await event.destroy();

    res.status(200).json({ message: 'Event deleted successfully' });
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

// ✅ Join Event
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
    const sequelize = EventTable.sequelize;

    // Get user details
    const users = await sequelize!.query(
      `SELECT id, name, email FROM Users WHERE id = :userId`,
      { replacements: { userId: userId }, type: 'SELECT' }
    ) as any;
    
    const user = users[0];
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get event info
    const events = await sequelize!.query(
      `SELECT eventId, name FROM EventTable WHERE eventId = :eventId`,
      { replacements: { eventId: eventId }, type: 'SELECT' }
    ) as any;
    
    const event = events[0];
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Get current participants
    const [currentData] = await sequelize!.query(
      `SELECT COALESCE(participants, '[]') as participants FROM EventTable WHERE eventId = :eventId`,
      { replacements: { eventId: eventId }, type: 'SELECT' }
    ) as any;

    let participantsArray: any[] = [];
    if (currentData?.participants) {
      participantsArray = typeof currentData.participants === 'string' 
        ? JSON.parse(currentData.participants) 
        : currentData.participants;
    }

    // Check if user already joined
    const alreadyJoined = participantsArray.some((p: any) => p.userId === userId);
    if (alreadyJoined) {
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

    // Add user object to participants array
    const participantObject = {
      userId: user.id,
      name: user.name,
      email: user.email,
      joinedAt: new Date()
    };
    
    const updatedParticipants = [...participantsArray, participantObject];
    const participantsJSON = JSON.stringify(updatedParticipants);

    // Update EventTable with image if provided
    const updateQuery = eventImagePath
      ? `UPDATE EventTable SET participants = :participants, joinsCount = :joinsCount, event_image = :event_image WHERE eventId = :eventId`
      : `UPDATE EventTable SET participants = :participants, joinsCount = :joinsCount WHERE eventId = :eventId`;
    
    const replacements: any = {
      participants: participantsJSON,
      joinsCount: updatedParticipants.length,
      eventId: eventId
    };
    
    if (eventImagePath) {
      replacements.event_image = eventImagePath;
    }

    await sequelize!.query(updateQuery, { replacements });

    // Update user's joined events
    const [userData] = await sequelize!.query(
      `SELECT COALESCE(joinedEvents, '[]') as joinedEvents FROM Users WHERE id = :userId`,
      { replacements: { userId: userId }, type: 'SELECT' }
    ) as any;

    let joinedEventsArray: any[] = [];
    if (userData?.joinedEvents) {
      joinedEventsArray = typeof userData.joinedEvents === 'string'
        ? JSON.parse(userData.joinedEvents)
        : userData.joinedEvents;
    }

    // Check if event already in user's joined events
    const eventAlreadyJoined = joinedEventsArray.some((e: any) => e.eventId === event.eventId);
    if (!eventAlreadyJoined) {
      const eventObject = {
        eventId: event.eventId,
        eventName: event.name,
        joinedAt: new Date()
      };
      const updatedJoinedEvents = [...joinedEventsArray, eventObject];
      const joinedEventsJSON = JSON.stringify(updatedJoinedEvents);

      await sequelize!.query(
        `UPDATE Users SET joinedEvents = :joinedEvents WHERE id = :userId`,
        {
          replacements: {
            joinedEvents: joinedEventsJSON,
            userId: userId
          }
        }
      );
    }

    // Get updated event data
    const [updatedEvent] = await sequelize!.query(
      `SELECT eventId, name, joinsCount, participants FROM EventTable WHERE eventId = :eventId`,
      { replacements: { eventId: eventId }, type: 'SELECT' }
    ) as any;

    let parsedParticipants = updatedEvent.participants;
    if (typeof parsedParticipants === 'string') {
      parsedParticipants = JSON.parse(parsedParticipants);
    }

    res.status(200).json({
      message: `Successfully joined the event: ${event.name}`,
      success: true,
      data: {
        eventId: updatedEvent.eventId,
        eventName: updatedEvent.name,
        totalParticipants: updatedEvent.joinsCount,
        participants: parsedParticipants
      }
    });
  } catch (error) {
    console.error('Error in joinEventHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error joining event', error });
  }
};

// ✅ Leave Event
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
    // Check if event exists
    const event = await EventTable.findByPk(eventId);
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

    // Get current participants (array of objects)
    let participants = event.participants || [];
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    // Check if user is in participants (checking userId property)
    const wasJoined = participants.some((p: any) => p.userId === userId);
    if (!wasJoined) {
      res.status(400).json({ message: 'User has not joined this event' });
      return;
    }

    // Remove user from participants (filter by userId property)
    participants = participants.filter((p: any) => p.userId !== userId);

    // Update event
    await event.update({
      participants: participants,
      joinsCount: participants.length
    });

    // Update user's joinedEvents (array of objects)
    let joinedEvents = user.joinedEvents || [];
    if (typeof joinedEvents === 'string') {
      joinedEvents = JSON.parse(joinedEvents);
    }

    // Remove event from user's joined events
    joinedEvents = joinedEvents.filter((e: any) => e.eventId !== parseInt(eventId));
    await user.update({ joinedEvents: joinedEvents });

    res.status(200).json({
      message: 'Successfully left the event',
      event: {
        eventId: event.eventId,
        name: event.name,
        joinsCount: participants.length,
        participants: participants
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error leaving event', error });
  }
};

// ✅ Get Event Participants
export const getEventParticipantsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    let participants = event.participants;
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    res.status(200).json({ 
      eventId: event.eventId,
      eventName: event.name,
      joinsCount: event.joinsCount,
      participants: participants
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get User Joined Events (extract userId from token)
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
      attributes: ['id', 'name', 'email', 'joinedEvents']
    });
    
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND_ERROR });
      return;
    }

    let joinedEvents = user.joinedEvents;
    if (typeof joinedEvents === 'string') {
      joinedEvents = JSON.parse(joinedEvents);
    }

    res.status(200).json({ 
      userId: user.id,
      userName: user.name,
      joinedEvents: joinedEvents
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Event Profile
export const getEventProfileHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: any,
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await EventTable.findByPk(eventId, {
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'userId', 'checkInTime', 'checkOutTime', 'totalHours']
        }
      ]
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Calculate joined count
    const joinedCount = event.eventLogs?.length || 0;

    // Prepare event profile response
    const eventProfile = {
      eventId: event.eventId,
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

// ✅ Get Leaderboard (Event-based)
export const getLeaderboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    console.log('🏆 [getLeaderboardHandler] Fetching leaderboard');

    // Get all events with their participant counts
    const events = await EventTable.findAll({
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'userId', 'totalHours']
        }
      ],
      order: [['joinsCount', 'DESC']]
    });

    // Build leaderboard: rank events by participation
    const leaderboard = events
      .filter(event => (event.eventLogs?.length || 0) > 0)
      .map((event, index) => ({
        rank: index + 1,
        eventId: event.eventId,
        eventName: event.name,
        location: event.location,
        date: event.date,
        description: event.description,
        rewards: event.rewards,
        totalParticipants: event.joinsCount,
        totalHours: (event.eventLogs || []).reduce((sum, log) => sum + (log.totalHours || 0), 0),
        participantIds: (event.eventLogs || []).map(log => log.userId)
      }));

    console.log(`✅ Leaderboard has ${leaderboard.length} events`);

    res.status(200).json({
      message: 'Leaderboard retrieved successfully',
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
      attributes: ['id', 'name', 'email', 'role', 'joinedEvents']
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Parse joinedEvents array
    let joinedEventsList = user.joinedEvents;
    if (typeof joinedEventsList === 'string') {
      joinedEventsList = JSON.parse(joinedEventsList);
    }

    // Get full event details for each joined event
    const eventIds = (joinedEventsList || []).map((e: any) => e.eventId || e);
    
    let eventsJoinedWithDetails: any[] = [];
    if (eventIds.length > 0) {
      const fullEvents = await EventTable.findAll({
        where: {
          eventId: {
            [Op.in]: eventIds
          }
        },
        attributes: ['eventId', 'name', 'location', 'date', 'joinsCount', 'event_image']
      });

      eventsJoinedWithDetails = fullEvents.map(event => ({
        eventId: event.eventId,
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
export const getEventLeaderboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    console.log(`🏆 [getEventLeaderboardHandler] Fetching leaderboard for eventId: ${eventId}`);

    // Get event details
    const event = await EventTable.findByPk(eventId, {
      attributes: ['eventId', 'name', 'date', 'location']
    });

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    // Get all event logs for this event, sorted by totalHours descending
    const eventLogs = await EventLogs.findAll({
      where: { eventId },
      include: [
        {
          association: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: ['id', 'userId', 'totalHours', 'garbageWeight', 'checkInTime', 'checkOutTime'],
      order: [['totalHours', 'DESC']]
    });

    // Build leaderboard with rankings
    const leaderboard = eventLogs.map((log: any, index: number) => ({
      rank: index + 1,
      userId: log.userId,
      userName: log.user?.name || 'Unknown',
      userEmail: log.user?.email || null,
      totalHours: log.totalHours,
      garbageWeightCollected: log.garbageWeight || 0,
      checkInTime: log.checkInTime,
      checkOutTime: log.checkOutTime,
      eventName: event.name,
      eventDate: event.date
    }));

    console.log(`✅ Event leaderboard has ${leaderboard.length} participants`);

    res.status(200).json({
      message: 'Event leaderboard retrieved successfully',
      eventDetails: {
        eventId: event.eventId,
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