import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { ReactNode } from 'react';

import NovoAbastecimento from '../abastecimentos/novo';
import {
  createAbastecimento,
  getAbastecimento,
  scanHodometro,
} from '@/services/abastecimentoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/abastecimentoService', () => ({
  getAbastecimento: jest.fn(),
  createAbastecimento: jest.fn(),
  updateAbastecimento: jest.fn(),
  scanHodometro: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({ Toast: { show: jest.fn() } }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const CAMPO_KM = 'Ex: 182350';
const BOTAO = 'Ler hodômetro';

const montarTela = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return render(<NovoAbastecimento />, { wrapper });
};

const cameraTiraFoto = () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as any);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///hodometro.jpg', fileName: 'hodometro.jpg', mimeType: 'image/jpeg' }],
  } as any);
};

const lerHodometro = async () => {
  await montarTela();
  await fireEvent.press(screen.getByText(BOTAO));
};

const campoKm = () => screen.getByPlaceholderText(CAMPO_KM);

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(createAbastecimento).mockResolvedValue({ id: 1 } as any);
  cameraTiraFoto();
});

describe('Novo abastecimento - leitura do hodometro (#31)', () => {
  it('deve enviar a foto tirada pela camera', async () => {
    jest.mocked(scanHodometro).mockResolvedValue({
      quilometragem: 182350,
      confianca: 'media',
      mensagem: 'Quilometragem extraída. Revise antes de confirmar.',
    });

    await lerHodometro();

    await waitFor(() =>
      expect(scanHodometro).toHaveBeenCalledWith({
        uri: 'file:///hodometro.jpg',
        name: 'hodometro.jpg',
        type: 'image/jpeg',
      }),
    );
  });

  it('deve preencher a quilometragem e mostrar a mensagem com a confianca', async () => {
    jest.mocked(scanHodometro).mockResolvedValue({
      quilometragem: 182350,
      confianca: 'media',
      mensagem: 'Quilometragem extraída. Revise antes de confirmar.',
    });

    await lerHodometro();

    await waitFor(() => expect(campoKm().props.value).toBe('182350'));
    expect(
      screen.getByText('Quilometragem extraída. Revise antes de confirmar. | Confianca: MEDIA'),
    ).toBeTruthy();
  });

  it('deve deixar corrigir o valor lido, e salvar o valor corrigido', async () => {
    jest.mocked(scanHodometro).mockResolvedValue({
      quilometragem: 182850,
      confianca: 'media',
      mensagem: 'Quilometragem extraída. Revise antes de confirmar.',
    });
    await lerHodometro();
    await waitFor(() => expect(campoKm().props.value).toBe('182850'));

    await fireEvent.changeText(screen.getByPlaceholderText('Ex: 6,39'), '6,39');
    await fireEvent.changeText(screen.getByPlaceholderText('Ex: 320'), '320');
    await fireEvent.changeText(campoKm(), '182350');
    await fireEvent.press(screen.getByText('CADASTRAR ABASTECIMENTO'));

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(createAbastecimento).mock.calls[0][0]).toMatchObject({ quilometragem: 182350 });
  });

  it('deve manter o campo para digitacao quando a leitura nao encontra numero', async () => {
    jest.mocked(scanHodometro).mockResolvedValue({
      quilometragem: null,
      confianca: 'baixa',
      mensagem: 'Não foi possível extrair a quilometragem. Preencha manualmente.',
    });
    await montarTela();
    await fireEvent.changeText(campoKm(), '1000');

    await fireEvent.press(screen.getByText(BOTAO));

    expect(
      await screen.findByText(
        'Não foi possível extrair a quilometragem. Preencha manualmente. | Confianca: BAIXA',
      ),
    ).toBeTruthy();
    expect(campoKm().props.value).toBe('1000');
  });

  it('deve avisar o erro da api e manter o campo como estava', async () => {
    jest.mocked(scanHodometro).mockRejectedValue({
      response: { data: { message: 'Arquivo muito grande. O tamanho máximo permitido é 12MB.' } },
    });
    await montarTela();
    await fireEvent.changeText(campoKm(), '1000');

    await fireEvent.press(screen.getByText(BOTAO));

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Arquivo muito grande. O tamanho máximo permitido é 12MB.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(campoKm().props.value).toBe('1000');
  });

  it('deve usar uma mensagem propria quando a api nao responde', async () => {
    jest.mocked(scanHodometro).mockRejectedValue(new Error('Network Error'));

    await lerHodometro();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Nao foi possivel ler o hodometro. Digite a quilometragem.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
  });

  it('deve mostrar carregando e impedir novo envio durante a leitura', async () => {
    let concluirLeitura: (valor: unknown) => void = () => {};
    jest.mocked(scanHodometro).mockReturnValue(
      new Promise((resolve) => (concluirLeitura = resolve)) as any,
    );
    await montarTela();

    fireEvent.press(screen.getByText(BOTAO));

    expect(await screen.findByTestId('lendo-hodometro')).toBeTruthy();
    expect(screen.queryByText(BOTAO)).toBeNull();
    expect(screen.getByLabelText(BOTAO).props.accessibilityState).toMatchObject({ disabled: true });

    concluirLeitura({ quilometragem: 182350, confianca: 'media', mensagem: 'ok' });
    expect(await screen.findByText(BOTAO)).toBeTruthy();
    expect(scanHodometro).toHaveBeenCalledTimes(1);
  });

  it('nao deve chamar a api quando a foto e cancelada', async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: true, assets: null } as any);

    await lerHodometro();

    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
    expect(scanHodometro).not.toHaveBeenCalled();
  });

  it('nao deve oferecer a leitura na edicao', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
    jest.mocked(getAbastecimento).mockResolvedValue({
      id: 7,
      precoPorLitro: 6.39,
      totalLitros: 320,
      quilometragem: 182350,
      tipoCombustivel: 'DIESEL_S10',
    } as any);

    await montarTela();

    await waitFor(() => expect(campoKm().props.value).toBe('182350'));
    expect(screen.queryByText(BOTAO)).toBeNull();
  });
});
