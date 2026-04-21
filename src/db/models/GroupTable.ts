import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { EventLogs } from './EventLogs';

@Table({ tableName: 'GroupTable', timestamps: true })
export class GroupTable extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare groupId: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  groupName!: string;

  @HasMany(() => User, { foreignKey: 'groupId' })
  users!: User[];

  @HasMany(() => EventLogs, { foreignKey: 'groupId' })
  eventLogs!: EventLogs[];
}