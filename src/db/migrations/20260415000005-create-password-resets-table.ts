import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Drop the table if it exists to start fresh
  try {
    await queryInterface.dropTable('password_resets');
    console.log('Dropped existing password_resets table');
  } catch (error) {
    console.log('No existing password_resets table to drop',error);
  }

  // Create table with correct UUID foreign key
  await queryInterface.createTable('password_resets', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,          // ✅ Matches Users.id (UUID)
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  // Add indexes for performance
  await queryInterface.addIndex('password_resets', ['token']);
  await queryInterface.addIndex('password_resets', ['user_id']);
  await queryInterface.addIndex('password_resets', ['expires_at']);

  console.log('✅ password_resets table created with UUID foreign key');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('password_resets');
}