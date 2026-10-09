import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '../../users/entities/users.entity';

@Entity('requests')
export class Requests {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId'})
  client: User;

  @Column({ type: 'varchar', length: 1040 })
  description: string;

  @Column({ type: 'varchar', length: 240 })
  advisor: string;

  @Column({ type: 'varchar' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'update_at' })
  updateAt: Date;
}
