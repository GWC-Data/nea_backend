import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError,
  sequelize
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { EventLogs, User } from 'db';
import { Op } from 'sequelize';
import {
  USER_NOT_FOUND,
  USER_CREATION_ERROR,
  USER_UPDATE_ERROR,
  USER_DELETION_ERROR,
  USER_GET_ERROR
} from './users.const';
import {
  REWARD_POINTS_PER_30_MINS,
  BADGE_SILVER_HOURS,
  BADGE_GOLD_HOURS,
  BADGE_DIAMOND_HOURS,
  CO2_PER_KG_WASTE
} from '../event-logs/event-logs.const';


interface AggregatedStats {
  totalWasteCollected: number | null;
  totalTimeLogged: number | null;
  completedActivities: number | null;
}

// Helper function to get user ID from request (returns UUID string)
const getUserIdFromRequest = (req: any): string | undefined => {
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

// ✅ Create User
export const createUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {
  const { name, email, password, role, age, gender } = req.body; // removed groupId

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      age: age !== undefined ? age : null,
      gender: gender !== undefined ? gender : null,
      // orgId defaults to [], joinedEvents defaults to []
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userResponse.id,
        name: userResponse.name,
        email: userResponse.email,
        role: userResponse.role
      }
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_CREATION_ERROR, error });
  }
};

// ✅ Get All Users
export const getAllUsersHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    const usersResponse = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      age: u.age,
      gender: u.gender,
      orgId: u.orgId,           // array of organization IDs
      createdAt: u.createdAt
    }));

    res.status(200).json({ users: usersResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get User By ID (from token)
export const getUserByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
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
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      gender: user.gender,
      orgId: user.orgId,
      joinedEvents: user.joinedEvents,
      createdAt: user.createdAt
    };

    res.status(200).json({ user: userResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR });
  }
};

// ✅ Update User
export const updateUserHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  const { name, email, role, age, gender } = req.body; // removed groupId

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;

    await user.update(updateData);

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!updatedUser) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      age: updatedUser.age,
      gender: updatedUser.gender,
      joinedEvents: updatedUser.joinedEvents,
      orgId: updatedUser.orgId
    };

    res.status(200).json({ message: 'User updated successfully', user: userResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_UPDATE_ERROR, error });
  }
};

// ✅ Delete User
export const deleteUserHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    res.status(401).json({ message: 'User ID not found in token' });
    return;
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_DELETION_ERROR, error });
  }
};

// ✅ Update User Password (if needed)
export const updateUserPasswordHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_UPDATE_ERROR, error });
  }
};

// ✅ Get Users by Role
export const getUsersByRoleHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { role } = req.params;

  try {
    const users = await User.findAll({
      where: { role },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    res.status(200).json({ users });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get Users by Gender (keep if needed)
export const getUsersByGenderHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {
  const { gender } = req.params;

  try {
    const users = await User.findAll({
      where: { gender },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    res.status(200).json({ users });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ========== PROFILE & LEADERBOARD ==========

// ✅ Get User Profile (authenticated user's own profile)
export const getUserProfileHandler: EndpointHandler<EndpointAuthType.JWT> = async (
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
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'orgId'],
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'totalHours', 'garbageWeight', 'eventId', 'groupId', 'checkOutTime'],
          where: { checkOutTime: { [Op.ne]: null } },
          required: false
        }
      ]
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const eventLogs = user.eventLogs || [];
    const totalTimeLogged = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalWasteCollected = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);
    const co2Collected = totalWasteCollected * CO2_PER_KG_WASTE;
    const eventsJoined = new Set(eventLogs.map(log => log.eventId)).size;
    
    // Groups joined: use orgId array length (each org acts as a group)
    const groupsJoined = (user.orgId as string[])?.length || 0;
    
    const totalPoints = Math.floor((totalTimeLogged * 60) / 30) * REWARD_POINTS_PER_30_MINS;

    let overallBadge = null;
    if (totalTimeLogged >= BADGE_DIAMOND_HOURS) overallBadge = 'diamond_champion';
    else if (totalTimeLogged >= BADGE_GOLD_HOURS) overallBadge = 'gold';
    else if (totalTimeLogged >= BADGE_SILVER_HOURS) overallBadge = 'silver';

    const userProfile = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
      totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
      totalMinutesLogged: Math.floor(totalTimeLogged * 60),
      co2Collected: parseFloat(co2Collected.toFixed(2)),
      eventsJoined,
      groupsJoined,
      totalPoints,
      overallBadge,
      completedActivities: eventLogs.length,
      memberSince: user.createdAt
    };

    res.status(200).json({ message: 'User profile retrieved successfully', userProfile });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching user profile', error });
  }
};

