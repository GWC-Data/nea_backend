import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventTable, User, EventLogs, Organization } from 'db';
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
import { getRelativeImagePath } from 'config/multerConfig';
import { getUserTodayHours } from '../event-logs/event-logs.handler';
import fs from 'fs';
import path from 'path';

// Helper function to get user ID from request (UUID string)
const getUserIdFromRequest = (req: any): string | undefined => {
  return (
    req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id
  );
};

// ✅ Create Event
export const createEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  // 👇 Accept startDate, endDate, eventType
  const { startDate, endDate, location, name, details, description, rewards, eventType, status, userCount } = req.body;
  const createdBy = getUserIdFromRequest(req);

  try {
    if (!createdBy) {
      res.status(401).json({ message: 'User ID not found in token' });
      return;
    }

    if (!startDate || !location || !name) {
      res.status(400).json({ message: 'startDate, location, and name are required' });
      return;
    }

    const startDateObj = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDateObj < today) {
      res.status(400).json({ message: EVENT_DATE_PAST });
      return;
    }

    let eventImagePath = null;
    if ((req as any).file) {
      eventImagePath = getRelativeImagePath((req as any).file.path);
    }

    const userRole = (req as any).decoded?.role || (req as any).user?.role || (req as any).token?.role || 'user';

    // ─── EVENT STATUS POLICY ──────────────────────────────────────────────────
    // CURRENT BEHAVIOUR (May 2026):
    //   Both 'admin' and 'organization' roles create events with status 'approved'
    //   immediately — no intermediate review step is needed.
    //
    // TO RESTORE THE APPROVAL WORKFLOW IN FUTURE:
    //   Replace the line below with:
    //     const eventStatus = userRole === 'admin' ? 'approved' : 'pending';
    //   This will make organization-created events start as 'pending' and require
    //   an admin to explicitly approve them before they appear to regular users.
    // ─────────────────────────────────────────────────────────────────────────
    const eventStatus = status || (userRole === 'admin' ? 'approved' : 'pending');

    const newEvent = await EventTable.create({
      startDate: startDateObj,
      endDate: endDate ? new Date(endDate) : null,
      location,
      name,
      eventType: eventType || 'public',        // 👈 store eventType
      createdBy,                               // from token, not from body
      details: details || null,
      description: description || null,
      rewards: rewards || null,
      participantLimit: userCount ? parseInt(userCount, 10) : null,
      eventImage: eventImagePath,
      joinsCount: 0,
      participants: [],
      registeredParticipant: [],
      attendentParticipant: [],
      status: eventStatus,
    });

    res.status(200).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_CREATION_ERROR, error });
  }
};

// ✅ Get All Events
export const getAllEventsHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const userRole = (_req as any).decoded?.role || (_req as any).user?.role || (_req as any).token?.role || 'user';
    const userId = getUserIdFromRequest(_req);

    let whereClause: any = {};
    if (userRole === 'admin') {
      // Admin sees all
    } else if (userRole === 'organization') {
      // Org sees approved events + their own pending/rejected events
      whereClause = {
        [Op.or]: [
          { status: 'approved' },
          { createdBy: userId }
        ]
      };
    } else {
      // Regular user sees only approved events
      whereClause = { status: 'approved' };
    }

    const events = await EventTable.findAll({ 
      where: whereClause,
      order: [['startDate', 'ASC']] 
    });

    let filteredEvents = events;
    if (userRole !== 'admin' && userRole !== 'organization') {
      filteredEvents = events.filter(event => {
        if (event.eventType === 'private') {
          let registered = event.registeredParticipant || [];
          if (typeof registered === 'string') {
            try { registered = JSON.parse(registered); } catch { registered = []; }
          }
          return userId ? registered.includes(userId) : false;
        }
        return true;
      });
    }

    const activeLogs = await EventLogs.findAll({
      where: {
        checkOutTime: null
      },
      attributes: ['eventId'],
      group: ['eventId']
    });
    const activeEventIds = new Set(activeLogs.map(log => log.eventId));

    const eventsWithCalculations = filteredEvents.map(event => {
      let registered = event.registeredParticipant || [];
      if (typeof registered === 'string') {
        try { registered = JSON.parse(registered); } catch { registered = []; }
      }
      return {
        ...event.toJSON(),
        displayRegisteredParticipant: registered.length,
        isStarted: activeEventIds.has(event.eventId)
      };
    });

    res.status(200).json({ events: eventsWithCalculations });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Event By ID (UUID)
