import { EventLogs, EventTable, User } from 'db';
import { Schema } from 'express-validator';

/**
 * Validator for creating event logs (check in)
 * 
 * FILE UPLOAD:
 * - Optional: wasteImage (multipart/form-data)
 * - Supported formats: .jpg, .jpeg, .png, .gif, .webp
 * - Max file size: 10MB
 * - Upload via form field: "wasteImage"
 */
export const createEventLogValidator: Schema = {
    eventId: {
        in: 'body',
        exists: {
            errorMessage: 'Event ID is required',
        },
        isInt: {
            errorMessage: 'Event ID must be an integer',
        },
        custom: {
            options: async (value) => {
                const event = await EventTable.findByPk(value);
                if (!event) {
                    throw new Error('Event does not exist');
                }
                return true;
            }
        }
    },
    groupId: {
        in: 'body',
        optional: true,
        isInt: {
            errorMessage: 'Group ID must be an integer',
        }
    },
    checkInTime: {
        in: 'body',
        optional: true,
        isISO8601: {
            errorMessage: 'Invalid check in time format',
        }
    },
    garbageWeight: {
        in: 'body',
        optional: true,
        isFloat: {
            options: { min: 0 },
            errorMessage: 'Garbage weight must be a positive number',
        }
    },
    garbageType: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Garbage type must be a string',
        },
        isLength: {
            options: { max: 50 },
            errorMessage: 'Garbage type must be less than 50 characters',
        }
    }
};

/**
 * Validator for updating event logs (check out)
 * 
 * FILE UPLOAD:
 * - Optional: wasteImage (multipart/form-data)
 * - Supported formats: .jpg, .jpeg, .png, .gif, .webp
 * - Max file size: 10MB
 * - Upload via form field: "wasteImage"
 * - If a new image is uploaded, previous image will be deleted
 */
export const updateEventLogValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event log id is required'
        },
        isInt: {
            errorMessage: 'Event log id must be an integer'
        }
    },
    checkOutTime: {
        in: 'body',
        optional: true,
        isISO8601: {
            errorMessage: 'Invalid check out time format',
        },
        custom: {
            options: async (value, { req }) => {
                if (value && req?.params) {
                    const eventLogId = req.params.id;
                    if (eventLogId) {
                        const eventLog = await EventLogs.findByPk(eventLogId);
                        if (eventLog && new Date(value) < new Date(eventLog.checkInTime)) {
                            throw new Error('Check out time cannot be before check in time');
                        }
                    }
                }
                return true;
            }
        }
    },
    garbageWeight: {
        in: 'body',
        optional: true,
        isFloat: {
            options: { min: 0 },
            errorMessage: 'Garbage weight must be a positive number',
        }
    },
    garbageType: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Garbage type must be a string',
        },
        isLength: {
            options: { max: 50 },
            errorMessage: 'Garbage type must be less than 50 characters',
        }
    },
    eventLocation: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Event location must be a string',
        },
        isLength: {
            options: { max: 255 },
            errorMessage: 'Event location must be less than 255 characters',
        }
    }
};

export const getEventLogValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event log id is required'
        },
        isInt: {
            errorMessage: 'Event log id must be an integer'
        }
    }
};

export const deleteEventLogValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event log id is required'
        },
        isInt: {
            errorMessage: 'Event log id must be an integer'
        }
    }
};

export const getEventLogsByUserValidator: Schema = {
    userId: {
        in: 'params',
        exists: {
            errorMessage: 'User ID is required'
        },
        isInt: {
            errorMessage: 'User ID must be an integer'
        },
        custom: {
            options: async (value) => {
                const user = await User.findByPk(value);
                if (!user) {
                    throw new Error('User does not exist');
                }
                return true;
            }
        }
    }
};

export const getEventLogsByEventValidator: Schema = {
    eventId: {
        in: 'params',
        exists: {
            errorMessage: 'Event ID is required'
        },
        isInt: {
            errorMessage: 'Event ID must be an integer'
        },
        custom: {
            options: async (value) => {
                const event = await EventTable.findByPk(value);
                if (!event) {
                    throw new Error('Event does not exist');
                }
                return true;
            }
        }
    }
};

export const getEventLogsByDateRangeValidator: Schema = {
    startDate: {
        in: 'body',
        exists: {
            errorMessage: 'Start date is required'
        },
        isISO8601: {
            errorMessage: 'Invalid start date format'
        }
    },
    endDate: {
        in: 'body',
        exists: {
            errorMessage: 'End date is required'
        },
        isISO8601: {
            errorMessage: 'Invalid end date format'
        },
        custom: {
            options: (value, { req }) => {
                if (req?.body?.startDate && new Date(value) < new Date(req.body.startDate)) {
                    throw new Error('End date cannot be before start date');
                }
                return true;
            }
        }
    }
};





export const bulkCheckInValidator: Schema = {
  eventId: {
    in: 'body',
    exists: { errorMessage: 'eventId is required' },
    isUUID: { errorMessage: 'eventId must be a valid UUID' },
    custom: {
      options: async (value) => {
        const event = await EventTable.findByPk(value);
        if (!event) throw new Error('Event not found');
        return true;
      }
    }
  },
  checkInTime: {
    in: 'body',
    exists: { errorMessage: 'checkInTime is required' },
    isISO8601: { errorMessage: 'checkInTime must be a valid ISO 8601 date' }
  },
  hoursEnrolled: {
    in: 'body',
    exists: { errorMessage: 'hoursEnrolled is required' },
    isFloat: { options: { min: 0 }, errorMessage: 'hoursEnrolled must be a non-negative number' }
  },
  users: {
    in: 'body',
    exists: { errorMessage: 'users array is required' },
    isArray: { options: { min: 1 }, errorMessage: 'users must be a non‑empty array' },
    custom: {
      options: async (value) => {
        if (!Array.isArray(value)) throw new Error('users must be an array');
        for (const userId of value) {
          const user = await User.findByPk(userId);
          if (!user) {
            // Throw a plain string; it will be used as the error message
            throw new Error(`User with ID "${userId}" does not exist in the database.`);
          }
        }
        return true;
      }
    }
  }
};