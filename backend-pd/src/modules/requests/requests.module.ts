import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Requests } from './entities/requests.entity';
import { RequestsController } from './requests.controller';
import { RequestsDao } from './requests.dao';
import { RequestsService } from './requests.service';

/** Registra persistencia y componentes HTTP para el dominio de solicitudes. */
@Module({
  imports: [TypeOrmModule.forFeature([Requests])],
  controllers: [RequestsController],
  providers: [RequestsService, RequestsDao],
  exports: [RequestsService],
})
export class RequestsModule {}
