import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('Users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
      defaultValue: 'user'
    },

    age: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    gender: {
      type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
      allowNull: true
    },

    // ✅ Directly using orgId instead of groupId
    orgId: {
      type: DataTypes.JSON, // better than ARRAY for cross DB support
      allowNull: true,
      defaultValue: []
    },

    joinedEvents: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('Users', ['email']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('Users');

  // Optional cleanup for ENUM (important in Postgres)
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_gender";');
}