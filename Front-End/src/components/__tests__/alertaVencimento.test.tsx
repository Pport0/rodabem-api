import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import React, { ReactNode } from 'react';

import { AlertaVencimento } from '../alertaVencimento';
import { getAlertasVencimento } from '@/services/documentoService';

jest.mock('@/services/documentoService', () => ({ getAlertasVencimento: jest.fn() }));

const montar = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<AlertaVencimento />, { wrapper });
};

describe('AlertaVencimento', () => {
  it('deve destacar o documento que esta proximo do vencimento', async () => {
    jest.mocked(getAlertasVencimento).mockResolvedValue({
      alertas: [{ id: 1, nome: 'CRLV', dataVencimento: '2026-11-10T00:00:00.000Z', diasRestantes: 13 }],
    } as never);

    await montar();

    await waitFor(() => expect(screen.getByText(/CRLV/)).toBeTruthy());
  });

  it('nao deve exibir nada quando nenhum documento esta vencendo', async () => {
    jest.mocked(getAlertasVencimento).mockResolvedValue({ alertas: [] } as never);

    await montar();

    await waitFor(() => expect(getAlertasVencimento).toHaveBeenCalled());

    expect(screen.queryByText(/vence|vencimento/i)).toBeNull();
  });

  it('deve avisar quando nao conseguiu verificar os vencimentos', async () => {
    jest.mocked(getAlertasVencimento).mockRejectedValue(new Error('Network Error'));

    await montar();

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível verificar os vencimentos dos documentos.'),
      ).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: 'Tentar carregar novamente' })).toBeTruthy();
  });
});
