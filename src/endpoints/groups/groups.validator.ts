import { GroupTable } from 'db';
import { Schema } from 'express-validator';
import { Op } from 'sequelize';

export const createGroupValidator: Schema = {
    groupName: {
        in: 'body',
        exists: {
            errorMessage: 'Group name is required',
        },
        isString: {
            errorMessage: 'Group name must be a string',
        },
        isLength: {
            options: { min: 2, max: 100 },
            errorMessage: 'Group name must be between 2 and 100 characters',
        },
        trim: true,
        custom: {
            options: async (value) => {
                const group = await GroupTable.findOne({ 
                    where: { groupName: value }, 
                    raw: true 
                });
                if (group) {
                    throw new Error('Group name already exists');
                }
                return true;
            }
        }
    }
};

export const updateGroupValidator: Schema = {
    groupId: {
        in: 'params',
        exists: {
            errorMessage: 'Group id is required'
        },
        isInt: {
            errorMessage: 'Group id must be an integer'
        }
    },
    groupName: {
        in: 'body',
        optional: true,
        isString: {
            errorMessage: 'Group name must be a string',
        },
        isLength: {
            options: { min: 2, max: 100 },
            errorMessage: 'Group name must be between 2 and 100 characters',
        },
        trim: true,
        custom: {
            options: async (value, { req }) => {
                if (value && req && req.params) {
                    const groupId = req.params.groupId;
                    if (groupId) {
                        const group = await GroupTable.findOne({ 
                            where: { 
                                groupName: value,
                                groupId: { [Op.ne]: parseInt(groupId) }
                            }, 
                            raw: true 
                        });
                        if (group) {
                            throw new Error('Group name already exists');
                        }
                    } else {
                        // If no groupId in params, just check if name exists
                        const group = await GroupTable.findOne({ 
                            where: { groupName: value }, 
                            raw: true 
                        });
                        if (group) {
                            throw new Error('Group name already exists');
                        }
                    }
                } else if (value) {
                    // Fallback: check if name exists without groupId
                    const group = await GroupTable.findOne({ 
                        where: { groupName: value }, 
                        raw: true 
                    });
                    if (group) {
                        throw new Error('Group name already exists');
                    }
                }
                return true;
            }
        }
    }
};

export const getGroupValidator: Schema = {
    groupId: {
        in: 'params',
        exists: {
            errorMessage: 'Group id is required'
        },
        isInt: {
            errorMessage: 'Group id must be an integer'
        }
    }
};

export const deleteGroupValidator: Schema = {
    groupId: {
        in: 'params',
        exists: {
            errorMessage: 'Group id is required'
        },
        isInt: {
            errorMessage: 'Group id must be an integer'
        }
    }
};