export const getEventByIdHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
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
    if (typeof participants === 'string')
      participants = JSON.parse(participants);

    let registered = event.registeredParticipant || [];
    if (typeof registered === 'string') {
      try { registered = JSON.parse(registered); } catch { registered = []; }
    }
    const displayRegisteredParticipant = registered.length;

    const userId = getUserIdFromRequest(req);
    let userPoints = 0;
    let hasCompleted = false;

    if (userId) {
      const log = await EventLogs.findOne({
        where: { eventId: id, userId, checkOutTime: { [Op.ne]: null } }
      });
      if (log) {
        const totalMinutes = (log.totalHours || 0) * 60;
        userPoints = Math.floor(totalMinutes / 30) * 5;
        hasCompleted = true;
      }
    }

    res.status(200).json({
      event,
      eventId: event.eventId,
      registeredParticipant: event.registeredParticipant,
      displayRegisteredParticipant,
      attendentParticipant: event.attendentParticipant,
      participantsCount: event.joinsCount,
      participantIds: participants,
      userPoints,
      hasCompleted
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
  const { startDate, endDate, location, name, details, description, rewards, eventType, participants, joinsCount, status, userCount } = req.body;
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

    if (startDate) {
      const startDateObj = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDateObj < today) {
        res.status(400).json({ message: EVENT_DATE_PAST });
        return;
      }
    }

    const updateData: any = {};
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) updateData.location = location;
    if (name !== undefined) updateData.name = name;
    if (details !== undefined) updateData.details = details;
    if (description !== undefined) updateData.description = description;
    if (rewards !== undefined) updateData.rewards = rewards;
    if (status !== undefined) updateData.status = status;
    if (eventType !== undefined) updateData.eventType = eventType || 'public';
    if (userCount !== undefined) updateData.participantLimit = userCount ? parseInt(userCount, 10) : null;

    if (participants !== undefined) {
      try {
        updateData.participants = typeof participants === 'string' ? JSON.parse(participants) : participants;
      } catch {
        res.status(400).json({ message: 'Invalid participants format' });
        return;
      }
    }
    if (joinsCount !== undefined) updateData.joinsCount = Number(joinsCount);

    if ((req as any).file) {
      const newImagePath = getRelativeImagePath((req as any).file.path);
      if (event.eventImage) {
        const oldPath = path.join(process.cwd(), event.eventImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.eventImage = newImagePath;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'No valid fields provided to update' });
      return;
    }

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
    res
      .status(200)
      .json({ message: 'Event deleted successfully', eventId: event.eventId });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_DELETION_ERROR, error });
  }
};

