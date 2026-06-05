// endpoints/event-logs/event-logs.handler.ts

import {
  EndpointAuthType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventLogs, User,EventTable, Organization } from 'db';
import {
  EVENT_LOG_NOT_FOUND,
  EVENT_LOG_CREATION_ERROR,
  EVENT_LOG_UPDATE_ERROR,
  EVENT_LOG_DELETION_ERROR,
  EVENT_LOG_GET_ERROR,
  EVENT_LOG_ALREADY_CHECKED_IN,
  CHECK_OUT_TIME_BEFORE_CHECK_IN,
  REWARD_POINTS_PER_30_MINS,
  BADGE_SILVER_HOURS,
  BADGE_GOLD_HOURS,
  BADGE_DIAMOND_HOURS,
  BADGE_MESSAGES
} from './event-logs.const';
import { Op } from 'sequelize';
import { deleteImageFile, getRelativeImagePath } from 'config/multerConfig';

// Helper: convert "30min", "1hours", "1.5hours" to totalHours (float)
// function parseHoursEnrolled(value: string): number {
//   if (!value) return 0;
//   const str = value.trim().toLowerCase();
//   if (str.endsWith('min')) {
//     const mins = parseFloat(str);
//     return isNaN(mins) ? 0 : mins / 60;
//   }
//   if (str.endsWith('hours')) {
//     const hrs = parseFloat(str);
//     return isNaN(hrs) ? 0 : hrs;
//   }
//   const hrs = parseFloat(str);
//   return isNaN(hrs) ? 0 : hrs;
// }

// Helper function to calculate rewards
function calculateRewards(totalHours: number): { points: number; badge: string | null; message: string | null } {
  const totalMinutes = totalHours * 60;
  const points = Math.floor(totalMinutes / 30) * REWARD_POINTS_PER_30_MINS;
  
  let badge = null;
  let message = null;
  
  if (totalHours >= BADGE_DIAMOND_HOURS) {
    badge = 'diamond_champion';
    message = BADGE_MESSAGES.DIAMOND;
  } else if (totalHours >= BADGE_GOLD_HOURS) {
    badge = 'gold';
    message = BADGE_MESSAGES.GOLD;
  } else if (totalHours >= BADGE_SILVER_HOURS) {
    badge = 'silver';
    message = BADGE_MESSAGES.SILVER;
  }
  
  return { points, badge, message };
}

// Helper function to get user ID from request bearer token (returns UUID string)
const getUserIdFromRequest = (req: any): string | undefined => {
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

// Helper function to get user's total hours across all logs (accepts UUID string)
export async function getUserTotalHours(userId: string): Promise<number> {
  const logs = await EventLogs.findAll({ where: { userId } });
  return logs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
}

// Helper function to get user's total hours for today (accepts UUID string)
export async function getUserTodayHours(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await EventLogs.findAll({
    where: {
      userId,
      checkInTime: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      }
    }
  });
  return logs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
}

/**
 * Helper: get the YYYY-MM-DD formatted date string for a given date in Singapore timezone
 */
