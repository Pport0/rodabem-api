import { Toast } from '../index';

it('deve avisar no console e seguir, em vez de derrubar a tela', () => {
  const console_error = jest.spyOn(console, 'error').mockImplementation(() => {});

  expect(() => Toast.show('qualquer coisa')).not.toThrow();
  expect(Toast.show('qualquer coisa')).toBe('');
  expect(console_error).toHaveBeenCalled();

  console_error.mockRestore();
});