// ✅ Get Events by Date
export const getEventsByDateHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { date } = req.params;

  try {
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(queryDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const events = await EventTable.findAll({
      where: {
        startDate: { [Op.gte]: queryDate, [Op.lt]: nextDate }
      },
      order: [['startDate', 'ASC']]
    });

    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Upcoming Events
export const getUpcomingEventsHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await EventTable.findAll({
      where: { startDate: { [Op.gte]: today } },
      order: [['startDate', 'ASC']]
    });
    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Popular Events
export const getPopularEventsHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
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
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    let eventImagePath = null;
    if ((req as any).file) {
      eventImagePath = getRelativeImagePath((req as any).file.path);
    }

    let registeredParticipant: string[] = event.registeredParticipant || [];
    if (typeof registeredParticipant === 'string') {
      try {
        registeredParticipant = JSON.parse(registeredParticipant);
      } catch {
        registeredParticipant = [];
      }
    }

    let attendentParticipant: string[] = event.attendentParticipant || [];
    if (typeof attendentParticipant === 'string') {
      try {
        attendentParticipant = JSON.parse(attendentParticipant);
      } catch {
        attendentParticipant = [];
      }
    }

    if (event.eventType === 'private') {
      if (registeredParticipant.includes(user.id)) {
        res.status(400).json({
          message: 'You have already joined this event.',
          success: false
        });
        return;
      }
      registeredParticipant = [...registeredParticipant, user.id];
    } else {
      if (attendentParticipant.includes(user.id)) {
        res.status(400).json({
          message: 'You have already joined this event.',
          success: false
        });
        return;
      }
      attendentParticipant = [...attendentParticipant, user.id];
    }

    const activeParticipantsCount = event.eventType === 'private' ? registeredParticipant.length : attendentParticipant.length;
    const participantIds = event.eventType === 'private' ? registeredParticipant : attendentParticipant;

    const updateData: any = {
      joinsCount: activeParticipantsCount,
      registeredParticipant,
      attendentParticipant
    };
    if (eventImagePath) updateData.eventImage = eventImagePath;
    await event.update(updateData);

    let joinedEvents: string[] = user.joinedEvents || [];
    if (typeof joinedEvents === 'string')
      joinedEvents = JSON.parse(joinedEvents);
    if (!joinedEvents.includes(event.eventId)) {
      await user.update({ joinedEvents: [...joinedEvents, event.eventId] });
    }

    res.status(200).json({
      message: `Successfully joined the event: ${event.name}`,
      success: true,
      data: {
        eventId: event.eventId,
        eventName: event.name,
        totalParticipants: activeParticipantsCount,
        participantIds: participantIds
      }
    });
  } catch (error) {
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
    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let participants: string[] = event.participants || [];
    if (typeof participants === 'string')
      participants = JSON.parse(participants);
    if (!participants.includes(user.id)) {
      res.status(400).json({ message: 'User has not joined this event' });
      return;
    }

    let registeredParticipant: string[] = event.registeredParticipant || [];
    if (typeof registeredParticipant === 'string') {
      try {
        registeredParticipant = JSON.parse(registeredParticipant);
      } catch {
        registeredParticipant = [];
      }
    }

    let attendentParticipant: string[] = event.attendentParticipant || [];
    if (typeof attendentParticipant === 'string') {
      try {
        attendentParticipant = JSON.parse(attendentParticipant);
      } catch {
        attendentParticipant = [];
      }
    }

    const updatedRegistered = registeredParticipant.filter((id) => id !== user.id);
    const updatedAttendent = attendentParticipant.filter((id) => id !== user.id);

    const updatedParticipants = participants.filter((id) => id !== user.id);
    await event.update({
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length,
      registeredParticipant: updatedRegistered,
      attendentParticipant: updatedAttendent
    });

    let joinedEvents: string[] = user.joinedEvents || [];
    if (typeof joinedEvents === 'string')
      joinedEvents = JSON.parse(joinedEvents);
    const updatedJoinedEvents = joinedEvents.filter(
      (eid) => eid !== event.eventId
    );
    await user.update({ joinedEvents: updatedJoinedEvents });

    res.status(200).json({
      message: 'Successfully left the event',
      event: {
        eventId: event.eventId,
        name: event.name,
        joinsCount: updatedParticipants.length,
        participantIds: updatedParticipants
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error leaving event', error });
  }
};

// ✅ Get Event Participants
export const getEventParticipantsHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
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

    let participantIds: string[] = event.participants || [];
    if (typeof participantIds === 'string')
      participantIds = JSON.parse(participantIds);

    const participants = await User.findAll({
      where: { id: participantIds },
      attributes: ['id', 'name', 'email']
    });

    res.status(200).json({
      eventId: event.eventId,
      eventName: event.name,
      joinsCount: event.joinsCount,
      participantIds,
      participants: participants.map((p) => ({
        userId: p.id,
        name: p.name,
        email: p.email
      }))
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get User Joined Events
export const getUserJoinedEventsHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
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

    let eventIds: string[] = user.joinedEvents || [];
    if (typeof eventIds === 'string') eventIds = JSON.parse(eventIds);

    let joinedEventsWithDetails: any[] = [];
    if (eventIds.length > 0) {
      const events = await EventTable.findAll({
        where: { eventId: eventIds },
        attributes: [
          'eventId',
          'name',
          'location',
          'startDate',
          'endDate',
          'joinsCount'
        ]
      });
      joinedEventsWithDetails = events.map((event) => ({
        eventId: event.eventId,
        eventName: event.name,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        participantsCount: event.joinsCount
      }));
    }

    res.status(200).json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      totalEventsJoined: eventIds.length,
      joinedEventIds: eventIds,
      joinedEvents: joinedEventsWithDetails
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Event Profile (No Auth)
export const getEventProfileHandler: EndpointHandler<
  EndpointAuthType.NONE
> = async (req: any, res: Response): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await EventTable.findByPk(eventId, {
      include: [
        {
          association: 'eventLogs',
          attributes: [
            'id',
            'userId',
            'checkInTime',
            'checkOutTime',
            'totalHours'
          ]
        }
      ]
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const joinedCount = event.eventLogs?.length || 0;
    let registered = event.registeredParticipant || [];
    if (typeof registered === 'string') {
      try { registered = JSON.parse(registered); } catch { registered = []; }
    }
    const displayRegisteredParticipant = registered.length;

    const eventProfile = {
      eventId: event.eventId,
      eventName: event.name,
      location: event.location,
      joinedCount,
      startDate: event.startDate,
      endDate: event.endDate,
      details: event.details,
      description: event.description,
      reward: event.rewards,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      participants: joinedCount,
      registeredParticipant: event.registeredParticipant,
      displayRegisteredParticipant,
      attendentParticipant: event.attendentParticipant
    };

    res
      .status(200)
      .json({ message: 'Event profile retrieved successfully', eventProfile });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching event profile', error });
  }
};

// ✅ Get All Events Profiles (No Auth)
export const getAllEventsProfileHandler: EndpointHandler<
  EndpointAuthType.NONE
> = async (_req: any, res: Response): Promise<void> => {
  try {
    const events = await EventTable.findAll({
      include: [{ association: 'eventLogs', attributes: ['id', 'userId'] }],
      order: [['startDate', 'DESC']]
    });

    const eventsProfile = events.map((event) => {
      let registered = event.registeredParticipant || [];
      if (typeof registered === 'string') {
        try { registered = JSON.parse(registered); } catch { registered = []; }
      }
      const displayRegisteredParticipant = registered.length;

      return {
        eventId: event.eventId,
        eventName: event.name,
        location: event.location,
        joinedCount: event.eventLogs?.length || 0,
        startDate: event.startDate,
        endDate: event.endDate,
        details: event.details,
        description: event.description,
        reward: event.rewards,
        createdAt: event.createdAt,
        registeredParticipant: event.registeredParticipant,
        displayRegisteredParticipant,
        attendentParticipant: event.attendentParticipant
      };
    });

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

// ✅ Get Leaderboard (across all events)
export const getLeaderboardHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const eventLogs = await EventLogs.findAll({
      include: [{ association: 'user', attributes: ['id', 'name', 'email'] }],
      attributes: ['userId', 'totalHours', 'garbageWeight', 'eventId']
    });

    const userStatsMap = new Map<string, any>();

    eventLogs.forEach((log: any) => {
      const userId = log.userId;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId,
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
        points: Math.floor(((user.totalHours * 60) / 30) * 5)
      }));

    res.status(200).json({
      message: 'User leaderboard retrieved successfully',
      totalUsers: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching leaderboard', error });
  }
};

// ✅ Get Dashboard (User Profile)
export const getDashboardHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
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
      attributes: ['id', 'name', 'email', 'role', 'joinedEvents']
    });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    let eventIds: string[] = user.joinedEvents || [];
    if (typeof eventIds === 'string') eventIds = JSON.parse(eventIds);

    let eventsJoinedWithDetails: any[] = [];
    if (eventIds.length > 0) {
      const fullEvents = await EventTable.findAll({
        where: { eventId: { [Op.in]: eventIds } },
        attributes: [
          'eventId',
          'name',
          'location',
          'startDate',
          'endDate',
          'joinsCount',
          'eventImage'
        ]
      });
      eventsJoinedWithDetails = fullEvents.map((event) => ({
        eventId: event.eventId,
        eventName: event.name,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        joinedCount: event.joinsCount,
        eventImage: event.eventImage || null
      }));
    }

    const eventLogs = await EventLogs.findAll({
      where: { userId },
      attributes: ['totalHours', 'garbageWeight']
    });

    const totalHours = eventLogs.reduce(
      (sum, log) => sum + (log.totalHours || 0),
      0
    );
    const totalMinutesLogged = Math.floor(totalHours * 60);
    const totalGarbageCollected = eventLogs.reduce(
      (sum, log) => sum + (log.garbageWeight || 0),
      0
    );
    const co2Collected = (totalGarbageCollected * 0.5).toFixed(2);
    const totalPoints = Math.floor((totalMinutesLogged / 30) * 5);

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
        totalWeight: parseFloat(totalGarbageCollected.toFixed(2)),
        todayHours: await getUserTodayHours(userId)
      },
      eventsJoined: eventsJoinedWithDetails
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching dashboard', error });
  }
};

// ✅ Get Event Leaderboard
export const getEventLeaderboardHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await EventTable.findByPk(eventId, {
      attributes: ['eventId', 'name', 'startDate', 'endDate', 'location']
    });
    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    const eventLogs = await EventLogs.findAll({
      where: { eventId: event.eventId },
      include: [{ association: 'user', attributes: ['id', 'name', 'email'] }],
      attributes: [
        'userId',
        'totalHours',
        'garbageWeight',
        'checkInTime',
        'checkOutTime'
      ]
    });

    const userStatsMap = new Map<string, any>();

    eventLogs.forEach((log: any) => {
      const userId = log.userId;
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId,
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
      if (
        log.checkInTime &&
        (!stats.checkInTime ||
          new Date(log.checkInTime) < new Date(stats.checkInTime))
      ) {
        stats.checkInTime = log.checkInTime;
      }
      if (
        log.checkOutTime &&
        (!stats.checkOutTime ||
          new Date(log.checkOutTime) > new Date(stats.checkOutTime))
      ) {
        stats.checkOutTime = log.checkOutTime;
      }
    });

    const leaderboard = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        totalHours: user.totalHours,
        garbageWeightCollected: parseFloat(user.totalGarbageWeight.toFixed(2)),
        checkInTime: user.checkInTime,
        checkOutTime: user.checkOutTime,
        eventName: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        logEntries: user.logsCount
      }));

    res.status(200).json({
      message: 'Event leaderboard retrieved successfully',
      eventDetails: {
        eventId: event.eventId,
        eventName: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        totalParticipants: leaderboard.length
      },
      leaderboard
    });
  } catch (error) {
    reportError(error);
    res
      .status(500)
      .json({ message: 'Error fetching event leaderboard', error });
  }
};