export function getSingaporeDateString(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Helper: calculate total hours already logged by a user for a specific event on a specific date (Singapore timezone)
 */
export async function getUserEventTodayHours(
  userId: string,
  eventId: string,
  dateStr: string,
  excludeLogId?: string | number
): Promise<number> {
  const whereClause: any = { userId, eventId };
  if (excludeLogId) {
    whereClause.id = { [Op.ne]: excludeLogId };
  }
  
  const logs = await EventLogs.findAll({ where: whereClause });
  
  return logs.reduce((sum, log) => {
    if (log.checkOutTime && log.totalHours) {
      const logSGDate = getSingaporeDateString(log.checkInTime);
      if (logSGDate === dateStr) {
        return sum + log.totalHours;
      }
    }
    return sum;
  }, 0);
}

// ✅ Create Event Log (Check In) with hoursEnrolled
// export const createEventLogHandler: EndpointHandler<EndpointAuthType.JWT> = async (
//   req: any,
//   res: Response
// ): Promise<void> => {
//   const { eventId, groupId, checkInTime, garbageWeight, garbageType, hoursEnrolled } = req.body;
//   const userId = getUserIdFromRequest(req);

//   try {
//     if (!userId) {
//       res.status(401).json({ message: 'User ID not found in token' });
//       return;
//     }

//     // Convert hoursEnrolled to totalHours (float)
//     let totalHours = 0;
//     if (hoursEnrolled) {
//       totalHours = parseHoursEnrolled(hoursEnrolled);
//     }

//     // Check if groupId column exists in EventLogs table
//     const attributes = Object.keys(EventLogs.getAttributes());
//     const hasGroupIdColumn = attributes.includes('groupId');

//     // Check if user already checked in for this event
//     const existingLog = await EventLogs.findOne({
//       where: {
//         eventId,
//         userId,
//         checkOutTime: null
//       }
//     });

//     if (existingLog) {
//       res.status(400).json({ message: EVENT_LOG_ALREADY_CHECKED_IN });
//       return;
//     }

//     // Build data object with correct types
//     const eventLogData: any = {
//       eventId,                       // string (UUID)
//       userId,                        // string (UUID)
//       checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
//       checkOutTime: null,
//       totalHours,                    // number
//       hoursEnrolled: hoursEnrolled || null,  // store original string
//       garbageWeight: garbageWeight ? parseFloat(garbageWeight) : 0,
//       garbageType: garbageType || null,
//       wasteImage: null
//     };
    
//     // Only add groupId if column exists and is a valid number
//     if (hasGroupIdColumn && groupId && groupId !== 'null' && groupId !== null) {
//       const groupIdNum = parseInt(groupId, 10);
//       if (!isNaN(groupIdNum)) {
//         eventLogData.groupId = groupIdNum;
//       }
//     }

//     // Handle waste image if uploaded
//     if (req.file) {
//       eventLogData.wasteImage = getRelativeImagePath(req.file.path);
//     }

//     const newEventLog = await EventLogs.create(eventLogData);
    
//     // Fetch the created record with associations
//     const createdEventLog = await EventLogs.findByPk(newEventLog.id, {
//       include: [
//         { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
//         { association: 'user', attributes: ['id', 'name', 'email'] },
//         { association: 'group', attributes: ['groupId', 'groupName'] }
//       ]
//     });

//     res.status(200).json({ 
//       message: 'Check in successful', 
//       eventLog: createdEventLog
//     });
//   } catch (error) {
//     // Delete uploaded file if there's an error
//     if (req.file) {
//       deleteImageFile(req.file.path);
//     }
//     reportError(error);
//     res.status(500).json({ message: EVENT_LOG_CREATION_ERROR, error });
//   }
// };

// ✅ Create Event Log (Check In) with hoursEnrolled and eventLocation
export const createEventLogHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: any,
  res: Response
): Promise<void> => {
  const { eventId, groupId, checkInTime, garbageWeight, garbageType, hoursEnrolled } = req.body;
  const userId = getUserIdFromRequest(req);

  try {
    if (!userId) {
      res.status(401).json({ message: 'User ID not found in token' });
      return;
    }

    // Fetch the event to get its location
    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Restrict checking in/starting clean-up if the event has already ended/completed
    if (event.endDate && new Date(event.endDate) < new Date()) {
      res.status(400).json({
        message: 'This event has already completed/ended.'
      });
      return;
    }

    const totalHours = 0;
    // if (hoursEnrolled) {
    //   totalHours = parseHoursEnrolled(hoursEnrolled);
    // }

    // Enforce 2-hour daily limit per event (Singapore timezone)
    const referenceDate = checkInTime ? new Date(checkInTime) : new Date();
    const dateStr = getSingaporeDateString(referenceDate);
    const alreadyLoggedHours = await getUserEventTodayHours(userId, eventId, dateStr);
    
    let incomingHours = 0;
    if (hoursEnrolled) {
      incomingHours = parseFloat(hoursEnrolled);
      if (isNaN(incomingHours)) incomingHours = 0;
    }

    if (alreadyLoggedHours + incomingHours > 2.01) {
      res.status(400).json({ 
        message: `You have reached the daily hours limit for this event.` 
      });
      return;
    }

    const attributes = Object.keys(EventLogs.getAttributes());
    const hasGroupIdColumn = attributes.includes('groupId');

    const existingLog = await EventLogs.findOne({
      where: { eventId, userId, checkOutTime: null }
    });

    if (existingLog) {
      res.status(400).json({ message: EVENT_LOG_ALREADY_CHECKED_IN });
      return;
    }

    const eventLogData: any = {
      eventId,
      userId,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: null,
      totalHours,
      hoursEnrolled: hoursEnrolled || null,
      garbageWeight: garbageWeight ? parseFloat(garbageWeight) : 0,
      garbageType: garbageType || null,
      wasteImage: null,
      eventLocation: event.location   // ✅ store current event location
    };

    if (hasGroupIdColumn && groupId && groupId !== 'null' && groupId !== null) {
      const groupIdNum = parseInt(groupId, 10);
      if (!isNaN(groupIdNum)) {
        eventLogData.groupId = groupIdNum;
      }
    }

    if (req.file) {
      eventLogData.wasteImage = getRelativeImagePath(req.file.path);
    }

    const newEventLog = await EventLogs.create(eventLogData);

    const createdEventLog = await EventLogs.findByPk(newEventLog.id, {
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ]
    });

    res.status(200).json({ message: 'Check in successful', eventLog: createdEventLog });
  } catch (error) {
    if (req.file) deleteImageFile(req.file.path);
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_CREATION_ERROR, error });
  }
};

