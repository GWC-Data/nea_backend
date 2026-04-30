import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'Organizations', timestamps: true })
export class Organization extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  declare orgId: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  orgName!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  address?: string;

  @Column({ type: DataType.STRING, allowNull: false })
  phone!: string;

  @Column({ type: DataType.STRING, defaultValue: 'pending', allowNull: false })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ type: DataType.JSON, defaultValue: [] })
  userIds!: string[];

  @Column({ type: DataType.JSON, defaultValue: [] })
  eventIds!: string[];

  @Column({ type: DataType.FLOAT, defaultValue: 0 })
  totalHours!: number;

  @Column({ type: DataType.FLOAT, defaultValue: 0 })
  totalGarbageWeight!: number;
}