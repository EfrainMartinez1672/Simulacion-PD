import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Entidad SQLite que representa una solicitud comercial almacenada. */
@Entity('requests')
export class Requests {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 240 })
  client: string;

  @Column({ type: 'varchar', length: 1040 })
  description: string;

  @Column({ type: 'varchar', length: 240 })
  advisor: string;

  @Column({ type: 'varchar', length: 32 })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
