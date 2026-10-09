import { Body, Controller, Post } from '@nestjs/common';
import { type CreateRequestDto } from './dto/requests.dto';
import { Requests } from './entities/requests.entity';
import { RequestsService } from './requests.service';
@Controller('requests')
export class RequestsController {
  constructor(private readonly RequestsService: RequestsService) {}

  @Post('Create')
  Create(@Body() body: CreateRequestDto): Promise<Requests> {
    return this.RequestsService.create(body);
  }
}
