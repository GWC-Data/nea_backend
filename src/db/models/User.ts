import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo
} from 'sequelize-typescript';
import { GroupTable } from './GroupTable';

@Table({
  tableName: 'Users',
  timestamps: true,
  underscored: false
})
export class User extends Model {

  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  role!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  age!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  gender!: string;

  @ForeignKey(() => GroupTable)
  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  groupId!: number;

  @BelongsTo(() => GroupTable, {
    foreignKey: 'groupId',
    as: 'group'
  })
  group!: GroupTable;

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
}