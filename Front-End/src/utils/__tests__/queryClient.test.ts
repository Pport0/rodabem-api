import { queryClient } from '../queryClient';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

it('deve avisar o usuario quando uma mutacao falha sem tratamento proprio', () => {
  const aoFalhar = queryClient.getDefaultOptions().mutations?.onError;

  expect(aoFalhar).toBeDefined();
  aoFalhar?.(new Error('Nao foi possivel salvar.'), undefined, undefined, undefined as never);

  expect(Toast.show).toHaveBeenCalledWith(
    'Nao foi possivel salvar.',
    expect.objectContaining({ type: 'error' }),
  );
});
