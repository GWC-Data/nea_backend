import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  IsUUID,
} from 'sequelize-typescript';

@Table({
  tableName: 'eventRequests',
  timestamps: true,
})
export class EventRequestTable extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  requestId!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  organizationEmail!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  date!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  time!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  description!: string;

  @Column({ type: DataType.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ type: DataType.UUID, allowNull: false })
  createdBy!: string;
}