// ✅ GET /timer – returns active timer with hoursEnrolled
export const getTimerHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: any,
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const activeLog = await EventLogs.findOne({
      where: { userId, checkOutTime: null },
      order: [['checkInTime', 'DESC']],
    });

    if (!activeLog) {
      res.status(404).json({ message: 'No active timer found for this user' });
      return;
    }

    res.status(200).json({
      checkInTime: activeLog.checkInTime,
      hoursEnrolled: activeLog.hoursEnrolled,
      eventId: activeLog.eventId,
      logId: activeLog.id,
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching active timer', error });
  }
};

// ✅ Get All Event Logs
export const getAllEventLogsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req,
  res
): Promise<void> => {
  try {
    const eventLogs = await EventLogs.findAll({
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['checkInTime', 'DESC']]
    });

    res.status(200).json({ eventLogs });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get Event Log By ID
export const getEventLogByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;

  try {
    const eventLog = await EventLogs.findByPk(id, {
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
        { association: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ]
    });

    if (!eventLog) {
      res.status(404).json({ message: EVENT_LOG_NOT_FOUND });
      return;
    }

    res.status(200).json({ eventLog });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR });
  }
};

// ✅ Update Event Log (Check Out) with Rewards
// export const updateEventLogHandler: EndpointHandler<EndpointAuthType.JWT> = async (
//   req: any,
//   res: Response
// ): Promise<void> => {
//   const { id } = req.params;
//   const { checkOutTime, garbageWeight, garbageType } = req.body;

//   try {
//     const eventLog = await EventLogs.findByPk(id);

//     if (!eventLog) {
//       res.status(404).json({ message: EVENT_LOG_NOT_FOUND });
//       return;
//     }

//     if (checkOutTime) {
//       const checkOutDate = new Date(checkOutTime);
//       const checkInDate = new Date(eventLog.checkInTime);

//       if (checkOutDate < checkInDate) {
//         res.status(400).json({ message: CHECK_OUT_TIME_BEFORE_CHECK_IN });
//         return;
//       }

//       // Calculate total hours for this session
//       const diffMs = checkOutDate.getTime() - checkInDate.getTime();
//       const sessionHours = diffMs / (1000 * 60 * 60);
      
//       // Get user's previous total hours
//       const previousTotalHours = await getUserTotalHours(eventLog.userId);
//       const newTotalHours = previousTotalHours + sessionHours;
      
//       // Calculate rewards for this session
//       const sessionRewards = calculateRewards(sessionHours);
      
//       // Calculate total rewards (cumulative)
//       const totalRewards = calculateRewards(newTotalHours);

