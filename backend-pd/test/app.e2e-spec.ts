import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AppModule } from './../src/app.module';

/** Verifica el arranque HTTP completo y el comportamiento del módulo de solicitudes. */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.API_KEYS = 'local-dev-key-one,local-dev-key-two';
    process.env.DB_PATH = './data/test-requests.sqlite';
    process.env.DB_SYNCHRONIZE = 'true';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API de solicitudes comerciales')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
    await app.init();
  });

  it('/ (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.body).toEqual({
      success: true,
      data: 'Hello World!',
    });
  });

  it('documents request pagination parameters as numbers in Swagger', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const parameters = response.body.paths['/solicitudes'].get.parameters;

    expect(
      parameters.find(({ name }) => name === 'page').schema.type,
    ).toBe('number');
    expect(
      parameters.find(({ name }) => name === 'limit').schema.type,
    ).toBe('number');
  });

  it('creates a supervisor request with null advisor and records the creation event', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .set('x-api-key', 'local-dev-key-one')
      .set('x-user', 'supervisor1')
      .send({
        cliente: 'cliente-e2e-001',
        descripcion: 'Revisión de la campaña',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.asesor).toBeNull();
    expect(response.body.data.estado).toBe('PENDIENTE');

    const historyResponse = await request(app.getHttpServer())
      .get(`/solicitudes/${response.body.data.id}/historial`)
      .set('x-api-key', 'local-dev-key-one')
      .set('x-user', 'supervisor1')
      .expect(200);

    expect(historyResponse.body.success).toBe(true);
    expect(historyResponse.body.data[0].tipoEvento).toBe('CREACION');
  });

  it('assigns a request to an advisor and returns paginated results', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/solicitudes')
      .set('x-api-key', 'local-dev-key-one')
      .set('x-user', 'asesor01')
      .send({
        cliente: 'cliente-e2e-002',
        descripcion: 'Necesita asignación',
      })
      .expect(201);

    const assignedResponse = await request(app.getHttpServer())
      .patch(`/solicitudes/${createResponse.body.data.id}/asignacion`)
      .set('x-api-key', 'local-dev-key-one')
      .set('x-user', 'supervisor1')
      .send({ asesorId: 'asesor02' })
      .expect(200);

    expect(assignedResponse.body.data.asesor).toBe('asesor02');

    const listResponse = await request(app.getHttpServer())
      .get('/solicitudes')
      .query({ estado: 'PENDIENTE', cliente: 'cliente-e2e', page: 1, limit: 10 })
      .set('x-api-key', 'local-dev-key-one')
      .set('x-user', 'asesor02')
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(listResponse.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  afterEach(async () => {
    await app.close();
  });
});
