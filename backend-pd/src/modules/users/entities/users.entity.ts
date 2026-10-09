import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Entidad de usuario persistida; la autenticación de esta API usa el catálogo de UsersService. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 240 })
  name: string;

  @Column({ type: 'varchar', length: 240 })
  role: string;
}
