import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('EventLogs', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'EventTable', key: 'eventId' },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE'
    },
    groupId: {
      type: DataTypes.INTEGER,
      references: { model: 'GroupTable', key: 'groupId' },
      onDelete: 'SET NULL'
    },
    checkInTime: { type: DataTypes.DATE, allowNull: false },
    checkOutTime: { type: DataTypes.DATE, allowNull: true },
    totalHours: { type: DataTypes.FLOAT, defaultValue: 0 },
    hoursEnrolled: { type: DataTypes.STRING, allowNull: true },
    garbageWeight: { type: DataTypes.FLOAT, defaultValue: 0 },
    garbageType: { type: DataTypes.TEXT, allowNull: true },
    wasteImage: { type: DataTypes.STRING, allowNull: true },
    eventLocation: { type: DataTypes.STRING, allowNull: true },   // ✅ NEW COLUMN
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });
  await queryInterface.addIndex('EventLogs', ['eventId']);
  await queryInterface.addIndex('EventLogs', ['userId']);
  await queryInterface.addIndex('EventLogs', ['eventLocation']);   // optional index
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('EventLogs');
}