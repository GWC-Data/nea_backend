// src/db/models/EventTable.ts

import {
  Table,
  Column,
  Model,
  DataType,
  HasMany
} from 'sequelize-typescript';
import { EventLogs } from './EventLogs';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'EventTable',
  timestamps: true,
  underscored: false
})
export class EventTable extends Model {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare eventId: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    defaultValue: () => uuidv4(),
    comment: 'Event UUID for cross-system references'
  })
  eventUuid!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  date!: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  location!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  details!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  rewards!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  joinsCount!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of User UUIDs that have joined this event'
  })
  participants!: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  event_image!: string;

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
  @HasMany(() => EventLogs, { foreignKey: 'eventId', as: 'eventLogs' })
  eventLogs!: EventLogs[];
}