//       const updateData: any = {
//         checkOutTime: checkOutDate,
//         totalHours: sessionHours,
//         garbageWeight: garbageWeight !== undefined ? parseFloat(garbageWeight) : eventLog.garbageWeight,
//         garbageType: garbageType !== undefined ? garbageType : eventLog.garbageType
//       };

//       // Handle waste image upload
//       if (req.file) {
//         if (eventLog.wasteImage) {
//           deleteImageFile(eventLog.wasteImage);
//         }
//         updateData.wasteImage = getRelativeImagePath(req.file.path);
//       }

//       await eventLog.update(updateData);

//       // Get updated event log with associations
//       const updatedEventLog = await EventLogs.findByPk(id, {
//         include: [
//           { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
//           { association: 'user', attributes: ['id', 'name', 'email'] },
//           { association: 'group', attributes: ['groupId', 'groupName'] }
//         ]
//       });

//       // Prepare response with rewards
//       const responseData: any = {
//         message: 'Check out successful',
//         eventLog: updatedEventLog,
//         sessionRewards: {
//           hours: sessionHours.toFixed(2),
//           minutes: Math.floor(sessionHours * 60),
//           points: sessionRewards.points,
//           badge: sessionRewards.badge,
//           badgeMessage: sessionRewards.message
//         },
//         totalRewards: {
//           totalHours: newTotalHours.toFixed(2),
//           totalMinutes: Math.floor(newTotalHours * 60),
//           totalPoints: totalRewards.points,
//           badge: totalRewards.badge,
//           badgeMessage: totalRewards.message
//         }
//       };

//       res.status(200).json(responseData);
//     } else {
//       // Partial update (no check-out)
//       const updateData: any = {};
//       if (garbageWeight !== undefined) updateData.garbageWeight = parseFloat(garbageWeight);
//       if (garbageType !== undefined) updateData.garbageType = garbageType;

//       if (req.file) {
//         if (eventLog.wasteImage) {
//           deleteImageFile(eventLog.wasteImage);
//         }
//         updateData.wasteImage = getRelativeImagePath(req.file.path);
//       }

//       await eventLog.update(updateData);
      
//       const updatedEventLog = await EventLogs.findByPk(id, {
//         include: [
//           { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
//           { association: 'user', attributes: ['id', 'name', 'email'] },
//           { association: 'group', attributes: ['groupId', 'groupName'] }
//         ]
//       });
      
//       res.status(200).json({ message: 'Event log updated successfully', eventLog: updatedEventLog });
//     }
//   } catch (error) {
//     if (req.file) {
//       deleteImageFile(req.file.path);
//     }
//     reportError(error);
//     res.status(500).json({ message: EVENT_LOG_UPDATE_ERROR, error });
//   }
// };

