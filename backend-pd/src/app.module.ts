import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UserGuard } from './common/guards/user.guard';
import databaseConfig from './config/database.config';
import { RequestsModule } from './modules/requests/requests.module';
import { UsersModule } from './modules/users/users.module';

/** Módulo raíz: conecta configuración, persistencia, dominios y seguridad global. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig(),
    }),
    UsersModule,
    RequestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
