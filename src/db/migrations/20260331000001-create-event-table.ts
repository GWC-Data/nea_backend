// 20260331000001-create-event-table.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  await queryInterface.createTable('EventTable', {
    eventId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
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

  // ✅ Only add indexes for columns that exist in EventTable
  // EventTable has: eventId, date, location, name, createdAt, updatedAt
  await queryInterface.addIndex('EventTable', ['date']);
  await queryInterface.addIndex('EventTable', ['location']);
  await queryInterface.addIndex('EventTable', ['name']);

  // Dialect-specific timestamp defaults
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE EventTable
      MODIFY createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      MODIFY updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      ALTER TABLE "EventTable"
      ALTER COLUMN "createdAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE EventTable
      ADD CONSTRAINT DF_EventTable_createdAt DEFAULT GETDATE() FOR createdAt;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE EventTable
      ADD CONSTRAINT DF_EventTable_updatedAt DEFAULT GETDATE() FOR updatedAt;
    `);
  } else {
    throw new Error('Unsupported SQL dialect');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();
  
  await queryInterface.dropTable('EventTable');
  
  if (dialect === 'mssql') {
    try {
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_EventTable_createdAt', 'D') IS NOT NULL
          ALTER TABLE EventTable DROP CONSTRAINT DF_EventTable_createdAt;
      `);
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_EventTable_updatedAt', 'D') IS NOT NULL
          ALTER TABLE EventTable DROP CONSTRAINT DF_EventTable_updatedAt;
      `);
    } catch (error) {
      console.warn('Error dropping constraints:', error);
    }
  }
}