// ✅ Update Event Status (Admin Only)
export const updateEventStatusHandler: EndpointHandler<
  EndpointAuthType.JWT
> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ message: 'Invalid status' });
    return;
  }

  try {
    const event = await EventTable.findByPk(id);
    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    let attendentParticipant: string[] = event.attendentParticipant || [];
    if (typeof attendentParticipant === 'string') {
      try {
        attendentParticipant = JSON.parse(attendentParticipant);
      } catch {
        attendentParticipant = [];
      }
    }

    if (status === 'approved') {
      if (event.createdBy && !attendentParticipant.includes(event.createdBy)) {
        attendentParticipant = [...attendentParticipant, event.createdBy];
      }

      const org = await Organization.findByPk(event.createdBy);
      if (org) {
        let orgEventIds: string[] = org.eventIds || [];
        if (typeof orgEventIds === 'string') {
          try { orgEventIds = JSON.parse(orgEventIds); } catch { orgEventIds = []; }
        }
        if (!orgEventIds.includes(event.eventId)) {
          await org.update({ eventIds: [...orgEventIds, event.eventId] });
        }
      }
    }

    await EventTable.update(
      {
        status,
        attendentParticipant
      },
      {
        where: { eventId: id }
      }
    );

    const updatedEvent = await EventTable.findByPk(id);
    res.status(200).json({ message: 'Event status updated successfully', event: updatedEvent });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Failed to update event status', error });
  }
};

