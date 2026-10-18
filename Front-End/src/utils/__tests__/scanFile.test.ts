import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { Toast } from '@/shared/ui/molecules/Toast';
import { normalizeFileName, pickScanFile, resolveMimeType } from '../scanFile';

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

describe('scanFile - auxiliares comuns ao scan de caminhao e documento (#50)', () => {
  it.each([
    ['arquivo.PDF', null, 'application/pdf'],
    ['foto.png', undefined, 'image/png'],
    ['foto.heic', null, 'image/jpeg'],
    ['qualquer.pdf', 'image/webp', 'image/webp'],
  ])('resolveMimeType(%s, %s) deve ser %s', (nome, mime, esperado) => {
    expect(resolveMimeType(nome, mime)).toBe(esperado);
  });

  it('normalizeFileName deve usar o nome alternativo quando o nome vem vazio', () => {
    expect(normalizeFileName('   ', 'caminhao-1.jpg')).toBe('caminhao-1.jpg');
    expect(normalizeFileName(' crlv.pdf ')).toBe('crlv.pdf');
  });

  it('deve devolver o arquivo escolhido no seletor de documentos', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///crlv.pdf', name: 'crlv.pdf', mimeType: null }],
    } as any);

    await expect(pickScanFile('document', 'documento')).resolves.toEqual({
      uri: 'file:///crlv.pdf',
      name: 'crlv.pdf',
      type: 'application/pdf',
    });
  });

  it('deve usar o prefixo da tela quando a foto da camera vem sem nome', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as any);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///foto', fileName: null, mimeType: null }],
    } as any);

    const arquivo = await pickScanFile('camera', 'caminhao');

    expect(arquivo?.name).toMatch(/^caminhao-\d+\.jpg$/);
    expect(arquivo?.type).toBe('image/jpeg');
  });

  it('deve avisar e devolver null quando a camera e negada', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false } as any);

    await expect(pickScanFile('camera', 'caminhao')).resolves.toBeNull();
    expect(Toast.show).toHaveBeenCalledWith(
      'Permissao de camera negada',
      expect.objectContaining({ type: 'error' }),
    );
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('deve devolver null quando o usuario cancela o seletor de documentos', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true } as any);

    await expect(pickScanFile('document', 'documento')).resolves.toBeNull();
  });
});
