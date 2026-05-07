import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
// import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { EventLogs, EventTable, Organization, User } from 'db/models';
import {
  ORGANIZATION_NOT_FOUND,
  ORGANIZATION_CREATION_ERROR,
  ORGANIZATION_UPDATE_ERROR,
  ORGANIZATION_DELETION_ERROR,
  ORGANIZATION_GET_ERROR,
  ORGANIZATION_NAME_EXISTS,
  ORGANIZATION_EMAIL_EXISTS
} from './organization.const';
import { Op } from 'sequelize';

// Helper function to get userId from request
const getUserIdFromRequest = (req: any): string | undefined => {
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

// ✅ Create Organization
export const createOrganizationHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {
  const { orgName, name, email, password, address, phone } = req.body;

  try {
    // Check if organization name already exists
    const existingOrgName = await Organization.findOne({ where: { orgName } });
    if (existingOrgName) {
      res.status(400).json({ message: ORGANIZATION_NAME_EXISTS });
      return;
    }

    // Check if email already exists
    const existingEmail = await Organization.findOne({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: ORGANIZATION_EMAIL_EXISTS });
      return;
    }

    // Hash the plain password from frontend before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new organization
    const newOrg = await Organization.create({
      orgName,
      name,
      email,
      password: hashedPassword,
      address,
      phone,
      status: 'pending',
      userIds: [],
      eventIds: [],
      totalHours: 0,
      totalGarbageWeight: 0,
    });

    const orgResponse = newOrg.toJSON();
    delete orgResponse.password;

    res.status(201).json({
      message: 'Organization created successfully',
      organization: orgResponse,
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_CREATION_ERROR, error });
  }
};

// ✅ Get All Organizations
export const getAllOrganizationsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  try {
    const organizations = await Organization.findAll();
    res.status(200).json({ organizations });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_GET_ERROR, error });
  }
};

// ✅ Get Organization by ID
export const getOrganizationByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { orgId } = req.params;

  try {
    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
      return;
    }

    const orgResponse = organization.toJSON();
    delete orgResponse.password;

    res.status(200).json({ organization: orgResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_GET_ERROR, error });
  }
};

// ✅ Update Organization
export const updateOrganizationHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { orgId } = req.params;
  const { orgName, name, email, address, phone, status } = req.body;

  try {
    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
      return;
    }

    // Check if new orgName already exists (excluding current org)
    if (orgName && orgName !== organization.orgName) {
      const existingOrgName = await Organization.findOne({
        where: { orgName },
      });
      if (existingOrgName) {
        res.status(400).json({ message: ORGANIZATION_NAME_EXISTS });
        return;
      }
    }

    // Check if new email already exists (excluding current org)
    if (email && email !== organization.email) {
      const existingEmail = await Organization.findOne({ where: { email } });
      if (existingEmail) {
        res.status(400).json({ message: ORGANIZATION_EMAIL_EXISTS });
        return;
      }
    }

    // Update organization
    await organization.update({
      ...(orgName && { orgName }),
      ...(name && { name }),
      ...(email && { email }),
      ...(address && { address }),
      ...(phone && { phone }),
      ...(status !== undefined && { status }),
    });

    const orgResponse = organization.toJSON();
    delete orgResponse.password;

    res.status(200).json({
      message: 'Organization updated successfully',
      organization: orgResponse,
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_UPDATE_ERROR, error });
  }
};

// ✅ Delete Organization
export const deleteOrganizationHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { orgId } = req.params;

  try {
    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
      return;
    }

    await organization.destroy();

    res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_DELETION_ERROR, error });
  }
};

// ✅ Get Organization Dashboard
// export const getOrganizationDashboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
//   req: EndpointRequestType[EndpointAuthType.JWT],
//   res: Response
// ): Promise<void> => {
//   const orgId = getUserIdFromRequest(req);

//   try {
//     if (!orgId) {
//       res.status(401).json({ message: 'Organization ID not found in token' });
//       return;
//     }

//     const organization = await Organization.findByPk(orgId);
//     if (!organization) {
//       res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
//       return;
//     }

//     const dashboardData = {
//       message: 'Dashboard retrieved successfully',
//       profile: {
//         orgId: organization.orgId,
//         orgName: organization.orgName,
//         name: organization.name,
//         email: organization.email,
//         address: organization.address,
//         phone: organization.phone,
//         status: organization.status,
//       },
//       stats: {
//         totalUsers: organization.userIds?.length || 0,
//         totalEvents: organization.eventIds?.length || 0,
//         totalHours: organization.totalHours || 0,
//         totalGarbageWeight: organization.totalGarbageWeight || 0,
//       },
//     };

//     res.status(200).json(dashboardData);
//   } catch (error) {
//     reportError(error);
//     res.status(500).json({ message: ORGANIZATION_GET_ERROR, error });
//   }
// };




