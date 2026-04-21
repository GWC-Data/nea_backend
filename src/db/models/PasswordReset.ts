import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'password_resets',
  timestamps: false,
  underscored: true
})
export class PasswordReset extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId!: string;   // ✅ string, not number

  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user!: User;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  token!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expiresAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  declare createdAt: Date;
}