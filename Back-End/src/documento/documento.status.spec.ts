import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DocumentoService } from './documento.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Regra: RNE-05, status automatico.
 *
 *   VALIDO   : vencimento > hoje + X
 *   VENCENDO : hoje <= vencimento <= hoje + X
 *   EXPIRADO : vencimento < hoje
 *   X configuravel, padrao 30 dias.
 *
 * Unitario em vez de e2e: o que importa sao as fronteiras exatas. Pelo e2e, cada fronteira exigiria cadastrar um
 * documento com data calculada ao segundo, caro e fragil para o que e aritmetica de datas. O relogio fica fixo para a
 * fronteira nao depender da hora em que a suite roda.
 */
describe('DocumentoService — status pelo vencimento', () => {
  const AGORA = new Date('2026-06-15T12:00:00.000Z');
  const DIA = 24 * 60 * 60 * 1000;

  const montar = async (diasAlerta?: number) => {
    const documentos: { dataVencimento: Date }[] = [];

    const modulo = await Test.createTestingModule({
      providers: [
        DocumentoService,
        {
          provide: PrismaService,
          useValue: {
            documento: { findMany: jest.fn(async () => documentos) },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => diasAlerta) },
        },
      ],
    }).compile();

    const service = modulo.get(DocumentoService);

    return async (vencimento: Date) => {
      documentos.splice(0, documentos.length, {
        dataVencimento: vencimento,
      });
      const [doc] = await service.findAll(1);
      return doc.status as string;
    };
  };

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(AGORA);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('com a janela padrao de 30 dias', () => {
    it.each([
      ['um ano a frente', 365 * DIA, 'VALIDO'],
      ['um milissegundo depois da janela', 30 * DIA + 1, 'VALIDO'],
      ['exatamente no fim da janela', 30 * DIA, 'VENCENDO'],
      ['dentro da janela', 10 * DIA, 'VENCENDO'],
      ['exatamente hoje', 0, 'VENCENDO'],
      ['um milissegundo atras', -1, 'EXPIRADO'],
      ['dez dias atras', -10 * DIA, 'EXPIRADO'],
    ])('vencimento %s deve ser %s', async (_nome, deslocamento, esperado) => {
      const statusDe = await montar();

      await expect(
        statusDe(new Date(AGORA.getTime() + (deslocamento as number))),
      ).resolves.toBe(esperado);
    });
  });

  describe('com a janela configurada em outro valor', () => {
    it.each([
      [7, 10 * DIA, 'VALIDO'],
      [7, 7 * DIA, 'VENCENDO'],
      [60, 45 * DIA, 'VENCENDO'],
      [60, 61 * DIA, 'VALIDO'],
    ])(
      'com janela de %s dias, vencimento em %s ms deve ser %s',
      async (janela, deslocamento, esperado) => {
        const statusDe = await montar(janela as number);

        await expect(
          statusDe(new Date(AGORA.getTime() + (deslocamento as number))),
        ).resolves.toBe(esperado);
      },
    );
  });
});
