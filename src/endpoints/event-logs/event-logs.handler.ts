import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventLogs } from 'db';
import {
  EVENT_LOG_NOT_FOUND,
  EVENT_LOG_CREATION_ERROR,
  EVENT_LOG_UPDATE_ERROR,
  EVENT_LOG_DELETION_ERROR,
  EVENT_LOG_GET_ERROR,
  EVENT_LOG_ALREADY_CHECKED_IN,
//   EVENT_LOG_NOT_CHECKED_IN,
  CHECK_OUT_TIME_BEFORE_CHECK_IN
} from './event-logs.const';
import { Op } from 'sequelize';

export const createEventLogHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {
  const { eventId, userId, groupId, checkInTime, garbageWeight, garbageType } = req.body;

  try {
    // Check if groupId column exists in EventLogs table
    const attributes = Object.keys(EventLogs.getAttributes());
    const hasGroupIdColumn = attributes.includes('groupId');

    // Check if user already checked in for this event
    const existingLog = await EventLogs.findOne({
      where: {
        eventId,
        userId,
        checkOutTime: null
      }
    });

    if (existingLog) {
      res.status(400).json({ message: EVENT_LOG_ALREADY_CHECKED_IN });
      return;
    }

    // Create data object based on existing columns
    const eventLogData: any = {
      eventId,
      userId,
      checkInTime: checkInTime || new Date(),
      checkOutTime: null,
      totalHours: 0,
      garbageWeight: garbageWeight || 0,
      garbageType
    };
    
    // Only add groupId if the column exists
    if (hasGroupIdColumn && groupId) {
      eventLogData.groupId = groupId;
    }

    const newEventLog = await EventLogs.create(eventLogData);

    res.status(200).json({ message: 'Check in successful', eventLog: newEventLog });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_CREATION_ERROR, error });
  }
};

// ✅ Get All Event Logs
export const getAllEventLogsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req,
  res
): Promise<void> => {
  try {
    const eventLogs = await EventLogs.findAll({
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
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
export const getEventLogByIdHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;

  try {
    const eventLog = await EventLogs.findByPk(id, {
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
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

// ✅ Update Event Log (Check Out)
export const updateEventLogHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;
  const { checkOutTime, garbageWeight, garbageType } = req.body;

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

      // Calculate total hours
      const diffMs = checkOutDate.getTime() - checkInDate.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      await eventLog.update({
        checkOutTime: checkOutDate,
        totalHours,
        garbageWeight: garbageWeight !== undefined ? garbageWeight : eventLog.garbageWeight,
        garbageType: garbageType !== undefined ? garbageType : eventLog.garbageType
      });

      res.status(200).json({ message: 'Check out successful', eventLog });
    } else {
      const updateData: any = {};
      if (garbageWeight !== undefined) updateData.garbageWeight = garbageWeight;
      if (garbageType !== undefined) updateData.garbageType = garbageType;

      await eventLog.update(updateData);
      res.status(200).json({ message: 'Event log updated successfully', eventLog });
    }
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_UPDATE_ERROR, error });
  }
};

// ✅ Delete Event Log
export const deleteEventLogHandler: EndpointHandler<EndpointAuthType.NONE> = async (
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

    await eventLog.destroy();

    res.status(200).json({ message: 'Event log deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_DELETION_ERROR, error });
  }
};

// ✅ Get Event Logs by User
export const getEventLogsByUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { userId } = req.params;

  try {
    const eventLogs = await EventLogs.findAll({
      where: { userId },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
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

// ✅ Get Event Logs by Event
export const getEventLogsByEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const eventLogs = await EventLogs.findAll({
      where: { eventId },
      include: [
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
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

// ✅ Get User Event Logs by Date
export const getUserEventLogsByDateHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { userId, date } = req.params;

  try {
    const eventLogs = await EventLogs.findAll({
      where: {
        userId,
        checkInTime: {
          [Op.between]: [new Date(date), new Date(new Date(date).setHours(23, 59, 59))]
        }
      },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] }
      ]
    });

    res.status(200).json({ eventLogs });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};

// ✅ Get Event Logs by Date Range
export const getEventLogsByDateRangeHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { startDate, endDate } = req.body;

  try {
    const eventLogs = await EventLogs.findAll({
      where: {
        checkInTime: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      include: [
        { association: 'event', attributes: ['eventId', 'name', 'location', 'date'] },
        { association: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['checkInTime', 'ASC']]
    });

    res.status(200).json({ eventLogs });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_LOG_GET_ERROR, error });
  }
};