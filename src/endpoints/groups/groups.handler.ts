import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  reportError
} from 'node-server-engine';
import { Response } from 'express';
import { GroupTable, User } from 'db/models';
import {
  GROUP_NOT_FOUND,
  GROUP_CREATION_ERROR,
  GROUP_UPDATE_ERROR,
  GROUP_DELETION_ERROR,
  GROUP_GET_ERROR,
  GROUP_NAME_EXISTS,
  GROUP_HAS_USERS
} from './groups.const';

// ✅ Create Group
export const createGroupHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
): Promise<void> => {
  const { groupName } = req.body;

  try {
    // Check if group name already exists
    const existingGroup = await GroupTable.findOne({ where: { groupName } });
    if (existingGroup) {
      res.status(400).json({ message: GROUP_NAME_EXISTS });
      return;
    }

    const newGroup = await GroupTable.create({ groupName });

    res.status(200).json({ message: 'Group created successfully', group: newGroup });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_CREATION_ERROR, error });
  }
};

// ✅ Get All Groups (without associations temporarily)
export const getAllGroupsHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req,
  res
): Promise<void> => {
  try {
    // First, check if groupId column exists in Users table
    const dialect = process.env.SQL_TYPE?.toLowerCase() || 'mysql';
    let hasGroupIdColumn = false;
    
    try {
      if (dialect === 'mysql') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'groupId'
        `);
        hasGroupIdColumn = results.length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Users' AND column_name = 'groupId'
        `);
        hasGroupIdColumn = results.length > 0;
      }
    } catch (error) {
      console.warn('Error checking column existence:', error);
    }
    
    let groups;
    if (hasGroupIdColumn) {
      // Include users if column exists
      groups = await GroupTable.findAll({
        include: [
          { 
            association: 'users', 
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ]
      });
    } else {
      // Just get groups without users
      groups = await GroupTable.findAll();
    }

    res.status(200).json({ groups });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_GET_ERROR, error });
  }
};

// ✅ Get Group By ID (without associations temporarily)
export const getGroupByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { groupId } = req.params;

  try {
    // Check if groupId column exists
    const dialect = process.env.SQL_TYPE?.toLowerCase() || 'mysql';
    let hasGroupIdColumn = false;
    
    try {
      if (dialect === 'mysql') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'groupId'
        `);
        hasGroupIdColumn = results.length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Users' AND column_name = 'groupId'
        `);
        hasGroupIdColumn = results.length > 0;
      }
    } catch (error) {
      console.warn('Error checking column existence:', error);
    }
    
    let group;
    if (hasGroupIdColumn) {
      group = await GroupTable.findByPk(groupId, {
        include: [
          { 
            association: 'users', 
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            required: false
          }
        ]
      });
    } else {
      group = await GroupTable.findByPk(groupId);
    }

    if (!group) {
      res.status(404).json({ message: GROUP_NOT_FOUND });
      return;
    }

    res.status(200).json({ group });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_GET_ERROR });
  }
};

// ✅ Get Users by Group
export const getGroupUsersHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { groupId } = req.params;

  try {
    const group = await GroupTable.findByPk(groupId);

    if (!group) {
      res.status(404).json({ message: GROUP_NOT_FOUND });
      return;
    }

    // Check if groupId column exists in Users table
    const dialect = process.env.SQL_TYPE?.toLowerCase() || 'mysql';
    let hasGroupIdColumn = false;
    
    try {
      if (dialect === 'mysql') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'groupId'
        `);
        hasGroupIdColumn = (results as Array<{ COLUMN_NAME: string }>).length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Users' AND column_name = 'groupId'
        `);
        hasGroupIdColumn = (results as Array<{ column_name: string }>).length > 0;
      }
    } catch (error) {
      console.warn('Error checking column existence:', error);
    }
    
    const users = hasGroupIdColumn 
      ? await User.findAll({
          where: { groupId },
          attributes: { exclude: ['password'] }
        })
      : []; // TypeScript will infer users as User[]

    res.status(200).json({ users });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_GET_ERROR, error });
  }
};

// ✅ Update Group
export const updateGroupHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { groupId } = req.params;
  const { groupName } = req.body;

  try {
    const group = await GroupTable.findByPk(groupId);

    if (!group) {
      res.status(404).json({ message: GROUP_NOT_FOUND });
      return;
    }

    // Check if new group name already exists
    if (groupName && groupName !== group.groupName) {
      const existingGroup = await GroupTable.findOne({ where: { groupName } });
      if (existingGroup) {
        res.status(400).json({ message: GROUP_NAME_EXISTS });
        return;
      }
    }

    const updateData: any = {};
    if (groupName !== undefined) updateData.groupName = groupName;

    await group.update(updateData);

    res.status(200).json({ message: 'Group updated successfully', group });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_UPDATE_ERROR, error });
  }
};

// ✅ Delete Group 
export const deleteGroupHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req,
  res
): Promise<void> => {
  const { groupId } = req.params;

  try {
    // Get the group
    const group = await GroupTable.findByPk(groupId);
    
    if (!group) {
      res.status(404).json({ message: GROUP_NOT_FOUND });
      return;
    }

    // Check if group has users using raw SQL
    const dialect = process.env.SQL_TYPE?.toLowerCase() || 'mysql';
    let hasUsers = false;
    
    try {
      if (dialect === 'mysql') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT COUNT(*) as count 
          FROM Users 
          WHERE groupId = :groupId
        `, {
          replacements: { groupId },
          type: 'SELECT'
        });
        hasUsers = (results as any).count > 0;
      } else if (dialect === 'postgres') {
        const [results] = await GroupTable.sequelize!.query(`
          SELECT COUNT(*) as count 
          FROM "Users" 
          WHERE "groupId" = :groupId
        `, {
          replacements: { groupId },
          type: 'SELECT'
        });
        hasUsers = (results as any).count > 0;
      }
    } catch (error) {
      // If column doesn't exist, assume no users
      console.warn('Error checking users in group:', error);
      hasUsers = false;
    }
    
    if (hasUsers) {
      res.status(400).json({ message: GROUP_HAS_USERS });
      return;
    }

    // Delete the group
    await group.destroy();

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: GROUP_DELETION_ERROR, error });
  }
};
