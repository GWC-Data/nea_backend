// endpoints/events/events.handler.ts

import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { EventTable, User } from 'db';
import {
  EVENT_NOT_FOUND,
  EVENT_CREATION_ERROR,
  EVENT_UPDATE_ERROR,
  EVENT_DELETION_ERROR,
  EVENT_GET_ERROR,
  EVENT_DATE_PAST,
  // USER_ALREADY_JOINED,
  USER_NOT_FOUND as USER_NOT_FOUND_ERROR
} from './events.const';
import { Op } from 'sequelize';

// ✅ Create Event with new fields
export const createEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {
  const { date, location, name, details, description, rewards } = req.body;

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
      name,
      details: details || null,
      description: description || null,
      rewards: rewards || null,
      joinsCount: 0,
      participants: []
    });

    res.status(200).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_CREATION_ERROR, error });
  }
};

// endpoints/events/events.handler.ts

// ✅ Join Event - Store only userId (integer)
export const joinEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { eventId } = req.params;
  const { userId } = req.body;

  try {
    const sequelize = EventTable.sequelize;

    // Get user info (just to verify user exists)
    const users = await sequelize!.query(
      `SELECT id FROM Users WHERE id = :userId`,
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

    // Check if user already joined using JSON_SEARCH (for integer array)
    const [checkResult] = await sequelize!.query(
      `SELECT JSON_SEARCH(participants, 'one', :userId) as found 
       FROM EventTable WHERE eventId = :eventId`,
      {
        replacements: { userId: userId.toString(), eventId: eventId },
        type: 'SELECT'
      }
    ) as any;

    if (checkResult?.found) {
      res.status(400).json({ 
        message: 'You have already joined this event. Each user can join an event only once.',
        success: false
      });
      return;
    }

    // Get current participants (should be an array of integers)
    const [currentData] = await sequelize!.query(
      `SELECT COALESCE(participants, '[]') as participants FROM EventTable WHERE eventId = :eventId`,
      { replacements: { eventId: eventId }, type: 'SELECT' }
    ) as any;

    let participantsArray: number[] = [];
    if (currentData?.participants) {
      participantsArray = typeof currentData.participants === 'string' 
        ? JSON.parse(currentData.participants) 
        : currentData.participants;
    }

    // Double-check with array method
    if (participantsArray.includes(userId)) {
      res.status(400).json({ 
        message: 'You have already joined this event.',
        success: false
      });
      return;
    }

    // Add userId to participants array
    const updatedParticipants = [...participantsArray, userId];
    const participantsJSON = JSON.stringify(updatedParticipants);

    // Update EventTable
    await sequelize!.query(
      `UPDATE EventTable 
       SET participants = :participants, 
           joinsCount = :joinsCount 
       WHERE eventId = :eventId`,
      {
        replacements: {
          participants: participantsJSON,
          joinsCount: updatedParticipants.length,
          eventId: eventId
        }
      }
    );

    // Update user's joined events (store only eventId as integer)
    const [userData] = await sequelize!.query(
      `SELECT COALESCE(joinedEvents, '[]') as joinedEvents FROM Users WHERE id = :userId`,
      { replacements: { userId: userId }, type: 'SELECT' }
    ) as any;

    let joinedEventsArray: number[] = [];
    if (userData?.joinedEvents) {
      joinedEventsArray = typeof userData.joinedEvents === 'string'
        ? JSON.parse(userData.joinedEvents)
        : userData.joinedEvents;
    }

    // Check if event already in user's joined events
    if (!joinedEventsArray.includes(event.eventId)) {
      const updatedJoinedEvents = [...joinedEventsArray, event.eventId];
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

    res.status(200).json({
      message: `Successfully joined the event: ${event.name}`,
      success: true,
      data: {
        eventId: updatedEvent.eventId,
        eventName: updatedEvent.name,
        totalParticipants: updatedEvent.joinsCount,
        participants: updatedEvent.participants
      }
    });
  } catch (error) {
    console.error('Error in joinEventHandler:', error);
    reportError(error);
    res.status(500).json({ message: 'Error joining event', error });
  }
};

// ✅ Leave Event (User leaves an event)
export const leaveEventHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { eventId } = req.params;
  const { userId } = req.body;

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

    // Get current participants
    let participants = event.participants || [];
    if (typeof participants === 'string') {
      participants = JSON.parse(participants);
    }

    // Check if user is in participants
    const wasJoined = participants.some((p: any) => p.userId === userId);
    if (!wasJoined) {
      res.status(400).json({ message: 'User has not joined this event' });
      return;
    }

    // Remove user from participants
    participants = participants.filter((p: any) => p.userId !== userId);

    // Update event
    await event.update({
      participants: participants,
      joinsCount: participants.length
    });

    // Update user's joinedEvents
    let joinedEvents = user.joinedEvents || [];
    if (typeof joinedEvents === 'string') {
      joinedEvents = JSON.parse(joinedEvents);
    }

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
export const getEventParticipantsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { eventId } = req.params;

  try {
    const event = await EventTable.findByPk(eventId);
    if (!event) {
      res.status(404).json({ message: EVENT_NOT_FOUND });
      return;
    }

    res.status(200).json({ 
      eventId: event.eventId,
      eventName: event.name,
      joinsCount: event.joinsCount,
      participants: event.participants
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
  }
};

// ✅ Get User Joined Events
export const getUserJoinedEventsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'joinedEvents']
    });
    
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND_ERROR });
      return;
    }

    res.status(200).json({ 
      userId: user.id,
      userName: user.name,
      joinedEvents: user.joinedEvents
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EVENT_GET_ERROR, error });
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

// ✅ Get Event By ID with participants
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

    res.status(200).json({ 
      event,
      participantsCount: event.joinsCount,
      participantsList: event.participants
    });
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
  const { date, location, name, details, description, rewards } = req.body;

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

// ✅ Get Popular Events (most joined)
export const getPopularEventsHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
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