// ✅ Get All Users Profiles (no auth)
export const getAllUsersProfileHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req: any,
  res: Response
): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'orgId'],
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'totalHours', 'garbageWeight', 'eventId', 'groupId', 'checkOutTime'],
          where: { checkOutTime: { [Op.ne]: null } },
          required: false
        }
      ]
    });

    const usersProfile = users.map(user => {
      const eventLogs = user.eventLogs || [];
      const totalTimeLogged = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      const totalWasteCollected = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);
      const co2Collected = totalWasteCollected * CO2_PER_KG_WASTE;
      const eventsJoined = new Set(eventLogs.map(log => log.eventId)).size;
      const groupsJoined = (user.orgId as string[])?.length || 0;
      const totalPoints = Math.floor((totalTimeLogged * 60) / 30) * REWARD_POINTS_PER_30_MINS;

      let overallBadge = null;
      if (totalTimeLogged >= BADGE_DIAMOND_HOURS) overallBadge = 'diamond_champion';
      else if (totalTimeLogged >= BADGE_GOLD_HOURS) overallBadge = 'gold';
      else if (totalTimeLogged >= BADGE_SILVER_HOURS) overallBadge = 'silver';

      return {
        userId: user.id,
        userName: user.name,
        email: user.email,
        totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
        totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
        co2Collected: parseFloat(co2Collected.toFixed(2)),
        eventsJoined,
        groupsJoined,
        totalPoints,
        overallBadge,
        completedActivities: eventLogs.length
      };
    });

    usersProfile.sort((a, b) => b.totalPoints - a.totalPoints);

    res.status(200).json({
      message: 'All users profiles retrieved successfully',
      totalUsers: usersProfile.length,
      usersProfile
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching users profiles', error });
  }
};

// ✅ Get User Leaderboard
export const getUserLeaderboardHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: any,
  res: Response
): Promise<void> => {
  try {
    const { limit = 10, sortBy = 'totalPoints' } = req.query;

    const users = await User.findAll({
      attributes: ['id', 'name', 'email'],
      include: [
        {
          association: 'eventLogs',
          attributes: ['id', 'totalHours', 'garbageWeight', 'eventId', 'groupId', 'checkOutTime'],
          where: { checkOutTime: { [Op.ne]: null } },
          required: false
        }
      ]
    });

    const usersLeaderboard = users.map((user, index) => {
      const eventLogs = user.eventLogs || [];
      const totalTimeLogged = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      const totalWasteCollected = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);
      const totalPoints = Math.floor((totalTimeLogged * 60) / 30) * REWARD_POINTS_PER_30_MINS;

      return {
        rank: index + 1,
        userId: user.id,
        userName: user.name,
        email: user.email,
        totalPoints,
        totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
        totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
        eventsJoined: new Set(eventLogs.map(log => log.eventId)).size
      };
    });

    if (sortBy === 'totalWaste') {
      usersLeaderboard.sort((a, b) => b.totalWasteCollected - a.totalWasteCollected);
    } else if (sortBy === 'totalTime') {
      usersLeaderboard.sort((a, b) => b.totalTimeLogged - a.totalTimeLogged);
    } else {
      usersLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    usersLeaderboard.forEach((user, index) => { user.rank = index + 1; });

    const limitNum = Math.min(parseInt(limit, 10) || 10, usersLeaderboard.length);
    const topUsers = usersLeaderboard.slice(0, limitNum);

    res.status(200).json({
      message: 'User leaderboard retrieved successfully',
      sortedBy: sortBy,
      totalUsers: usersLeaderboard.length,
      topUsers
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching leaderboard', error });
  }
};






export const getFullUserProfileHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const requesterId = getUserIdFromRequest(req);
  const requesterRole = (req as any).decoded?.role || (req as any).user?.role;

  // Basic permission check: Only the user themselves or an admin can access full profile
  if (String(requesterId) !== String(userId) && requesterRole !== 'admin') {
    res.status(403).json({ message: 'Forbidden: You do not have permission to view this profile' });
    return;
  }

  try {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Aggregate from completed event logs - cast the result to the expected shape
    const stats = (await EventLogs.findOne({
      where: { userId, checkOutTime: { [Op.ne]: null } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('garbageWeight')), 'totalWasteCollected'],
        [sequelize.fn('SUM', sequelize.col('totalHours')), 'totalTimeLogged'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'completedActivities']
      ],
      raw: true
    })) as unknown as AggregatedStats | null;

    const totalWaste = Number(stats?.totalWasteCollected) || 0;
    const totalHours = Number(stats?.totalTimeLogged) || 0;
    const totalPoints = Math.floor((totalHours * 60) / 30) * REWARD_POINTS_PER_30_MINS;
    const co2Collected = totalWaste * CO2_PER_KG_WASTE;

    const eventsJoined = await EventLogs.count({
      where: { userId, checkOutTime: { [Op.ne]: null } },
      distinct: true,
      col: 'eventId'
    });

    // groupsJoined = number of organizations the user belongs to
    const groupsJoined = (user.orgId as string[])?.length || 0;

    let overallBadge: string | null = null;
    if (totalHours >= BADGE_DIAMOND_HOURS) overallBadge = 'diamond_champion';
    else if (totalHours >= BADGE_GOLD_HOURS) overallBadge = 'gold';
    else if (totalHours >= BADGE_SILVER_HOURS) overallBadge = 'silver';

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      gender: user.gender,
      orgId: user.orgId,
      totalWasteCollected: totalWaste,
      totalTimeLogged: totalHours,
      co2Collected,
      eventsJoined,
      groupsJoined,
      totalPoints,
      overallBadge,
      completedActivities: Number(stats?.completedActivities) || 0
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error retrieving user profile', error });
  }
};