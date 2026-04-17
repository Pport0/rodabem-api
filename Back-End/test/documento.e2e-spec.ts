import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Fluxo de documentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  it('deve cadastrar documento valido, bloquear vencimento anterior e negar acesso entre usuarios', async () => {
    const owner = await registerAndLogin(app, '100003');
    const intruder = await registerAndLogin(app, '100004');

    const truckResponse = await createTruck(app, owner.token);
    const caminhaoId = truckResponse.body.caminhao.id;

    const createResponse = await request(app.getHttpServer())
      .post('/documentos')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        nome: 'CRLV',
        numero: 'DOC-1',
        dataEmissao: '2026-01-01',
        dataVencimento: '2026-12-31',
        caminhaoId,
      })
      .expect(201);

    expect(createResponse.body.documento.nome).toBe('CRLV');

    const listResponse = await request(app.getHttpServer())
      .get('/documentos')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/documentos')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        nome: 'ANTT',
        numero: 'DOC-2',
        dataEmissao: '2026-12-31',
        dataVencimento: '2026-01-01',
        caminhaoId,
      })
      .expect(400);

    const documentId = createResponse.body.documento.id;

    await request(app.getHttpServer())
      .put(`/documentos/${documentId}`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ observacao: 'Tentativa indevida' })
      .expect(403);
  });

  it('deve atualizar a data de vencimento do proprio documento', async () => {
    const owner = await registerAndLogin(app, '100013');

    const truckResponse = await createTruck(app, owner.token);
    const caminhaoId = truckResponse.body.caminhao.id;

    const createResponse = await request(app.getHttpServer())
      .post('/documentos')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        nome: 'Seguro',
        numero: 'DOC-3',
        dataEmissao: '2026-01-01',
        dataVencimento: '2026-06-30',
        caminhaoId,
      })
      .expect(201);

    const documentId = createResponse.body.documento.id;

    const updateResponse = await request(app.getHttpServer())
      .put(`/documentos/${documentId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        dataVencimento: '2026-12-31',
      })
      .expect(200);

    expect(updateResponse.body.dataVencimento).toContain('2026-12-31');

    const listResponse = await request(app.getHttpServer())
      .get('/documentos')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(listResponse.body[0].dataVencimento).toContain('2026-12-31');
  });
});
