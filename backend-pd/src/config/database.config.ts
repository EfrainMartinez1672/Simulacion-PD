import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Requests } from '../modules/requests/entities/requests.entity';
import { User } from '../modules/users/entities/users.entity';

/** Registra la configuración TypeORM para la base SQLite del proyecto. */
export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'better-sqlite3',
  database: process.env.DB_PATH ?? './data/requests.sqlite',
  entities: [User, Requests],
  synchronize: true,
  logging: process.env.NODE_ENV !== 'production',
  autoLoadEntities: true,
}));
