// 20260409000001-add-waste-image-to-event-logs.ts

import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {

  // Check if column already exists
  const table = await queryInterface.describeTable('EventLogs');
  if (!table.wasteImage) {
    await queryInterface.addColumn('EventLogs', 'wasteImage', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Path or URL to the uploaded waste image'
    });
    
    // Add index for wasteImage
    try {
      await queryInterface.addIndex('EventLogs', ['wasteImage']);
    } catch {
      // Index might already exist, ignore
    }
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeIndex('EventLogs', ['wasteImage']);
  } catch {
    // Index might not exist, ignore
  }
  
  const table = await queryInterface.describeTable('EventLogs');
  if (table.wasteImage) {
    await queryInterface.removeColumn('EventLogs', 'wasteImage');
  }
}
