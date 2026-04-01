import { EventLogs, EventTable, User } from 'db';
import { Schema } from 'express-validator';

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
    userId: {
        in: 'body',
        exists: {
            errorMessage: 'User ID is required',
        },
        isInt: {
            errorMessage: 'User ID must be an integer',
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