export const updateEventLogHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: any,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { checkOutTime, garbageWeight, garbageType, eventLocation } = req.body;  // ✅ added eventLocation

  try {
    const eventLog = await EventLogs.findByPk(id);

    if (!eventLog) {
      res.status(404).json({ message: EVENT_LOG_NOT_FOUND });
      return;
    }

    if (checkOutTime) {
      const checkOutDate = new Date(checkOutTime);
      const checkInDate = new Date(eventLog.checkInTime);

      if (checkOutDate < checkInDate) {
        res.status(400).json({ message: CHECK_OUT_TIME_BEFORE_CHECK_IN });
        return;
      }

      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const sessionHours = diffMs / (1000 * 60 * 60);
      
      // Enforce the 2-hour daily limit per event for check-out (Singapore timezone)
      const dateStr = getSingaporeDateString(eventLog.checkInTime);
      const alreadyLoggedHours = await getUserEventTodayHours(eventLog.userId, eventLog.eventId, dateStr, eventLog.id);

      if (alreadyLoggedHours + sessionHours > 2.01) {
        res.status(400).json({
          message: `Logging this session would exceed the 2-hour daily limit for this event today. You have already logged ${alreadyLoggedHours.toFixed(1)} hours for this event, and this session is ${sessionHours.toFixed(1)} hours.`
        });
        return;
      }
      
      const previousTotalHours = await getUserTotalHours(eventLog.userId);
      const newTotalHours = previousTotalHours + sessionHours;
      
      const sessionRewards = calculateRewards(sessionHours);
      const totalRewards = calculateRewards(newTotalHours);

      const updateData: any = {
        checkOutTime: checkOutDate,
        totalHours: sessionHours,
        garbageWeight: garbageWeight !== undefined ? parseFloat(garbageWeight) : eventLog.garbageWeight,
        garbageType: garbageType !== undefined ? garbageType : eventLog.garbageType
      };

      // ✅ Allow updating eventLocation
      if (eventLocation !== undefined) {
        updateData.eventLocation = eventLocation;
      }

      if (req.file) {
        if (eventLog.wasteImage) {
          deleteImageFile(eventLog.wasteImage);
        }
        updateData.wasteImage = getRelativeImagePath(req.file.path);
      }

      await eventLog.update(updateData);

      const updatedEventLog = await EventLogs.findByPk(id, {
        include: [
          { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate', 'endDate'] },
          { association: 'user', attributes: ['id', 'name', 'email'] },
          { association: 'group', attributes: ['groupId', 'groupName'] }
        ]
      });

      const responseData: any = {
        message: 'Check out successful',
        eventLog: updatedEventLog,
        sessionRewards: {
          hours: sessionHours.toFixed(2),
          minutes: Math.floor(sessionHours * 60),
          points: sessionRewards.points,
          badge: sessionRewards.badge,
          badgeMessage: sessionRewards.message
        },
        totalRewards: {
          totalHours: newTotalHours.toFixed(2),
          totalMinutes: Math.floor(newTotalHours * 60),
          totalPoints: totalRewards.points,
          badge: totalRewards.badge,
          badgeMessage: totalRewards.message
        }
      };

      res.status(200).json(responseData);
    } else {
      // Partial update (no check-out)
      const updateData: any = {};
      if (garbageWeight !== undefined) updateData.garbageWeight = parseFloat(garbageWeight);
      if (garbageType !== undefined) updateData.garbageType = garbageType;
      if (eventLocation !== undefined) updateData.eventLocation = eventLocation;  // ✅

      if (req.file) {
        if (eventLog.wasteImage) {
          deleteImageFile(eventLog.wasteImage);
        }
        updateData.wasteImage = getRelativeImagePath(req.file.path);
      }

      await eventLog.update(updateData);
      
      const updatedEventLog = await EventLogs.findByPk(id, {
        include: [
          { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
          { association: 'user', attributes: ['id', 'name', 'email'] },
          { association: 'group', attributes: ['groupId', 'groupName'] }
        ]
      });
      
      res.status(200).json({ message: 'Event log updated successfully', eventLog: updatedEventLog });
    }
  } catch (error) {
    if (req.file) {
      deleteImageFile(req.file.path);
    }
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_UPDATE_ERROR, error });
  }
};

