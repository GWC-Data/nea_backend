import { EventTable } from 'db';
import { Schema } from 'express-validator';
import { Op } from 'sequelize';

export const createEventValidator: Schema = {
    date: {
        in: 'body',
        exists: {
            errorMessage: 'Date is required',
        },
        isDate: {
            errorMessage: 'Date must be a valid date',
        },
        custom: {
            options: async (value) => {
                const eventDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (eventDate < today) {
                    throw new Error('Event date cannot be in the past');
                }
                return true;
            }
        }
    },
    location: {
        in: 'body',
        exists: {
            errorMessage: 'Location is required',
        },
        isString: {
            errorMessage: 'Location must be a string',
        },
        isLength: {
            options: { min: 3, max: 255 },
            errorMessage: 'Location must be between 3 and 255 characters',
        }
    },
    name: {
        in: 'body',
        exists: {
            errorMessage: 'Event name is required',
        },
        isString: {
            errorMessage: 'Event name must be a string',
        },
        isLength: {
            options: { min: 3, max: 100 },
            errorMessage: 'Event name must be between 3 and 100 characters',
        },
        custom: {
            options: async (value) => {
                const event = await EventTable.findOne({ 
                    where: { name: value }, 
                    raw: true 
                });
                if (event) {
                    throw new Error('Event with this name already exists');
                }
                return true;
            }
        }
    }
};

export const updateEventValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event id is required'
        },
        isInt: {
            errorMessage: 'Event id must be an integer'
        }
    },
    date: {
        in: 'body',
        optional: true,
        isDate: {
            errorMessage: 'Date must be a valid date',
        },
        custom: {
            options: async (value) => {
                if (value) {
                    const eventDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (eventDate < today) {
                        throw new Error('Event date cannot be in the past');
                    }
                }
                return true;
            }
        }
    },
    location: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Location must be a string',
        },
        isLength: {
            options: { min: 3, max: 255 },
            errorMessage: 'Location must be between 3 and 255 characters',
        }
    },
    name: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Event name must be a string',
        },
        isLength: {
            options: { min: 3, max: 100 },
            errorMessage: 'Event name must be between 3 and 100 characters',
        },
        custom: {
            options: async (value, { req }) => {
                if (value && req && req.params) {
                    const eventId = req.params.id;
                    if (eventId) {
                        const event = await EventTable.findOne({ 
                            where: { 
                                name: value,
                                eventId: { [Op.ne]: parseInt(eventId) }
                            }, 
                            raw: true 
                        });
                        if (event) {
                            throw new Error('Event with this name already exists');
                        }
                    } else {
                        // If no eventId in params, just check if name exists
                        const event = await EventTable.findOne({ 
                            where: { name: value }, 
                            raw: true 
                        });
                        if (event) {
                            throw new Error('Event with this name already exists');
                        }
                    }
                }
                return true;
            }
        }
    }
};

export const getEventValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event id is required'
        },
        isInt: {
            errorMessage: 'Event id must be an integer'
        }
    }
};

export const deleteEventValidator: Schema = {
    id: {
        in: 'params',
        exists: {
            errorMessage: 'Event id is required'
        },
        isInt: {
            errorMessage: 'Event id must be an integer'
        }
    }
};