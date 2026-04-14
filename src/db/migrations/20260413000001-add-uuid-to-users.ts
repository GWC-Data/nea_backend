// 20260413000001-add-uuid-to-users.ts - Add UUID column to Users table

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  // Check if column already exists (idempotent)
  const columns = await queryInterface.describeTable('Users');
  if (columns.userUuid) {
    console.log('⚠️  userUuid column already exists in Users table, skipping...');
    return;
  }

  // Add userUuid column to Users table
  await queryInterface.addColumn('Users', 'userUuid', {
    type: DataTypes.UUID,
    allowNull: true,
    unique: true,
    comment: 'User UUID for cross-system references'
  });

  // Generate UUIDs for existing users
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      UPDATE Users SET userUuid = UUID() WHERE userUuid IS NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      UPDATE "Users" SET "userUuid" = gen_random_uuid() WHERE "userUuid" IS NULL;
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      UPDATE Users SET userUuid = NEWID() WHERE userUuid IS NULL;
    `);
  } else if (dialect === 'sqlite') {
    // For SQLite testing, use a simple UUID-like string
    await queryInterface.sequelize.query(`
      UPDATE Users SET userUuid = lower(hex(randomblob(16))) WHERE userUuid IS NULL;
    `);
  }

  // Make userUuid NOT NULL after population
  await queryInterface.changeColumn('Users', 'userUuid', {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    comment: 'User UUID for cross-system references'
  });

  // Add index on userUuid for performance (check if it exists first)
  try {
    await queryInterface.addIndex('Users', ['userUuid']);
  } catch (err: any) {
    if (!err.message?.includes('Duplicate column')) {
      throw err;
    }
  }

  console.log('✅ Added userUuid column to Users table');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Check if column exists before removing
  const columns = await queryInterface.describeTable('Users');
  if (!columns.userUuid) {
    console.log('⚠️  userUuid column does not exist in Users table, skipping removal...');
    return;
  }

  // Remove the index (safely)
  try {
    await queryInterface.removeIndex('Users', ['userUuid']);
  } catch (err: any) {
    if (!err.message?.includes('DOES NOT EXIST')) {
      console.warn('⚠️  Could not remove index:', err.message);
    }
  }
  
  // Drop the column
  await queryInterface.removeColumn('Users', 'userUuid');
  
  console.log('✅ Removed userUuid column from Users table');
}