// ✅ Register for Event (Increment registeredParticipant)
export const registerEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const event = await EventTable.findByPk(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    let participants: string[] = event.participants || [];
    if (typeof participants === 'string')
      participants = JSON.parse(participants);

    // Prevent duplicate registration
    if (participants.includes(user.id)) {
      res.status(400).json({
        message: 'You have already registered for this event',
        success: false
      });
      return;
    }

    let registered: string[] = event.registeredParticipant || [];
    if (typeof registered === 'string') {
      try { registered = JSON.parse(registered); } catch { registered = []; }
    }
    if (!registered.includes(user.id)) {
      registered = [...registered, user.id];
    }

    const updatedParticipants = [...participants, user.id];
    await event.update({
      registeredParticipant: registered,
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length
    });

    // Update user's joinedEvents
    let joinedEvents: string[] = user.joinedEvents || [];
    if (typeof joinedEvents === 'string')
      joinedEvents = JSON.parse(joinedEvents);
    if (!joinedEvents.includes(event.eventId)) {
      await user.update({ joinedEvents: [...joinedEvents, event.eventId] });
    }

    const displayRegisteredParticipant = registered.length;

    res.status(200).json({
      message: 'Successfully registered for event',
      success: true,
      data: {
        eventId: event.eventId,
        eventName: event.name,
        registeredParticipant: registered,
        displayRegisteredParticipant,
        attendentParticipant: event.attendentParticipant
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error registering for event', error });
  }
};

// ✅ Record Attendance (Increment attendentParticipant via QR scan)
export const attendanceEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = req.body.userId || getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found' });
    return;
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const event = await EventTable.findByPk(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Check if user is registered for this event
    let registeredParticipant: string[] = event.registeredParticipant || [];
    if (typeof registeredParticipant === 'string') {
      try { registeredParticipant = JSON.parse(registeredParticipant); } catch { registeredParticipant = []; }
    }

    if (!registeredParticipant.includes(user.id)) {
      res.status(400).json({
        message: `User (${user.id}) is not registered for this event (${id})`,
        success: false
      });
      return;
    }

    // Check for duplicate attendance scan using EventLogs
    // const existingLog = await EventLogs.findOne({
    //   where: { userId, eventId: id }
    // });

    // if (existingLog) {
    //   res.status(400).json({
    //     message: 'This user has already scanned their QR or started a session for this event',
    //     success: false
    //   });
    //   return;
    // }

    // Move from registered to attendent
    let registered: string[] = event.registeredParticipant || [];
    if (typeof registered === 'string') {
      try { registered = JSON.parse(registered); } catch { registered = []; }
    }
    
    let attendent: string[] = event.attendentParticipant || [];
    if (typeof attendent === 'string') {
      try { attendent = JSON.parse(attendent); } catch { attendent = []; }
    }

    // Remove from registered if present
    const updatedRegistered = registered.filter(rid => rid !== user.id);
    
    // Add to attendent if not present
    if (!attendent.includes(user.id)) {
      attendent = [...attendent, user.id];
    }

    await event.update({
      registeredParticipant: updatedRegistered,
      attendentParticipant: attendent
    });

    res.status(200).json({
      message: 'Attendance recorded successfully',
      success: true,
      data: {
        eventId: event.eventId,
        eventName: event.name,
        registeredParticipant: updatedRegistered,
        displayRegisteredParticipant: updatedRegistered.length,
        attendentParticipant: attendent
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error recording attendance', error });
  }
};

// ✅ Start Event (Automatically create check-in logs for attendees)
export const startEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;
  const orgId = getUserIdFromRequest(req);

  try {
    if (!orgId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    let attendent: string[] = event.attendentParticipant || [];
    if (typeof attendent === 'string') {
      try { attendent = JSON.parse(attendent); } catch { attendent = []; }
    }

    const activeAttendees = attendent.filter(id => id !== orgId);
    if (activeAttendees.length === 0) {
      res.status(400).json({
        message: 'At least one participant must be scanned before starting the event.',
        success: false
      });
      return;
    }

    const existingLogs = await EventLogs.findAll({
      where: { eventId, checkOutTime: null }
    });

    if (existingLogs.length > 0) {
      res.status(400).json({
        message: 'Event is already started and active.',
        success: false
      });
      return;
    }

    const checkInTime = new Date();

    for (const userId of activeAttendees) {
      await EventLogs.create({
        eventId,
        userId,
        checkInTime,
        checkOutTime: null,
        totalHours: 0,
        garbageWeight: 0,
        hoursEnrolled: '0'
      });
    }

    res.status(200).json({
      message: 'Event started successfully',
      success: true,
      checkInTime
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error starting event', error });
  }
};

// ✅ Stop Event (Bulk checkout, split weight, calculate elapsed hours, and distribute points)
export const stopEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;
  const orgId = getUserIdFromRequest(req);
  const { totalWeight = 0, location, garbageType } = req.body;

  try {
    if (!orgId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const activeLogs = await EventLogs.findAll({
      where: { eventId, checkOutTime: null }
    });

    if (activeLogs.length === 0) {
      // Everyone already checked out, or nobody checked in.
      // The event is stopped, but no active logs to process.
      res.status(200).json({
        message: 'Event stopped successfully. No active check-ins found.',
        success: true,
        splitWeight: 0,
        attendeesCount: 0
      });
      return;
    }

    const checkOutTime = new Date();
    const count = activeLogs.length;
    const splitWeight = count > 0 ? Number(totalWeight) / count : 0;

    let eventElapsedHours = 0;

    for (const log of activeLogs) {
      const elapsedMs = checkOutTime.getTime() - new Date(log.checkInTime).getTime();
      const elapsedHours = Math.max(0.1, parseFloat((elapsedMs / (1000 * 3600)).toFixed(2)));

      if (eventElapsedHours === 0) {
        eventElapsedHours = elapsedHours;
      }

      await log.update({
        checkOutTime,
        totalHours: elapsedHours,
        garbageWeight: splitWeight,
        garbageType: garbageType || log.garbageType,
        eventLocation: location || log.eventLocation
      });
    }

    const organization = await Organization.findByPk(orgId);
    if (organization) {
      await organization.update({
        totalHours: (organization.totalHours || 0) + eventElapsedHours,
        totalGarbageWeight: (organization.totalGarbageWeight || 0) + Number(totalWeight)
      });
    }

    res.status(200).json({
      message: 'Event stopped successfully and points distributed!',
      success: true,
      splitWeight,
      attendeesCount: count
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error stopping event', error });
  }
};

// ✅ Get Event Active Status (Retrieve if started, and retrieve starting checkInTime)
export const getEventStatusHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const activeLog = await EventLogs.findOne({
      where: { eventId, checkOutTime: null }
    });

    res.status(200).json({
      isStarted: !!activeLog,
      checkInTime: activeLog ? activeLog.checkInTime : null
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching event status', error });
  }
};
