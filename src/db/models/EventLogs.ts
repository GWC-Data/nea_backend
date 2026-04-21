import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { EventTable } from './EventTable';
import { GroupTable } from './GroupTable';

@Table({ tableName: 'EventLogs', timestamps: true })
export class EventLogs extends Model {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  declare id: number;

  @ForeignKey(() => EventTable)
  @Column({ type: DataType.UUID, allowNull: false })
  eventId!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @ForeignKey(() => GroupTable)
  @Column({ type: DataType.INTEGER, allowNull: true })
  groupId!: number;

  @Column({ type: DataType.DATE, allowNull: false })
  checkInTime!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  checkOutTime!: Date | null;

  @Column({ type: DataType.FLOAT, defaultValue: 0 })
  totalHours!: number;

  @Column({ type: DataType.FLOAT, defaultValue: 0 })
  garbageWeight!: number;

  @Column({ type: DataType.STRING, allowNull: true })
  hoursEnrolled!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  garbageType!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  eventLocation!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  wasteImage!: string;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => EventTable)
  event!: EventTable;

  @BelongsTo(() => GroupTable)
  group!: GroupTable;
}