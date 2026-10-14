import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RequestEventType } from '../enums/request-event-type.enum';
import { Requests } from './requests.entity';

/** Historial de cambios y eventos asociados a la solicitud comercial. */
@Entity('request_history')
export class CommercialRequestHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'solicitud_id', type: 'int' })
  solicitudId: number;

  @Column({ type: 'varchar', length: 32 })
  tipoEvento: RequestEventType;

  @Column({ type: 'varchar', length: 240, nullable: true })
  valorAnterior: string | null;

  @Column({ type: 'varchar', length: 240 })
  valorNuevo: string;

  @Column({ type: 'varchar', length: 240 })
  usuarioActor: string;

  @CreateDateColumn({ name: 'fecha_evento' })
  fechaEvento: Date;

  @ManyToOne(() => Requests, (request) => request.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'solicitud_id' })
  request: Requests;
}
