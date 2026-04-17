import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Fluxo de caminhao (e2e)', () => {
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

  it('deve cadastrar e consultar o caminhao do usuario, bloqueando segundo cadastro', async () => {
    const { token } = await registerAndLogin(app, '100002');

    await createTruck(app, token).expect(201);

    const getResponse = await request(app.getHttpServer())
      .get('/caminhao')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.placa).toBe('ABC1D23');

    await createTruck(app, token).expect(400);
  });

  it('deve permitir editar o caminhao do usuario autenticado', async () => {
    const { token } = await registerAndLogin(app, '100012');

    await createTruck(app, token, {
      placa: 'XYZ9K88',
      modelo: 'FH 460',
      renavam: '99887766554',
      numeroEixos: 6,
    }).expect(201);

    const updateResponse = await request(app.getHttpServer())
      .put('/caminhao')
      .set('Authorization', `Bearer ${token}`)
      .send({
        modelo: 'Actros 2651',
        cor: 'Branco',
        numeroEixos: 7,
      })
      .expect(200);

    expect(updateResponse.body.caminhao.modelo).toBe('Actros 2651');
    expect(updateResponse.body.caminhao.cor).toBe('Branco');
    expect(updateResponse.body.caminhao.numeroEixos).toBe(7);

    const getResponse = await request(app.getHttpServer())
      .get('/caminhao')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getResponse.body.modelo).toBe('Actros 2651');
    expect(getResponse.body.numeroEixos).toBe(7);
  });
});
