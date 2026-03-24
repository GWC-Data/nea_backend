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

// ✅ Create User
export const createUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req: EndpointRequestType[EndpointAuthType.NONE],
  res: Response
): Promise<void> => {

  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(200).json({ message: 'User created successfully', user: newUser });
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
    const users = await User.findAll();

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
    const user = await User.findByPk(id);

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


// ✅ Update User
export const updateUserHandler: EndpointHandler<EndpointAuthType.NONE> = async (
  req,
  res
): Promise<void> => {

  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({ message: USER_NOT_FOUND });
      return;
    }

    user.set({
      name,
      email,
      role
    });

    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
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