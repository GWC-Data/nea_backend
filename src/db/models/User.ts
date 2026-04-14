// src/db/models/User.ts

import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany
} from 'sequelize-typescript';
import { GroupTable } from './GroupTable';
import { EventLogs } from './EventLogs';
import { PasswordReset } from './PasswordReset';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'Users',
  timestamps: true,
  underscored: false
})
export class User extends Model {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare id: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    defaultValue: () => uuidv4(),
    comment: 'User UUID for cross-system references'
  })
  userUuid!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'user'
  })
  role!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  age!: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  gender!: string | null;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of Event UUIDs that this user has joined'
  })
  joinedEvents!: string[];

  @ForeignKey(() => GroupTable)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  groupId!: number | null;

  @BelongsTo(() => GroupTable, {
    foreignKey: 'groupId',
    as: 'group'
  })
  group!: GroupTable | null;

  @HasMany(() => EventLogs, { foreignKey: 'userId', as: 'eventLogs' })
  eventLogs!: EventLogs[];

  @HasMany(() => PasswordReset, { foreignKey: 'userId', as: 'passwordResets' })
  passwordResets!: PasswordReset[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  declare updatedAt: Date;
}