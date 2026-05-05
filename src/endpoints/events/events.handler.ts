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
  const { startDate, endDate, location, name, details, description, rewards, eventType } = req.body;
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
    const eventStatus = (userRole === 'admin' || userRole === 'organization') ? 'approved' : 'pending';

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
      eventImage: eventImagePath,
      joinsCount: 0,
      participants: [],
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
    res.status(200).json({ events });
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

    res.status(200).json({
      event,
      eventId: event.eventId,
      participantsCount: event.joinsCount,
      participantIds: participants
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
  const { startDate, endDate, location, name, details, description, rewards, eventType, participants, joinsCount } = req.body;
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
    if (eventType !== undefined) updateData.eventType = eventType || 'public';

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

    let participants: string[] = event.participants || [];
    if (typeof participants === 'string')
      participants = JSON.parse(participants);

    // Check if user already joined (by user.id UUID)
    if (participants.includes(user.id)) {
      res.status(400).json({
        message: 'You have already joined this event.',
        success: false
      });
      return;
    }

    let eventImagePath = null;
    if ((req as any).file) {
      eventImagePath = getRelativeImagePath((req as any).file.path);
    }

    const updatedParticipants = [...participants, user.id];
    const updateData: any = {
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length
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
        totalParticipants: updatedParticipants.length,
        participantIds: updatedParticipants
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

    const updatedParticipants = participants.filter((id) => id !== user.id);
    await event.update({
      participants: updatedParticipants,
      joinsCount: updatedParticipants.length
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
      participants: joinedCount
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

    const eventsProfile = events.map((event) => ({
      eventId: event.eventId,
      eventName: event.name,
      location: event.location,
      joinedCount: event.eventLogs?.length || 0,
      startDate: event.startDate,
      endDate: event.endDate,
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

    event.status = status;
    await event.save();

    res.status(200).json({ message: 'Event status updated successfully', event });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Failed to update event status', error });
  }
};