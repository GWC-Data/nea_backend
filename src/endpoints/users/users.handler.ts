// users/users.handler.ts

import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from 'db';
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

// Helper function to get user ID from request bearer token
const getUserIdFromRequest = (req: any): number | undefined => {
  // node-server-engine attaches decoded JWT to req.decoded or req.user
  return req.decoded?.id || req.user?.id || req.token?.id || req.decodedToken?.id;
};

// ✅ Create User (age, gender, groupId are optional)
export const createUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {

  const { name, email, password, role, age, gender, groupId } = req.body;

  try {
    // Check if user already exists
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
      age: age !== undefined ? age : null,  // Optional: can be null
      gender: gender !== undefined ? gender : null,  // Optional: can be null
      groupId: groupId !== undefined ? groupId : null  // Optional: can be null
    });

    // Don't send password back in response
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({ 
      message: 'User created successfully', 
      user: {
        id: userResponse.id,
        userUuid: userResponse.userUuid,
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
      include: [
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Map users to include userUuid
    const usersResponse = users.map(u => ({
      id: u.id,
      userUuid: u.userUuid,
      name: u.name,
      email: u.email,
      role: u.role,
      age: u.age,
      gender: u.gender,
      group: u.group,
      createdAt: u.createdAt
    }));

    res.status(200).json({ users: usersResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get User By ID
// ✅ Get User By ID (from bearer token - security: user can only access their own profile)
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
      attributes: { exclude: ['password'] },
      include: [
        { association: 'group',  attributes: ['groupId', 'groupName'] }
      ]
    });

    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    const userResponse = {
      id: user.id,
      userUuid: user.userUuid,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      gender: user.gender,
      group: user.group,
      joinedEvents: user.joinedEvents,
      createdAt: user.createdAt
    };

    res.status(200).json({ user: userResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR });
  }
};

// ✅ Update User (all fields optional) - extract userId from token
export const updateUserHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const userId = getUserIdFromRequest(req);
  const { name, email, role, age, gender, groupId } = req.body;

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

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    // Update only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (groupId !== undefined) updateData.groupId = groupId;

    await user.update(updateData);

    // Get updated user without password
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!updatedUser) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    const userResponse = {
      id: updatedUser.id,
      userUuid: updatedUser.userUuid,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      age: updatedUser.age,
      gender: updatedUser.gender,
      joinedEvents: updatedUser.joinedEvents
    };

    res.status(200).json({ message: 'User updated successfully', user: userResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_UPDATE_ERROR, error });
  }
};

// ✅ Delete User - extract userId from token
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

// ✅ Update User Password
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

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Hash and update new password
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

// ✅ Get Users by Group (groupId is optional in query)
export const getUsersByGroupHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {

  const { groupId } = req.params;

  try {
    // If groupId is provided and valid, filter by it
    if (groupId && groupId !== 'null') {
      const users = await User.findAll({
        where: { groupId: parseInt(groupId) },
        attributes: { exclude: ['password'] },
        include: [
          { association: 'group', attributes: ['groupId', 'groupName'] }
        ],
        order: [['name', 'ASC']]
      });
      res.status(200).json({ users });
    } else {
      // Get users without a group
      const users = await User.findAll({
        where: { groupId: null },
        attributes: { exclude: ['password'] },
        order: [['name', 'ASC']]
      });
      res.status(200).json({ users });
    }
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get Users by Gender
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

// ✅ Get Users without Group
export const getUsersWithoutGroupHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req,
  res
): Promise<void> => {
  try {
    const users = await User.findAll({
      where: { groupId: null },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });

    res.status(200).json({ users });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get User Profile (extract userId from token)
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
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
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

    // Calculate statistics
    const eventLogs = user.eventLogs || [];
    const totalTimeLogged = eventLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    const totalWasteCollected = eventLogs.reduce((sum, log) => sum + (log.garbageWeight || 0), 0);
    const co2Collected = totalWasteCollected * CO2_PER_KG_WASTE;
    const eventsJoined = new Set(eventLogs.map(log => log.eventId)).size;
    const groupsJoined = new Set(eventLogs.map(log => log.groupId).filter(id => id !== null)).size;
    const totalPoints = Math.floor((totalTimeLogged * 60) / 30) * REWARD_POINTS_PER_30_MINS;

    // Determine badge
    let overallBadge = null;
    if (totalTimeLogged >= BADGE_DIAMOND_HOURS) {
      overallBadge = 'diamond_champion';
    } else if (totalTimeLogged >= BADGE_GOLD_HOURS) {
      overallBadge = 'gold';
    } else if (totalTimeLogged >= BADGE_SILVER_HOURS) {
      overallBadge = 'silver';
    }

    const userProfile = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role: user.role,
      totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
      totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
      totalMinutesLogged: Math.floor(totalTimeLogged * 60),
      co2Collected: parseFloat(co2Collected.toFixed(2)),
      eventsJoined: eventsJoined,
      groupsJoined: groupsJoined,
      totalPoints: totalPoints,
      overallBadge: overallBadge,
      completedActivities: eventLogs.length,
      memberSince: user.createdAt
    };

    res.status(200).json({
      message: 'User profile retrieved successfully',
      userProfile
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: 'Error fetching user profile', error });
  }
};

// ✅ Get All Users Profiles
export const getAllUsersProfileHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req: any,
  res: Response
): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
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
      const groupsJoined = new Set(eventLogs.map(log => log.groupId).filter(id => id !== null)).size;
      const totalPoints = Math.floor((totalTimeLogged * 60) / 30) * REWARD_POINTS_PER_30_MINS;

      let overallBadge = null;
      if (totalTimeLogged >= BADGE_DIAMOND_HOURS) {
        overallBadge = 'diamond_champion';
      } else if (totalTimeLogged >= BADGE_GOLD_HOURS) {
        overallBadge = 'gold';
      } else if (totalTimeLogged >= BADGE_SILVER_HOURS) {
        overallBadge = 'silver';
      }

      return {
        userId: user.id,
        userName: user.name,
        email: user.email,
        totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
        totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
        co2Collected: parseFloat(co2Collected.toFixed(2)),
        eventsJoined: eventsJoined,
        groupsJoined: groupsJoined,
        totalPoints: totalPoints,
        overallBadge: overallBadge,
        completedActivities: eventLogs.length
      };
    });

    // Sort by total points descending
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
        totalPoints: totalPoints,
        totalTimeLogged: parseFloat(totalTimeLogged.toFixed(2)),
        totalWasteCollected: parseFloat(totalWasteCollected.toFixed(2)),
        eventsJoined: new Set(eventLogs.map(log => log.eventId)).size
      };
    });

    // Sort by specified field
    if (sortBy === 'totalWaste') {
      usersLeaderboard.sort((a, b) => b.totalWasteCollected - a.totalWasteCollected);
    } else if (sortBy === 'totalTime') {
      usersLeaderboard.sort((a, b) => b.totalTimeLogged - a.totalTimeLogged);
    } else {
      usersLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    // Reassign ranks after sorting
    usersLeaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

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