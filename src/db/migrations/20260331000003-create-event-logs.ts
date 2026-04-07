// 20260331000003-create-event-logs.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  await queryInterface.createTable('EventLogs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'EventTable',
        key: 'eventId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GroupTable',
        key: 'groupId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    garbageWeight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0
    },
    garbageType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Create indexes for better query performance
  await queryInterface.addIndex('EventLogs', ['eventId']);
  await queryInterface.addIndex('EventLogs', ['userId']);
  await queryInterface.addIndex('EventLogs', ['groupId']);
  await queryInterface.addIndex('EventLogs', ['checkInTime']);
  
  // Dialect-specific timestamp defaults
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE EventLogs
      MODIFY createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      MODIFY updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventLogs"
      ALTER COLUMN "createdAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE EventLogs
      ADD CONSTRAINT DF_EventLogs_createdAt DEFAULT GETDATE() FOR createdAt;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE EventLogs
      ADD CONSTRAINT DF_EventLogs_updatedAt DEFAULT GETDATE() FOR updatedAt;
    `);
  } else {
    throw new Error('Unsupported SQL dialect');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();
  
  await queryInterface.dropTable('EventLogs');
  
  if (dialect === 'mssql') {
    try {
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_EventLogs_createdAt', 'D') IS NOT NULL
          ALTER TABLE EventLogs DROP CONSTRAINT DF_EventLogs_createdAt;
      `);
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_EventLogs_updatedAt', 'D') IS NOT NULL
          ALTER TABLE EventLogs DROP CONSTRAINT DF_EventLogs_updatedAt;
      `);
    } catch (error) {
      console.warn('Error dropping constraints:', error);
    }
  }
}