import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  generateJwtToken,
  reportError
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User, Organization } from 'db';
import {
  AUTH_INVALID_CREDENTIALS,
  AUTH_LOGIN_ERROR,
  AUTH_USER_NOT_FOUND,
  AUTH_ORG_PENDING,
  AUTH_ORG_REJECTED
} from './auth.const';

export const loginHandler: EndpointHandler<EndpointAuthType> = async (
  req: EndpointRequestType[EndpointAuthType],
  res: Response
) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      // Check if it's an organization
      const organization = await Organization.findOne({ where: { email } });
      
      if (organization) {
        // Enforce approval logic
        if (organization.status === 'pending') {
          res.status(403).json({ message: AUTH_ORG_PENDING });
          return;
        }
        if (organization.status === 'rejected') {
          res.status(403).json({ message: AUTH_ORG_REJECTED });
          return;
        }

        const isMatch = await bcrypt.compare(password, organization.password);
        if (!isMatch) {
          res.status(401).json({ message: AUTH_INVALID_CREDENTIALS });
          return;
        }

        const userPayload = {
          id: organization.orgId,
          name: organization.name,
          email: organization.email,
          role: 'organization'
        };

        const tokenExpiry = Math.floor(Date.now() / 1000) + 60 * 60;
        const accessToken = generateJwtToken(userPayload);

        res.status(200).json({
          accessToken,
          tokenExpiry,
          user: {
            id: organization.orgId,
            name: organization.name,
            email: organization.email,
            role: 'organization'
          }
        });
        return;
      }

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
        id: user.id,
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