// ✅ Delete Event Log
export const deleteEventLogHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;

  try {
    const eventLog = await EventLogs.findByPk(id);

    if (!eventLog) {
      res.status(404).json({ message: EVENT_LOG_NOT_FOUND });
      return;
    }

    if (eventLog.wasteImage) {
      deleteImageFile(eventLog.wasteImage);
    }

    await eventLog.destroy();

    res.status(200).json({ message: 'Event log deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_DELETION_ERROR, error });
  }
};

// ✅ Get Event Logs by User (extract userId from token)
export const getEventLogsByUserHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const eventLogs = await EventLogs.findAll({
      where: { userId },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['checkInTime', 'DESC']]
    });

    if (!eventLogs || eventLogs.length === 0) {
      res.status(200).json({
        message: 'No event logs found for this user',
        eventLogs: [],
        stats: {
          totalHours: '0.00',
          totalMinutes: 0,
          totalPoints: 0,
          completedEvents: 0,
          currentBadge: null,
          badgeMessage: null
        }
      });
      return;
    }

    const totalHours = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalPoints = Math.floor((totalHours * 60) / 30) * REWARD_POINTS_PER_30_MINS;
    const completedEvents = eventLogs.filter(log => log.checkOutTime).length;
    const rewards = calculateRewards(totalHours);

    res.status(200).json({ 
      message: 'Event logs retrieved successfully',
      eventLogs,
      stats: {
        totalHours: totalHours.toFixed(2),
        totalMinutes: Math.floor(totalHours * 60),
        totalPoints,
        completedEvents,
        currentBadge: rewards.badge,
        badgeMessage: rewards.message
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get Event Logs by Event
export const getEventLogsByEventHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const eventLogs = await EventLogs.findAll({
      where: { eventId },
      include: [
        { association: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['checkInTime', 'DESC']]
    });

    const totalParticipants = eventLogs.length;
    const totalHours = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalGarbageWeight = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);

    res.status(200).json({ 
      eventLogs,
      stats: {
        totalParticipants,
        totalHours: totalHours.toFixed(2),
        totalGarbageWeight: totalGarbageWeight.toFixed(2),
        averageHoursPerParticipant: totalParticipants > 0 ? (totalHours / totalParticipants).toFixed(2) : 0
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get User Event Logs by Date (extract userId from token)
export const getUserEventLogsByDateHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { date } = req.params;
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const eventLogs = await EventLogs.findAll({
      where: {
        userId,
        checkInTime: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] }
      ],
      order: [['checkInTime', 'ASC']]
    });

    const totalHours = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalPoints = Math.floor((totalHours * 60) / 30) * REWARD_POINTS_PER_30_MINS;

    res.status(200).json({ 
      eventLogs,
      date,
      stats: {
        totalHours: totalHours.toFixed(2),
        totalPoints,
        eventsCount: eventLogs.length
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get Event Logs by Date Range
export const getEventLogsByDateRangeHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { startDate, endDate } = req.body;

  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const eventLogs = await EventLogs.findAll({
      where: {
        checkInTime: {
          [Op.between]: [start, end]
        }
      },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'startDate'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['checkInTime', 'ASC']]
    });

    const totalHours = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalPoints = Math.floor((totalHours * 60) / 30) * REWARD_POINTS_PER_30_MINS;
    const totalGarbageWeight = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);
    const uniqueParticipants = new Set(eventLogs.map(log => log.userId)).size;

    res.status(200).json({ 
      eventLogs,
      dateRange: { startDate, endDate },
      stats: {
        totalHours: totalHours.toFixed(2),
        totalPoints,
        totalGarbageWeight: totalGarbageWeight.toFixed(2),
        totalEvents: eventLogs.length,
        uniqueParticipants,
        averageHoursPerParticipant: uniqueParticipants > 0 ? (totalHours / uniqueParticipants).toFixed(2) : 0
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get User Rewards Summary (extract userId from token)
export const getUserRewardsSummaryHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email']
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const eventLogs = await EventLogs.findAll({
      where: {
        userId,
        checkOutTime: { [Op.ne]: null }
      }
    });

    const totalHours = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalPoints = Math.floor((totalHours * 60) / 30) * REWARD_POINTS_PER_30_MINS;
    const rewards = calculateRewards(totalHours);
    
    const badgeHistory = [];
    if (totalHours >= BADGE_SILVER_HOURS) badgeHistory.push({ badge: 'silver', hours: BADGE_SILVER_HOURS, earnedAt: new Date() });
    if (totalHours >= BADGE_GOLD_HOURS) badgeHistory.push({ badge: 'gold', hours: BADGE_GOLD_HOURS, earnedAt: new Date() });
    if (totalHours >= BADGE_DIAMOND_HOURS) badgeHistory.push({ badge: 'diamond_champion', hours: BADGE_DIAMOND_HOURS, earnedAt: new Date() });

    res.status(200).json({
      user,
      rewards: {
        totalHours: totalHours.toFixed(2),
        totalMinutes: Math.floor(totalHours * 60),
        totalPoints,
        currentBadge: rewards.badge,
        currentBadgeMessage: rewards.message,
        nextBadge: totalHours < BADGE_SILVER_HOURS ? { badge: 'silver', hoursNeeded: (BADGE_SILVER_HOURS - totalHours).toFixed(2) } :
                    totalHours < BADGE_GOLD_HOURS ? { badge: 'gold', hoursNeeded: (BADGE_GOLD_HOURS - totalHours).toFixed(2) } :
                    totalHours < BADGE_DIAMOND_HOURS ? { badge: 'diamond_champion', hoursNeeded: (BADGE_DIAMOND_HOURS - totalHours).toFixed(2) } : null,
        badgeHistory,
        completedEvents: eventLogs.length
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};


export const bulkCheckInHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { eventId, checkInTime, hoursEnrolled, users } = req.body;
  const orgId = getUserIdFromRequest(req); // org ID from JWT

  try {
    if (!orgId) {
      res.status(401).json({ message: 'Organization ID not found in token' });
      return;
    }

    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Optional: verify that the event belongs to this organization (event.createdBy === orgId)
    if (event.createdBy !== orgId) {
      res.status(403).json({ message: 'Organization not authorized for this event' });
      return;
    }

    // Prevent duplicate open check-ins
    const existingOpen = await EventLogs.findOne({
      where: {
        eventId,
        userId: { [Op.in]: users },
        checkOutTime: null
      }
    });
    if (existingOpen) {
      res.status(409).json({ message: 'One or more users already have an open check‑in for this event' });
      return;
    }

    const checkInDate = new Date(checkInTime);
    const dateStr = getSingaporeDateString(checkInDate);
    const incomingHours = parseFloat(hoursEnrolled) || 0;

    // Enforce 2-hour daily limit per event for all bulk checked-in volunteers
    for (const userId of users) {
      const alreadyLoggedHours = await getUserEventTodayHours(userId, eventId, dateStr);
      if (alreadyLoggedHours + incomingHours > 2.01) {
        const user = await User.findByPk(userId);
        const userName = user ? user.name : userId;
        res.status(400).json({
          message: `User "${userName}" has already logged ${alreadyLoggedHours.toFixed(1)} hours for this event today. Enrolling them for ${incomingHours.toFixed(1)} hours would exceed the 2-hour daily limit.`
        });
        return;
      }
    }

    const createdLogs = [];

    for (const userId of users) {
      const log = await EventLogs.create({
        eventId,
        userId,
        checkInTime: checkInDate,
        hoursEnrolled: String(hoursEnrolled),
        totalHours: 0,
        garbageWeight: 0,
        eventLocation: event.location,
        groupId: null, // or derive from user's group if needed
      });
      createdLogs.push(log);
    }

    // Optionally update organization's eventIds list if not already present
    const org = await Organization.findByPk(orgId);
    if (org && (!org.eventIds || !org.eventIds.includes(eventId))) {
      await org.update({ eventIds: [...(org.eventIds || []), eventId] });
    }

    res.status(201).json({
      message: 'Bulk check‑in successful',
      checkedInCount: createdLogs.length,
      eventId
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error during bulk check‑in', error });
  }
};


// ✅ Bulk Check‑Out Handler
export const bulkCheckOutHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { checkOutTime, garbageWeight, garbageType, eventLocation, users, eventId } = req.body;
  const orgId = getUserIdFromRequest(req);

  try {
    if (!orgId) {
      res.status(401).json({ message: 'Organization ID not found in token' });
      return;
    }

    // Handle uploaded waste image (if any)
    let wasteImagePath: string | null = null;
    if (req.file) {
      wasteImagePath = getRelativeImagePath(req.file.path);
    }

    let totalHoursSum = 0;
    let totalWeightSum = 0;
    let updatedCount = 0;
    const weight = parseFloat(garbageWeight);

    // Validate that none of the check-outs would exceed the 2-hour daily limit per event today
    for (const userId of users) {
      const whereClause: any = { userId, checkOutTime: null };
      if (eventId) whereClause.eventId = eventId;

      const log = await EventLogs.findOne({
        where: whereClause,
        order: [['checkInTime', 'DESC']]
      });

      if (!log) continue;

      const checkIn = new Date(log.checkInTime);
      const checkOut = new Date(checkOutTime);
      if (checkOut < checkIn) continue;

      const sessionHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const dateStr = getSingaporeDateString(checkIn);
      const alreadyLoggedHours = await getUserEventTodayHours(userId, log.eventId, dateStr, log.id);

      if (alreadyLoggedHours + sessionHours > 2.01) {
        const user = await User.findByPk(userId);
        const userName = user ? user.name : userId;
        res.status(400).json({
          message: `Checking out user "${userName}" would exceed the 2-hour daily limit for this event today. They have already logged ${alreadyLoggedHours.toFixed(1)} hours, and this session is ${sessionHours.toFixed(1)} hours.`
        });
        return;
      }
    }

    for (const userId of users) {
      // Build where clause: open check‑in, optionally filter by eventId
      const whereClause: any = { userId, checkOutTime: null };
      if (eventId) whereClause.eventId = eventId;

      const log = await EventLogs.findOne({
        where: whereClause,
        order: [['checkInTime', 'DESC']]
      });

      if (!log) continue; // No active check‑in for this user

      const checkIn = new Date(log.checkInTime);
      const checkOut = new Date(checkOutTime);
      if (checkOut < checkIn) {
        // Skip invalid check‑out (time before check‑in)
        continue;
      }

      const sessionHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      totalHoursSum += sessionHours;
      totalWeightSum += weight;

      await log.update({
        checkOutTime: checkOut,
        totalHours: sessionHours,
        garbageWeight: weight,
        garbageType: garbageType || null,
        eventLocation: eventLocation || log.eventLocation,
        wasteImage: wasteImagePath || log.wasteImage
      });

      updatedCount++;
    }

    // Update organization aggregates (totalHours and totalGarbageWeight)
    if (totalHoursSum > 0 || totalWeightSum > 0) {
      const Organization = (await import('db/models/Organization')).Organization;
      await Organization.increment(
        {
          totalHours: totalHoursSum,
          totalGarbageWeight: totalWeightSum
        },
        { where: { orgId } }
      );
    }

    res.status(200).json({
      message: 'Bulk check‑out successful',
      updatedCount,
      totalHoursLogged: totalHoursSum.toFixed(2),
      totalGarbageCollected: totalWeightSum.toFixed(2)
    });
  } catch (error) {
    // Clean up uploaded file if something went wrong
    if (req.file) {
      deleteImageFile(req.file.path);
    }
    reportError(error);
    res.status(500).json({ message: 'Error during bulk check‑out', error });
  }
};

// ✅ Check Event Logs Daily limit for multiple users/scanned volunteers (Lightweight API)
export const checkEventLogsLimitHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: any,
  res: Response
): Promise<void> => {
  const { eventId, date, userIds } = req.body;

  try {
    if (!eventId || !date || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(200).json({ maxHours: 0, userName: '' });
      return;
    }

    // Fetch completed logs for the target event and users
    const logs = await EventLogs.findAll({
      where: {
        eventId,
        userId: { [Op.in]: userIds },
        checkOutTime: { [Op.ne]: null }
      },
      include: [
        { association: 'user', attributes: ['name'] }
      ]
    });

    // Group logs by userId and calculate the total sum for the target date (Singapore timezone)
    const userHoursMap: Record<string, { name: string; hours: number }> = {};
    logs.forEach((log) => {
      if (!log.checkInTime || !log.totalHours) return;
      const logSGDate = getSingaporeDateString(log.checkInTime);
      if (logSGDate === date) {
        const uId = log.userId;
        const uName = log.user?.name || 'Volunteer';
        if (!userHoursMap[uId]) {
          userHoursMap[uId] = { name: uName, hours: 0 };
        }
        userHoursMap[uId].hours += log.totalHours;
      }
    });

    let maxHours = 0;
    let maxHoursUserName = '';

    Object.values(userHoursMap).forEach((entry) => {
      if (entry.hours > maxHours) {
        maxHours = entry.hours;
        maxHoursUserName = entry.name;
      }
    });

    res.status(200).json({
      maxHours,
      userName: maxHoursUserName || 'Volunteer'
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error checking limits', error });
  }
};