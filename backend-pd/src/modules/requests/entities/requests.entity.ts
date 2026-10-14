import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommercialRequestHistory } from './commercial-request-history.entity';

/** Entidad SQLite que representa una solicitud comercial almacenada. */
@Entity('requests')
export class Requests {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 240 })
  client: string;

  @Column({ type: 'varchar', length: 1040 })
  description: string;

  @Index('IDX_REQUESTS_ADVISOR')
  @Column({ type: 'varchar', length: 240, nullable: true })
  advisor: string | null;

  @Index('IDX_REQUESTS_ESTADO')
  @Column({ type: 'varchar', length: 32 })
  status: string;

  @Index('IDX_REQUESTS_CREATED_AT')
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CommercialRequestHistory, (history) => history.request)
  history: CommercialRequestHistory[];
}
