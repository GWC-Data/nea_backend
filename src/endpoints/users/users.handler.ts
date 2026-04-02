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
import {
  USER_NOT_FOUND,
  USER_CREATION_ERROR,
  USER_UPDATE_ERROR,
  USER_DELETION_ERROR,
  USER_GET_ERROR
} from './users.const';

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

    res.status(201).json({ message: 'User created successfully', user: userResponse });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_CREATION_ERROR, error });
  }
};

// ✅ Get All Users
export const getAllUsersHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  _req,
  res
) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [
        { association: 'group', attributes: ['groupId', 'groupName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ users });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR, error });
  }
};

// ✅ Get User By ID
export const getUserByIdHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {

  const { id } = req.params;

  try {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { association: 'group',  attributes: ['groupId', 'groupName'] }
      ]
    });

    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_GET_ERROR });
  }
};

// ✅ Update User (all fields optional)
export const updateUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {

  const { id } = req.params;
  const { name, email, role, age, gender, groupId } = req.body;

  try {
    const user = await User.findByPk(id);

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
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: USER_UPDATE_ERROR, error });
  }
};

// ✅ Delete User
export const deleteUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {

  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

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