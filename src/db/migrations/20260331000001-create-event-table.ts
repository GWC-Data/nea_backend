import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('eventTable', {
    eventId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    location: {
      type: DataTypes.STRING,
      allowNull: false
    },

    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'public'
    },

    createdBy: {
      type: DataTypes.STRING,
      allowNull: false
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },

    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    rewards: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    joinsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    participants: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    event_image: {
      type: DataTypes.STRING,
      allowNull: true
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('eventTable', ['startDate']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('eventTable');
}