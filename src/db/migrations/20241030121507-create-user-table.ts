// 20260331000000-create-users-table.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  // Create Users table with all fields (groupId, age, gender optional)
  await queryInterface.createTable('Users', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user', 'moderator'),
      allowNull: false,
      defaultValue: 'user'
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true  // Optional field
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
      allowNull: true,  // Optional field
      defaultValue: null
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Optional field
      references: {
        model: 'GroupTable',
        key: 'groupId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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

  // Add indexes for better query performance
  await queryInterface.addIndex('Users', ['email']);
  await queryInterface.addIndex('Users', ['role']);
  await queryInterface.addIndex('Users', ['gender']);
  await queryInterface.addIndex('Users', ['groupId']);

  // Dialect-specific timestamp defaults
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE Users
      MODIFY createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      MODIFY updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
      ALTER COLUMN "createdAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      ALTER TABLE Users
      ADD CONSTRAINT DF_Users_createdAt DEFAULT GETDATE() FOR createdAt;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE Users
      ADD CONSTRAINT DF_Users_updatedAt DEFAULT GETDATE() FOR updatedAt;
    `);
  } else {
    throw new Error('Unsupported SQL dialect');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();
  
  // Drop the table
  await queryInterface.dropTable('Users');
  
  // Clean up MSSQL default constraints if needed
  if (dialect === 'mssql') {
    try {
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_Users_createdAt', 'D') IS NOT NULL
          ALTER TABLE Users DROP CONSTRAINT DF_Users_createdAt;
      `);
      await queryInterface.sequelize.query(`
        IF OBJECT_ID('DF_Users_updatedAt', 'D') IS NOT NULL
          ALTER TABLE Users DROP CONSTRAINT DF_Users_updatedAt;
      `);
    } catch (error) {
      console.warn('Error dropping constraints:', error);
    }
  }
}