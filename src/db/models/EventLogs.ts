import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { User } from './User';
import { EventTable } from './EventTable';
import { GroupTable } from './GroupTable';

@Table({
  tableName: 'EventLogs',
  timestamps: true,
  underscored: false
})
export class EventLogs extends Model {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare id: number;

  @ForeignKey(() => EventTable)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  eventId!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @ForeignKey(() => GroupTable)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  groupId!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  checkInTime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  checkOutTime!: Date;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  totalHours!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  garbageWeight!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  garbageType!: string;

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
  @BelongsTo(() => EventTable, { foreignKey: 'eventId', as: 'event' })
  event!: EventTable;

  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user!: User;

  @BelongsTo(() => GroupTable, { foreignKey: 'groupId', as: 'group' })
  group!: GroupTable;

  // Virtual fields
  get durationInHours(): number {
    if (this.checkInTime && this.checkOutTime) {
      const diff = this.checkOutTime.getTime() - this.checkInTime.getTime();
      return diff / (1000 * 60 * 60);
    }
    return 0;
  }

  get status(): string {
    if (this.checkInTime && !this.checkOutTime) {
      return 'active';
    } else if (this.checkInTime && this.checkOutTime) {
      return 'completed';
    }
    return 'pending';
  }
}