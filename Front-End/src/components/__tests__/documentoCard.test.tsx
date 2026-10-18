import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DocumentoCard } from '../documentoCard';

const documentoBase = {
  id: 1,
  nome: 'CRLV 2026',
  numero: 'ABC-123',
  dataEmissao: '2026-01-01T12:00:00.000Z',
  dataVencimento: '2027-01-01T12:00:00.000Z',
  observacao: null,
  caminhaoId: null,
  vinculo: 'MOTORISTA',
  status: undefined,
  userId: 1,
};

const emDias = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString();
};

const montar = async (documento: Record<string, unknown> = {}) =>
  render(<DocumentoCard documento={{ ...documentoBase, ...documento } as never} />);

describe('Cartao de documento - status vindo do back', () => {
  it.each([
    ['VALIDO', 'VÁLIDO'],
    ['VENCENDO', 'VENCENDO EM BREVE'],
    ['EXPIRADO', 'EXPIRADO'],
  ])('deve exibir o status %s como "%s"', async (doBack, naTela) => {
    await montar({ status: doBack });

    expect(screen.getByText(naTela)).toBeTruthy();
  });

  it('deve respeitar o status do back mesmo quando a data diria outra coisa', async () => {
    await montar({ status: 'EXPIRADO', dataVencimento: emDias(365) });

    expect(screen.getByText('EXPIRADO')).toBeTruthy();
  });
});

describe('Cartao de documento - quando o back nao manda status', () => {

  it('deve tratar como vencido o documento cuja data ja passou', async () => {
    await montar({ status: undefined, dataVencimento: emDias(-1) });

    expect(screen.getByText('EXPIRADO')).toBeTruthy();
  });

  it('deve calcular tambem quando o back manda um status que nao reconhece', async () => {
    await montar({ status: 'ALGO_NOVO', dataVencimento: emDias(-5) });

    expect(screen.getByText('EXPIRADO')).toBeTruthy();
  });
});

describe('Cartao de documento - janela de alerta definida pelo back (#52)', () => {
  it('deve exibir VALIDO quando o back diz valido, mesmo a menos de 30 dias do vencimento', async () => {
    await montar({ status: 'VALIDO', dataVencimento: emDias(10) });

    expect(screen.getByText('VÁLIDO')).toBeTruthy();
    expect(screen.queryByText('VENCENDO EM BREVE')).toBeNull();
  });

  it('deve exibir VENCENDO quando o back diz vencendo, mesmo a mais de 30 dias do vencimento', async () => {
    await montar({ status: 'VENCENDO', dataVencimento: emDias(45) });

    expect(screen.getByText('VENCENDO EM BREVE')).toBeTruthy();
  });

  it('nao deve decidir "vencendo" por conta propria quando o back nao manda status', async () => {
    await montar({ status: undefined, dataVencimento: emDias(10) });

    expect(screen.queryByText('VENCENDO EM BREVE')).toBeNull();
    expect(screen.queryByText('EXPIRADO')).toBeNull();
  });
});

describe('Cartao de documento - o que o motorista le', () => {
  it('deve exibir a data de vencimento no padrao brasileiro', async () => {
    await montar({ dataVencimento: '2027-03-10T12:00:00.000Z' });

    expect(screen.getByText('Vencimento: 10/03/2027')).toBeTruthy();
  });

  it('deve dizer "Expirou em" quando o documento ja venceu', async () => {
    await montar({ status: 'EXPIRADO' });

    expect(screen.getByText(/^Expirou em: /)).toBeTruthy();
  });

  it('deve dizer "Vencimento" enquanto o documento vale', async () => {
    await montar({ status: 'VALIDO' });

    expect(screen.getByText(/^Vencimento: /)).toBeTruthy();
  });

  it.each([
    ['CAMINHAO', 'Vinculado ao caminhão'],
    ['MOTORISTA', 'Documento pessoal'],
  ])('deve identificar o documento de vinculo %s', async (vinculo, rotulo) => {
    await montar({ vinculo });

    expect(screen.getByText(rotulo)).toBeTruthy();
  });

  it('deve oferecer o registro de renovacao apenas quando ha o que renovar', async () => {
    await montar({ status: 'VALIDO' });
    expect(screen.queryByText('REGISTRAR RENOVAÇÃO')).toBeNull();

    await montar({ status: 'VENCENDO' });
    expect(screen.getAllByText('REGISTRAR RENOVAÇÃO').length).toBeGreaterThan(0);
  });

  it('deve oferecer o registro de renovacao quando o documento expirou', async () => {
    await montar({ status: 'EXPIRADO' });

    expect(screen.getByText('REGISTRAR RENOVAÇÃO')).toBeTruthy();
  });
});
