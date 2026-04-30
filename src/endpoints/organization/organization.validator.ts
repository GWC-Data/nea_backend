import { Organization } from 'db/models';
import { Schema } from 'express-validator';

export const createOrganizationValidator: Schema = {
  orgName: {
    in: 'body',
    exists: {
      errorMessage: 'Organization name is required',
    },
    isString: {
      errorMessage: 'Organization name must be a string',
    },
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: 'Organization name must be between 2 and 100 characters',
    },
    trim: true,
    custom: {
      options: async (value) => {
        const org = await Organization.findOne(
          { where: { orgName: value }, raw: true }
        );
        if (org) {
          throw new Error('Organization name already exists');
        }
        return true;
      },
    },
  },
  name: {
    in: 'body',
    exists: {
      errorMessage: 'Contact person name is required',
    },
    isString: {
      errorMessage: 'Name must be a string',
    },
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: 'Name must be between 2 and 100 characters',
    },
    trim: true,
  },
  email: {
    in: 'body',
    exists: {
      errorMessage: 'Email is required',
    },
    isEmail: {
      errorMessage: 'Invalid email format',
    },
    custom: {
      options: async (value) => {
        const org = await Organization.findOne(
          { where: { email: value }, raw: true }
        );
        if (org) {
          throw new Error('Email already registered');
        }
        return true;
      },
    },
  },
  password: {
    in: 'body',
    exists: {
      errorMessage: 'Password is required',
    },
    isString: {
      errorMessage: 'Password must be a string',
    },
    isLength: {
      options: { min: 6 },
      errorMessage: 'Password must be at least 6 characters',
    },
  },
  address: {
    in: 'body',
    optional: { options: { nullable: true } },
    isString: {
      errorMessage: 'Address must be a string',
    },
    isLength: {
      options: { min: 5, max: 255 },
      errorMessage: 'Address must be between 5 and 255 characters',
    },
    trim: true,
  },
  phone: {
    in: 'body',
    exists: {
      errorMessage: 'Phone number is required',
    },
    isNumeric: {
      errorMessage: 'Phone number must be numeric',
    },
    isLength: {
      options: { min: 10, max: 15 },
      errorMessage: 'Phone number must be between 10 and 15 digits',
    },
  },
};

export const updateOrganizationValidator: Schema = {
  orgId: {
    in: 'params',
    exists: {
      errorMessage: 'Organization id is required',
    },
    isUUID: {
      errorMessage: 'Organization id must be a valid UUID',
    },
  },
  orgName: {
    in: 'body',
    optional: true,
    isString: {
      errorMessage: 'Organization name must be a string',
    },
    isLength: {
      options: { min: 2, max: 100 },
      errorMessage: 'Organization name must be between 2 and 100 characters',
    },
    trim: true,
  },
  address: {
    in: 'body',
    optional: true,
    isString: {
      errorMessage: 'Address must be a string',
    },
    trim: true,
  },
  phone: {
    in: 'body',
    optional: true,
    isNumeric: {
      errorMessage: 'Phone number must be numeric',
    },
  },
};

export const getOrganizationValidator: Schema = {
  orgId: {
    in: 'params',
    exists: {
      errorMessage: 'Organization id is required',
    },
    isUUID: {
      errorMessage: 'Organization id must be a valid UUID',
    },
  },
};

export const deleteOrganizationValidator: Schema = {
  orgId: {
    in: 'params',
    exists: {
      errorMessage: 'Organization id is required',
    },
    isUUID: {
      errorMessage: 'Organization id must be a valid UUID',
    },
  },
};
