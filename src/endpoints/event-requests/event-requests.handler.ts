import { Request, Response } from 'express';
import { EventRequestTable } from '../../db/models/EventRequestTable';
import { reportError } from 'node-server-engine';

const getUserIdFromRequest = (req: any): string | undefined => {
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

export const createEventRequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, organizationEmail, date, time, description } = req.body;
    
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' }); return;
    }

    const eventRequest = await EventRequestTable.create({
      name,
      organizationEmail,
      date,
      time,
      description,
      status: 'pending',
      createdBy: userId,
    });

    res.status(201).json(eventRequest); return;
  } catch (error: any) {
    reportError(error, req);
    res.status(500).json({ message: 'Internal Server Error' }); return;
  }
};

export const getAllEventRequestsHandler = async (req: Request, res: Response) => {
  try {
    const requests = await EventRequestTable.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(requests); return;
  } catch (error: any) {
    reportError(error, req);
    res.status(500).json({ message: 'Internal Server Error' }); return;
  }
};

export const getMyEventRequestsHandler = async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' }); return;
    }

    const requests = await EventRequestTable.findAll({
      where: { createdBy: userId },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(requests); return;
  } catch (error: any) {
    reportError(error, req);
    res.status(500).json({ message: 'Internal Server Error' }); return;
  }
};

export const updateEventRequestStatusHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`[event-requests] PUT status: id=${id}, status=${status}`);

    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' }); return;
    }

    // Use static update() to guarantee the SQL UPDATE fires
    const [affectedCount] = await EventRequestTable.update(
      { status },
      { where: { requestId: id } }
    );

    console.log(`[event-requests] Rows affected: ${affectedCount}`);

    if (affectedCount === 0) {
      res.status(404).json({ message: 'Event request not found or no change made' }); return;
    }

    // Return the fresh row from DB
    const updated = await EventRequestTable.findByPk(id);
    res.status(200).json(updated); return;
  } catch (error: any) {
    console.error('[event-requests] updateEventRequestStatusHandler error:', error);
    reportError(error, req);
    res.status(500).json({ message: 'Internal Server Error' }); return;
  }
};