export const getOrganizationDashboardHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const orgId = getUserIdFromRequest(req); // orgId from JWT

  try {
    if (!orgId) {
      res.status(401).json({ message: 'Organization ID not found in token' });
      return;
    }

    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
      return;
    }

    // 1. Get all users belonging to this organization
    const userIds = organization.userIds || [];
    // const users = await User.findAll({ where: { id: userIds } });

    // 2. Aggregate stats from EventLogs (completed logs)
    const eventLogs = await EventLogs.findAll({
      where: { userId: userIds, checkOutTime: { [Op.ne]: null } },
    });

    let totalMinutesLogged = 0;
    let totalWeight = 0;
    let totalPoints = 0;

    for (const log of eventLogs) {
      const hours = log.totalHours || 0;
      totalMinutesLogged += hours * 60;
      totalWeight += log.garbageWeight || 0;
      totalPoints += Math.floor((hours * 60) / 30) * 5; // 5 points per 30 min
    }

    // 3. Events joined by organization members (distinct events)
    const joinedEventIds = [...new Set(eventLogs.map(log => log.eventId))];
    const eventsJoined = await EventTable.findAll({
      where: { eventId: joinedEventIds },
      attributes: ['eventId', 'name', 'location', 'startDate', 'endDate', 'joinsCount', 'eventImage'],
    });

    // 4. Events created by this organization (public / private)
    const publicEvents = await EventTable.findAll({
      where: { createdBy: orgId, eventType: 'public' },
      attributes: ['eventId', 'name', 'location', 'startDate', 'endDate', 'joinsCount', 'eventImage'],
    });
    const privateEvents = await EventTable.findAll({
      where: { createdBy: orgId, eventType: 'private' },
      attributes: ['eventId', 'name', 'location', 'startDate', 'endDate', 'joinsCount', 'eventImage'],
    });

    // 5. Users who have at least one completed log (users joined)
    const userIdsWithLogs = [...new Set(eventLogs.map(log => log.userId))];
    const usersJoined = await User.findAll({
      where: { id: userIdsWithLogs },
      attributes: ['id', 'name', 'email'],
    });

    // Build response
    const dashboardData = {
  message: 'Dashboard retrieved successfully',
  profile: {
    orgId: organization.orgId,
    name: organization.name,
    email: organization.email,
    role: 'organization',
  },
  stats: {
    totalPoints,
    totalMinutesLogged,
    totalWeight,
  },
  eventsJoined: eventsJoined.map(e => ({
    eventId: e.eventId,
    eventName: e.name,
    location: e.location,
    eventStartDate: e.startDate,
    eventEndDate: e.endDate,
    joinedCount: e.joinsCount,
    eventImage: e.eventImage,
  })),
  events: {
    public: publicEvents.map(e => ({
      eventId: e.eventId,
      eventName: e.name,
      location: e.location,
      eventStartDate: e.startDate,
      eventEndDate: e.endDate,
      joinedCount: e.joinsCount,
      eventImage: e.eventImage,
    })),
    private: privateEvents.map(e => ({
      eventId: e.eventId,
      eventName: e.name,
      location: e.location,
      eventStartDate: e.startDate,
      eventEndDate: e.endDate,
      joinedCount: e.joinsCount,
      eventImage: e.eventImage,
    })),
  },
  usersJoined: usersJoined.map(u => ({
    userId: u.id,
    name: u.name,
    email: u.email,
  })),
};

    res.status(200).json(dashboardData);
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_GET_ERROR, error });
  }
};

// ✅ Add User to Organization
export const addUserToOrganizationHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { orgId } = req.params;
  const { userId } = req.body;

  try {
    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      res.status(404).json({ message: ORGANIZATION_NOT_FOUND });
      return;
    }

    const userIds = organization.userIds || [];
    if (!userIds.includes(userId)) {
      userIds.push(userId);
      await organization.update({ userIds });
    }

    res.status(200).json({
      message: 'User added to organization successfully',
      organization,
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: ORGANIZATION_UPDATE_ERROR, error });
  }
};

// ✅ Get Organization Leaderboard
export const getOrganizationLeaderboardHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const { limit = 5 } = req.query;
    
    const organizations = await Organization.findAll({
      attributes: ['orgId', 'orgName', 'totalHours', 'totalGarbageWeight', 'userIds'],
      order: [['totalHours', 'DESC']],
      limit: parseInt(limit as string, 10) || 5
    });

    const leaderboard = organizations.map((org, index) => ({
      rank: index + 1,
      orgId: org.orgId,
      orgName: org.orgName,
      totalHours: org.totalHours || 0,
      totalGarbageWeight: org.totalGarbageWeight || 0,
      memberCount: (org.userIds as string[])?.length || 0
    }));

    res.status(200).json({
      message: 'Organization leaderboard retrieved successfully',
      leaderboard
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching organization leaderboard', error });
  }
};

// ✅ Get Organization Details from JWT token
export const getOrganizationDetailsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const orgId = getUserIdFromRequest(req);

  if (!orgId) {
    res.status(401).json({ message: 'Organization ID not found in token' });
    return;
  }

  try {
    const organization = await Organization.findByPk(orgId, {
      attributes: { exclude: ['password'] }
    });

    if (!organization) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: organization.orgId,
        orgName: organization.orgName,
        name: organization.name,
        email: organization.email,
        address: organization.address,
        phone: organization.phone,
        userIds: organization.userIds,
        eventIds: organization.eventIds,
        totalHours: organization.totalHours,
        totalGarbageWeight: organization.totalGarbageWeight,
        role: 'organization',
        createdAt: organization.createdAt
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error retrieving organization details', error });
  }
};