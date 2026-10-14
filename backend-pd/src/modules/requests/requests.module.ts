import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { CommercialRequestHistory } from './entities/commercial-request-history.entity';
import { Requests } from './entities/requests.entity';
import { RequestsController } from './requests.controller';
import { RequestsDao } from './requests.dao';
import { RequestsService } from './requests.service';

/** Registra persistencia y componentes HTTP para el dominio de solicitudes. */
@Module({
  imports: [TypeOrmModule.forFeature([Requests, CommercialRequestHistory]), UsersModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestsDao],
  exports: [RequestsService],
})
export class RequestsModule {}
