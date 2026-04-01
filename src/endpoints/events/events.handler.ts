import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventTable } from 'db';
import {
  EVENT_NOT_FOUND,
  EVENT_CREATION_ERROR,
  EVENT_UPDATE_ERROR,
  EVENT_DELETION_ERROR,
  EVENT_GET_ERROR,
  EVENT_DATE_PAST
} from './events.const';
import { Op } from 'sequelize';

// ✅ Create Event
export const createEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {
  const { date, location, name } = req.body;

  try {
    // Check if event date is in the past
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      res.status(400).json({ message: EVENT_DATE_PAST });
      return;
    }

    const newEvent = await EventTable.create({
      date,
      location,
      name
    });

    res.status(200).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_CREATION_ERROR, error });
  }
};

// ✅ Get All Events
export const getAllEventsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req,
  res
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
export const getEventByIdHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;

  try {
    const event = await EventTable.findByPk(id, {
      include: [
        { association: 'eventLogs', attributes: ['id', 'userId', 'checkInTime', 'checkOutTime'] }
      ]
    });

    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    res.status(200).json({ event });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR });
  }
};

// ✅ Update Event
export const updateEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;
  const { date, location, name } = req.body;

  try {
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

    await event.update(updateData);

    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_UPDATE_ERROR, error });
  }
};

// ✅ Delete Event
export const deleteEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;

  try {
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
export const getEventsByDateHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { date } = req.params;

  try {
    const events = await EventTable.findAll({
      where: { date },
      order: [['date', 'ASC']]
    });

    res.status(200).json({ events });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get Upcoming Events
export const getUpcomingEventsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req,
  res
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