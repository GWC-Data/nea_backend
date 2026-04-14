// 20260413000002-add-uuid-to-events.ts - Add UUID column to EventTable

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();

  // Check if column already exists (idempotent)
  const columns = await queryInterface.describeTable('EventTable');
  if (columns.eventUuid) {
    console.log('⚠️  eventUuid column already exists in EventTable, skipping...');
    return;
  }

  // Add eventUuid column to EventTable
  await queryInterface.addColumn('EventTable', 'eventUuid', {
    type: DataTypes.UUID,
    allowNull: true,
    unique: true,
    comment: 'Event UUID for cross-system references'
  });

  // Generate UUIDs for existing events
  if (dialect === 'mysql') {
    await queryInterface.sequelize.query(`
      UPDATE EventTable SET eventUuid = UUID() WHERE eventUuid IS NULL;
    `);
  } else if (dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      UPDATE "EventTable" SET "eventUuid" = gen_random_uuid() WHERE "eventUuid" IS NULL;
    `);
  } else if (dialect === 'mssql') {
    await queryInterface.sequelize.query(`
      UPDATE EventTable SET eventUuid = NEWID() WHERE eventUuid IS NULL;
    `);
  } else if (dialect === 'sqlite') {
    // For SQLite testing, use a simple UUID-like string
    await queryInterface.sequelize.query(`
      UPDATE EventTable SET eventUuid = lower(hex(randomblob(16))) WHERE eventUuid IS NULL;
    `);
  }

  // Make eventUuid NOT NULL after population
  await queryInterface.changeColumn('EventTable', 'eventUuid', {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    comment: 'Event UUID for cross-system references'
  });

  // Add index on eventUuid for performance (check if it exists first)
  try {
    await queryInterface.addIndex('EventTable', ['eventUuid']);
  } catch (err: any) {
    if (!err.message?.includes('Duplicate column')) {
      throw err;
    }
  }

  console.log('✅ Added eventUuid column to EventTable');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Check if column exists before removing
  const columns = await queryInterface.describeTable('EventTable');
  if (!columns.eventUuid) {
    console.log('⚠️  eventUuid column does not exist in EventTable, skipping removal...');
    return;
  }

  // Remove the index (safely)
  try {
    await queryInterface.removeIndex('EventTable', ['eventUuid']);
  } catch (err: any) {
    if (!err.message?.includes('DOES NOT EXIST')) {
      console.warn('⚠️  Could not remove index:', err.message);
    }
  }
  
  // Drop the column
  await queryInterface.removeColumn('EventTable', 'eventUuid');
  
  console.log('✅ Removed eventUuid column from EventTable');
}
