import {
  Table,
  Column,
  Model,
  DataType,
  HasMany
} from 'sequelize-typescript';
import { User } from './User';
import { EventLogs } from './EventLogs';

@Table({
  tableName: 'GroupTable',
  timestamps: true,
  underscored: false
})
export class GroupTable extends Model {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare groupId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  groupName!: string;

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

  // Associations
  @HasMany(() => User, { foreignKey: 'groupId', as: 'users' })
  users!: User[];

  @HasMany(() => EventLogs, { foreignKey: 'groupId', as: 'eventLogs' })
  eventLogs!: EventLogs[];
}