import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { EventLogs } from './EventLogs';
import { PasswordReset } from './PasswordReset';

@Table({ tableName: 'Users', timestamps: true })
export class User extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password!: string;

  @Column({ type: DataType.STRING, defaultValue: 'user' })
  role!: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  age!: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  gender!: string | null;

  // ✅ Matches migration: orgId as JSON array of organization UUIDs
  @Column({ type: DataType.JSON, allowNull: true, defaultValue: [] })
  orgId!: string[];

  // ✅ Matches migration: joinedEvents as JSON array of event UUIDs
  @Column({ type: DataType.JSON, defaultValue: [] })
  joinedEvents!: string[];

  @HasMany(() => EventLogs, { foreignKey: 'userId' })
  eventLogs!: EventLogs[];

  @HasMany(() => PasswordReset, { foreignKey: 'userId' })
  passwordResets!: PasswordReset[];
}