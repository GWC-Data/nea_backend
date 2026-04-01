// 20260331000012-add-groupid-to-users-and-eventlogs.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  // Add groupId to Users table
  try {
    // Check if column exists
    let columnExists = false;
    try {
      if (dialect === 'mysql') {
        const [results] = await queryInterface.sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'groupId'
        `);
        columnExists = (results as any[]).length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'Users' AND column_name = 'groupId'
        `);
        columnExists = (results as any[]).length > 0;
      }
    } catch (error) {
      console.log('Error checking Users.groupId:', error);
    }

    if (!columnExists) {
      await queryInterface.addColumn('Users', 'groupId', {
        type: DataTypes.INTEGER,
        allowNull: true
      });

      await queryInterface.addConstraint('Users', {
        fields: ['groupId'],
        type: 'foreign key',
        name: 'fk_users_groupId',
        references: {
          table: 'GroupTable',
          field: 'groupId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      await queryInterface.addIndex('Users', ['groupId']);
      console.log('Added groupId to Users table');
    }
  } catch (error) {
    console.error('Error adding groupId to Users:', error);
    throw error;
  }

  // Add groupId to EventLogs table
  try {
    // Check if column exists
    let columnExists = false;
    try {
      if (dialect === 'mysql') {
        const [results] = await queryInterface.sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'EventLogs' AND COLUMN_NAME = 'groupId'
        `);
        columnExists = (results as any[]).length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'EventLogs' AND column_name = 'groupId'
        `);
        columnExists = (results as any[]).length > 0;
      }
    } catch (error) {
      console.log('Error checking EventLogs.groupId:', error);
    }

    if (!columnExists) {
      await queryInterface.addColumn('EventLogs', 'groupId', {
        type: DataTypes.INTEGER,
        allowNull: true
      });

      await queryInterface.addConstraint('EventLogs', {
        fields: ['groupId'],
        type: 'foreign key',
        name: 'fk_eventlogs_groupId',
        references: {
          table: 'GroupTable',
          field: 'groupId'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      await queryInterface.addIndex('EventLogs', ['groupId']);
      console.log('Added groupId to EventLogs table');
    }
  } catch (error) {
    console.error('Error adding groupId to EventLogs:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove from EventLogs
  try {
    await queryInterface.removeConstraint('EventLogs', 'fk_eventlogs_groupId');
    await queryInterface.removeColumn('EventLogs', 'groupId');
  } catch (error) {
    console.warn('Error removing groupId from EventLogs:', error);
  }

  // Remove from Users
  try {
    await queryInterface.removeConstraint('Users', 'fk_users_groupId');
    await queryInterface.removeColumn('Users', 'groupId');
  } catch (error) {
    console.warn('Error removing groupId from Users:', error);
  }
}