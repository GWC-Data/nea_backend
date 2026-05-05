import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { EventLogs } from './EventLogs';

@Table({ tableName: 'eventTable', timestamps: true })
export class EventTable extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true
  })
  declare eventId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  location!: string;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'public' })
  eventType!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  createdBy!: string; // organization ID (UUID as string)

  @Column({ type: DataType.DATE, allowNull: false })
  startDate!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  endDate!: Date | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  details!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  description!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  rewards!: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  joinsCount!: number;

  @Column({ type: DataType.JSON, defaultValue: [] })
  participants!: string[];   // array of user UUIDs

  @Column({ type: DataType.STRING, allowNull: true })
  eventImage!: string | null;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved'
  })
  status!: 'pending' | 'approved' | 'rejected';

  @HasMany(() => EventLogs, { foreignKey: 'eventId' })
  eventLogs!: EventLogs[];
}
