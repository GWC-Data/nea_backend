import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  generateJwtToken,
  reportError
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from 'db';
import {
  AUTH_INVALID_CREDENTIALS,
  AUTH_LOGIN_ERROR,
  AUTH_USER_NOT_FOUND
} from './auth.const';

export const loginHandler: EndpointHandler<EndpointAuthType> = async (
  req: EndpointRequestType[EndpointAuthType],
  res: Response
) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ message: AUTH_USER_NOT_FOUND });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: AUTH_INVALID_CREDENTIALS });
      return;
    }

    // User payload for JWT (id is the UUID)
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const tokenExpiry = Math.floor(Date.now() / 1000) + 60 * 60;
    const accessToken = generateJwtToken(userPayload);

    res.status(200).json({
      accessToken,
      tokenExpiry,
      user: {
        id: user.id,        // UUID primary key
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    reportError(error);
    res.status(500).json({ message: AUTH_LOGIN_ERROR, error });
  }
};