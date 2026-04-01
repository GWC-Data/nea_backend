// XXXXXXXXXXXXXX02-create-group-table.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  await queryInterface.createTable('GroupTable', {
    groupId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    groupName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
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

  // Dialect-specific timestamp defaults
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE GroupTable
      MODIFY createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      MODIFY updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      ALTER TABLE "GroupTable"
      ALTER COLUMN "createdAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE GroupTable
      ADD CONSTRAINT DF_GroupTable_createdAt DEFAULT GETDATE() FOR createdAt;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE GroupTable
      ADD CONSTRAINT DF_GroupTable_updatedAt DEFAULT GETDATE() FOR updatedAt;
    `);
  } else {
    throw new Error('Unsupported SQL dialect');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();
  
  await queryInterface.dropTable('GroupTable');
  
  if (dialect === 'mssql') {
    try {
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_GroupTable_createdAt', 'D') IS NOT NULL
          ALTER TABLE GroupTable DROP CONSTRAINT DF_GroupTable_createdAt;
      `);
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_GroupTable_updatedAt', 'D') IS NOT NULL
          ALTER TABLE GroupTable DROP CONSTRAINT DF_GroupTable_updatedAt;
      `);
    } catch (error) {
      console.warn('Error dropping constraints:', error);
    }
  }
}