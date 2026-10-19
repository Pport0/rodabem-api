import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TipoCombustivel } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Fluxo de abastecimento (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it('deve registrar abastecimentos validos, calcular media e bloquear quilometragem regressiva', async () => {
    const { token } = await registerAndLogin(app, '100005');
    await createTruck(app, token).expect(201);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 100,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 50,
        quilometragem: 1400,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    const mediaResponse = await request(app.getHttpServer())
      .get('/abastecimentos/media-consumo')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mediaResponse.body.mediaConsumo).toBe(8);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 40,
        quilometragem: 1300,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(400);

    const listResponse = await request(app.getHttpServer())
      .get('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(2);
  });

  const abastecer = (token: string, dados: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 100,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
        ...dados,
      });

  const abastecerEm = async (
    token: string,
    dataISO: string,
    dados: Record<string, unknown> = {},
  ) => {
    const perfil = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const caminhao = await prisma.caminhao.findFirst({
      where: { userId: perfil.body.id },
    });

    return prisma.abastecimento.create({
      data: {
        precoPorLitro: 6,
        totalLitros: 100,
        valorTotal: 600,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
        dataAbastecimento: new Date(dataISO),
        userId: perfil.body.id,
        caminhaoId: caminhao!.id,
        ...dados,
      },
    });
  };

  const comCaminhao = async (sufixo: string) => {
    const { token } = await registerAndLogin(app, sufixo);
    await createTruck(app, token).expect(201);
    return token;
  };

  describe('POST /abastecimentos', () => {
    it('deve recusar registro sem caminhao cadastrado', async () => {
      const { token } = await registerAndLogin(app, '700001');

      const resposta = await abastecer(token).expect(400);

      expect(resposta.body.message).toMatch(/cadastrar um caminhão/);
    });

    it('deve calcular o valor total a partir de preco e litros', async () => {
      const token = await comCaminhao('700002');

      const resposta = await abastecer(token, {
        precoPorLitro: 6.5,
        totalLitros: 40,
      }).expect(201);

      expect(resposta.body.valorTotal).toBe(260);
    });

    it('deve vincular o registro ao caminhao do usuario', async () => {
      const token = await comCaminhao('700003');

      const resposta = await abastecer(token).expect(201);

      expect(resposta.body.caminhaoId).toBeDefined();
    });

    it('deve recusar quilometragem menor que a ultima registrada', async () => {
      const token = await comCaminhao('700004');
      await abastecer(token, { quilometragem: 5000 }).expect(201);

      const resposta = await abastecer(token, { quilometragem: 4000 }).expect(400);

      expect(resposta.body.message).toMatch(/não pode ser menor que a última registrada/);
    });

    it('deve recusar quilometragem igual a ultima registrada', async () => {
      const token = await comCaminhao('700005');
      await abastecer(token, { quilometragem: 5000 }).expect(201);

      await abastecer(token, { quilometragem: 5000 }).expect(400);
    });

    it('nao deve criar o segundo registro quando a quilometragem se repete', async () => {
      const token = await comCaminhao('700006');
      await abastecer(token, { quilometragem: 5000 }).expect(201);

      await abastecer(token, { quilometragem: 5000 });

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body).toHaveLength(1);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).post('/abastecimentos').send({}).expect(401);
    });

    it.each([
      ['latitude', 'nao e um numero', '700011'],
      ['longitude', 'nao e um numero', '700012'],
      ['imagemUrl', 42, '700013'],
    ])('deve recusar %s com tipo errado', async (campo, valor, sufixo) => {
      const token = await comCaminhao(sufixo as string);

      await abastecer(token, { [campo as string]: valor }).expect(400);
    });

    it('deve aceitar a localizacao e a imagem quando vem no tipo certo', async () => {
      const token = await comCaminhao('700020');

      const resposta = await abastecer(token, {
        latitude: -16.6746,
        longitude: -49.3036,
        imagemUrl: 'https://exemplo.test/nota.jpg',
      }).expect(201);

      expect(resposta.body.id).toBeDefined();
    });
  });

  describe('GET /abastecimentos', () => {
    it('deve listar apenas os abastecimentos do proprio usuario', async () => {
      const primeiro = await comCaminhao('700010');
      const segundo = await comCaminhao('700011');
      await abastecer(primeiro, { quilometragem: 1000 }).expect(201);
      await abastecer(segundo, { quilometragem: 2000 }).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos')
        .set('Authorization', `Bearer ${primeiro}`)
        .expect(200);

      expect(resposta.body).toHaveLength(1);
      expect(resposta.body[0].quilometragem).toBe(1000);
    });

    it('nao deve expor o vinculo com o usuario na listagem', async () => {
      const token = await comCaminhao('700012');
      await abastecer(token).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body[0]).not.toHaveProperty('userId');
    });

    it('deve devolver lista vazia para usuario sem abastecimentos', async () => {
      const { token } = await registerAndLogin(app, '700013');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body).toEqual([]);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).get('/abastecimentos').expect(401);
    });
  });

  describe('GET /abastecimentos/:id', () => {
    it('deve devolver o abastecimento do proprio usuario', async () => {
      const token = await comCaminhao('700020');
      const criado = await abastecer(token).expect(201);

      const resposta = await request(app.getHttpServer())
        .get(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.id).toBe(criado.body.id);
    });

    it('deve recusar acesso a abastecimento de outro usuario', async () => {
      const dono = await comCaminhao('700021');
      const invasor = await comCaminhao('700022');
      const criado = await abastecer(dono).expect(201);

      const resposta = await request(app.getHttpServer())
        .get(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${invasor}`)
        .expect(403);

      expect(resposta.body.message).toMatch(/permissão para acessar/);
    });

    it('deve responder 404 para abastecimento inexistente', async () => {
      const token = await comCaminhao('700023');

      await request(app.getHttpServer())
        .get('/abastecimentos/999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /abastecimentos/:id', () => {
    it('deve recalcular o valor total ao alterar o preco', async () => {
      const token = await comCaminhao('700030');
      const criado = await abastecer(token, {
        precoPorLitro: 6,
        totalLitros: 100,
      }).expect(201);

      const resposta = await request(app.getHttpServer())
        .patch(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ precoPorLitro: 7 })
        .expect(200);

      expect(resposta.body.valorTotal).toBe(700);
    });

    it('deve preservar os campos nao enviados', async () => {
      const token = await comCaminhao('700031');
      const criado = await abastecer(token, { localDescricao: 'Posto A' }).expect(201);

      const resposta = await request(app.getHttpServer())
        .patch(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ observacao: 'nota' })
        .expect(200);

      expect(resposta.body.localDescricao).toBe('Posto A');
      expect(resposta.body.observacao).toBe('nota');
    });

    it('deve gravar todos os campos opcionais quando sao enviados', async () => {
      const token = await comCaminhao('700033');
      const criado = await abastecer(token).expect(201);

      const resposta = await request(app.getHttpServer())
        .patch(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          precoPorLitro: 7.5,
          totalLitros: 200,
          quilometragem: 2000,
          tipoCombustivel: TipoCombustivel.DIESEL_S500,
          latitude: -16.6869,
          longitude: -49.2643,
          localDescricao: 'BR-153, km 12',
          postoIdentificado: 'Posto Rota Norte',
          imagemUrl: 'https://cdn/nota.jpg',
          observacao: 'tanque cheio',
        })
        .expect(200);

      expect(resposta.body).toMatchObject({
        precoPorLitro: 7.5,
        totalLitros: 200,
        valorTotal: 1500,
        quilometragem: 2000,
        tipoCombustivel: TipoCombustivel.DIESEL_S500,
        latitude: -16.6869,
        longitude: -49.2643,
        localDescricao: 'BR-153, km 12',
        postoIdentificado: 'Posto Rota Norte',
        imagemUrl: 'https://cdn/nota.jpg',
        observacao: 'tanque cheio',
      });
    });

    it('deve recusar edicao de abastecimento de outro usuario', async () => {
      const dono = await comCaminhao('700032');
      const invasor = await comCaminhao('700033');
      const criado = await abastecer(dono).expect(201);

      await request(app.getHttpServer())
        .patch(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${invasor}`)
        .send({ observacao: 'invadido' })
        .expect(403);
    });

    it('deve permitir manter a mesma quilometragem na edicao', async () => {
      const token = await comCaminhao('700034');
      const criado = await abastecer(token, { quilometragem: 3000 }).expect(201);

      await request(app.getHttpServer())
        .patch(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quilometragem: 3000 })
        .expect(200);
    });
  });

  describe('PATCH /abastecimentos/:id - quilometragem entre os vizinhos', () => {
    const comHistorico = async (sufixo: string) => {
      const token = await comCaminhao(sufixo);
      const primeiro = await abastecerEm(token, '2026-03-01T12:00:00.000Z', {
        quilometragem: 1000,
      });
      const meio = await abastecerEm(token, '2026-03-10T12:00:00.000Z', {
        quilometragem: 2000,
      });
      const ultimo = await abastecerEm(token, '2026-03-20T12:00:00.000Z', {
        quilometragem: 3000,
      });
      return { token, primeiro, meio, ultimo };
    };

    const editarKm = (token: string, id: number, quilometragem: number) =>
      request(app.getHttpServer())
        .patch(`/abastecimentos/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quilometragem });

    describe('registro intermediario', () => {
      it('deve aceitar quilometragem entre a do anterior e a do posterior', async () => {
        const { token, meio } = await comHistorico('700060');

        await editarKm(token, meio.id, 2500).expect(200);
      });

      it('deve recusar quilometragem igual a do registro anterior', async () => {
        const { token, meio } = await comHistorico('700061');

        await editarKm(token, meio.id, 1000).expect(400);
      });

      it('deve recusar quilometragem igual a do registro posterior', async () => {
        const { token, meio } = await comHistorico('700062');

        await editarKm(token, meio.id, 3000).expect(400);
      });

      it('deve recusar quilometragem acima da do registro posterior', async () => {
        const { token, meio } = await comHistorico('700063');

        await editarKm(token, meio.id, 3500).expect(400);
      });

      it('nao deve gravar a quilometragem recusada', async () => {
        const { token, meio } = await comHistorico('700064');

        await editarKm(token, meio.id, 3500);

        const resposta = await request(app.getHttpServer())
          .get(`/abastecimentos/${meio.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(resposta.body.quilometragem).toBe(2000);
      });
    });

    describe('ultimo registro', () => {
      it('deve aceitar quilometragem acima da do anterior', async () => {
        const { token, ultimo } = await comHistorico('700065');

        await editarKm(token, ultimo.id, 3500).expect(200);
      });

      it('deve recusar quilometragem igual a do anterior', async () => {
        const { token, ultimo } = await comHistorico('700066');

        await editarKm(token, ultimo.id, 2000).expect(400);
      });
    });

    describe('primeiro registro', () => {
      it('deve aceitar quilometragem abaixo da do posterior', async () => {
        const { token, primeiro } = await comHistorico('700067');

        await editarKm(token, primeiro.id, 1500).expect(200);
      });

      it('deve recusar quilometragem igual a do posterior', async () => {
        const { token, primeiro } = await comHistorico('700068');

        await editarKm(token, primeiro.id, 2000).expect(400);
      });
    });
  });

  describe('DELETE /abastecimentos/:id', () => {
    it('deve excluir o abastecimento do proprio usuario', async () => {
      const token = await comCaminhao('700040');
      const criado = await abastecer(token).expect(201);

      const resposta = await request(app.getHttpServer())
        .delete(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.message).toBe('Abastecimento excluído com sucesso.');
    });

    it('deve remover o registro da listagem apos excluir', async () => {
      const token = await comCaminhao('700041');
      const criado = await abastecer(token).expect(201);

      await request(app.getHttpServer())
        .delete(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const lista = await request(app.getHttpServer())
        .get('/abastecimentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(lista.body).toEqual([]);
    });

    it('deve recusar exclusao de abastecimento de outro usuario', async () => {
      const dono = await comCaminhao('700042');
      const invasor = await comCaminhao('700043');
      const criado = await abastecer(dono).expect(201);

      await request(app.getHttpServer())
        .delete(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${invasor}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/abastecimentos/${criado.body.id}`)
        .set('Authorization', `Bearer ${dono}`)
        .expect(200);
    });
  });

  describe('GET /abastecimentos/relatorio', () => {
    it('deve exigir data inicial e final', async () => {
      const token = await comCaminhao('700050');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toBe('dataInicio e dataFim são obrigatórios.');
    });

    it('deve recusar periodo invertido', async () => {
      const token = await comCaminhao('700051');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .query({ dataInicio: '2026-02-01', dataFim: '2026-01-01' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toBe('dataInicio não pode ser maior que dataFim.');
    });

    it('deve somar litros, valores e distancia do periodo', async () => {
      const token = await comCaminhao('700052');
      await abastecerEm(token, '2026-03-10T14:00:00.000Z', {
        quilometragem: 1000,
        totalLitros: 100,
        precoPorLitro: 6,
        valorTotal: 600,
      });
      await abastecerEm(token, '2026-03-10T17:00:00.000Z', {
        quilometragem: 1800,
        totalLitros: 50,
        precoPorLitro: 6,
        valorTotal: 300,
      });

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .query({ dataInicio: '2026-03-10', dataFim: '2026-03-10' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.totalAbastecimentos).toBe(2);
      expect(resposta.body.totalLitros).toBe(150);
      expect(resposta.body.totalGasto).toBe(900);
      expect(resposta.body.distanciaPercorrida).toBe(800);
    });

    it('deve devolver relatorio zerado para periodo sem registros', async () => {
      const token = await comCaminhao('700053');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .query({ dataInicio: '2020-01-01', dataFim: '2020-01-31' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.totalAbastecimentos).toBe(0);
      expect(resposta.body.totalLitros).toBe(0);
      expect(resposta.body.abastecimentos).toEqual([]);
    });

    it('deve incluir os abastecimentos do dia consultado', async () => {
      const primeiro = await comCaminhao('700054');
      const segundo = await comCaminhao('700055');
      await abastecerEm(primeiro, '2026-03-10T14:00:00.000Z');
      await abastecerEm(segundo, '2026-03-10T14:00:00.000Z');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .query({ dataInicio: '2026-03-10', dataFim: '2026-03-10' })
        .set('Authorization', `Bearer ${primeiro}`)
        .expect(200);

      expect(resposta.body.totalAbastecimentos).toBe(1);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer())
        .get('/abastecimentos/relatorio')
        .query({ dataInicio: '2026-01-01', dataFim: '2026-01-31' })
        .expect(401);
    });
  });

  describe('GET /abastecimentos/media-consumo', () => {
    it('deve calcular a media com dois ou mais registros', async () => {
      const token = await comCaminhao('700060');
      await abastecer(token, { quilometragem: 1000, totalLitros: 100 }).expect(201);
      await abastecer(token, { quilometragem: 1500, totalLitros: 100 }).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/media-consumo')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.mediaConsumo).toBe(5);
      expect(resposta.body.unidade).toBe('km/L');
    });

    it('deve informar quando nao ha registros suficientes', async () => {
      const token = await comCaminhao('700061');
      await abastecer(token).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/media-consumo')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.mediaConsumo).toBeNull();
      expect(resposta.body.mensagem).toMatch(/pelo menos dois abastecimentos/);
    });

    it('nao deve considerar abastecimentos de outro usuario', async () => {
      const primeiro = await comCaminhao('700062');
      const segundo = await comCaminhao('700063');
      await abastecer(primeiro, { quilometragem: 1000 }).expect(201);
      await abastecer(segundo, { quilometragem: 2000 }).expect(201);
      await abastecer(segundo, { quilometragem: 3000 }).expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/media-consumo')
        .set('Authorization', `Bearer ${primeiro}`)
        .expect(200);

      expect(resposta.body.totalAbastecimentos).toBe(1);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer())
        .get('/abastecimentos/media-consumo')
        .expect(401);
    });
  });

  // So validacao e autenticacao: a consulta ao ORS e coberta no teste unitario do servico.
  describe('GET /abastecimentos/postos-proximos', () => {
    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer())
        .get('/abastecimentos/postos-proximos?latitude=-16.3&longitude=-48.9')
        .expect(401);
    });

    it('nao deve ser confundida com a consulta por identificador', async () => {
      const { token } = await registerAndLogin(app, '700070');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/postos-proximos?latitude=abc&longitude=-48.9')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toEqual(['Latitude deve ser um número.']);
    });

    it('deve recusar latitude fora da faixa', async () => {
      const { token } = await registerAndLogin(app, '700071');

      const resposta = await request(app.getHttpServer())
        .get('/abastecimentos/postos-proximos?latitude=91&longitude=-48.9')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toEqual([
        'Latitude deve estar entre -90 e 90.',
      ]);
    });
  });

});
