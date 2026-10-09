import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 240 })
  name: string;

  @Column({ type: 'varchar', length: 240 })
  role: string;
}
