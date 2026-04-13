import { Schema } from 'express-validator';

export const resetPasswordValidator: Schema = {
  password: {
    in: 'body',
    exists: {
      errorMessage: 'Password is required'
    },
    isLength: {
      options: { min: 6 },
      errorMessage: 'Password must be at least 6 characters long'
    }
  }
};
