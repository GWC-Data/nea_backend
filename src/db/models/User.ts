import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { GroupTable } from './GroupTable';
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

  @ForeignKey(() => GroupTable)
  @Column({ type: DataType.INTEGER, allowNull: true })
  groupId!: number | null;

  @BelongsTo(() => GroupTable)
  group!: GroupTable | null;

  @Column({ type: DataType.JSON, defaultValue: [] })
  joinedEvents!: string[]; // array of event UUIDs

  @HasMany(() => EventLogs, { foreignKey: 'userId' })
  eventLogs!: EventLogs[];

  @HasMany(() => PasswordReset, { foreignKey: 'userId' })
  passwordResets!: PasswordReset[];
}