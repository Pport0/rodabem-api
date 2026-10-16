import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import MeusDocumentos from '../meusDocumentos';
import { getDocumentos } from '@/services/documentoService';

jest.mock('@/services/documentoService', () => ({ getDocumentos: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const documento = (sobrescreve: Record<string, unknown> = {}) => ({
  id: 1,
  nome: 'CRLV 2026',
  numero: 'ABC-123',
  dataEmissao: '2026-01-01T12:00:00.000Z',
  dataVencimento: '2027-01-01T12:00:00.000Z',
  observacao: null,
  caminhaoId: null,
  vinculo: 'MOTORISTA',
  status: 'VALIDO',
  userId: 1,
  ...sobrescreve,
});

const montar = async (documentos: unknown[] = []) => {
  jest.mocked(getDocumentos).mockResolvedValue(documentos as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<MeusDocumentos />, { wrapper });
};

describe('Meus documentos', () => {
  it('deve listar os documentos do motorista', async () => {
    await montar([
      documento({ id: 1, nome: 'CRLV 2026' }),
      documento({ id: 2, nome: 'CNH' }),
    ]);

    await waitFor(() => expect(screen.getByText('CRLV 2026')).toBeTruthy());
    expect(screen.getByText('CNH')).toBeTruthy();
  });

  it('deve orientar quem ainda nao cadastrou nenhum documento', async () => {
    await montar([]);

    await waitFor(() =>
      expect(screen.getByText('Nenhum documento cadastrado')).toBeTruthy(),
    );
    expect(screen.getByText('Adicione seus documentos de motorista')).toBeTruthy();
  });

  it('deve oferecer o cadastro mesmo com a lista vazia', async () => {
    // O botao fica fora da lista, no rodape: sem documento nenhum o usuario precisa ter por
    // onde comecar.
    await montar([]);

    await waitFor(() => expect(screen.getByText('ADICIONAR DOCUMENTO')).toBeTruthy());

    await fireEvent.press(screen.getByText('ADICIONAR DOCUMENTO'));

    expect(router.push).toHaveBeenCalledWith('/documentos/novo');
  });
});
