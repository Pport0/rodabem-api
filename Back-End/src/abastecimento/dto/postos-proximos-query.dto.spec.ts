import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PostosProximosQueryDto } from './postos-proximos-query.dto';

// A query chega como texto, como no ValidationPipe global (transform: true).
const validar = async (query: Record<string, string | undefined>) => {
  const dto = plainToInstance(PostosProximosQueryDto, query);
  const erros = await validate(dto, { stopAtFirstError: true });
  return {
    dto,
    mensagens: erros.flatMap((e) => Object.values(e.constraints ?? {})),
  };
};

describe('PostosProximosQueryDto', () => {
  it('deve aceitar e converter coordenadas validas', async () => {
    const { dto, mensagens } = await validar({
      latitude: '-16.3281',
      longitude: '-48.9526',
    });

    expect(mensagens).toEqual([]);
    expect(dto.latitude).toBe(-16.3281);
    expect(dto.longitude).toBe(-48.9526);
  });

  it.each([
    [{ longitude: '-48.9' }, 'Latitude é obrigatória.'],
    [{ latitude: '', longitude: '-48.9' }, 'Latitude é obrigatória.'],
    [{ latitude: 'abc', longitude: '-48.9' }, 'Latitude deve ser um número.'],
    [
      { latitude: '91', longitude: '-48.9' },
      'Latitude deve estar entre -90 e 90.',
    ],
    [{ latitude: '-16.3' }, 'Longitude é obrigatória.'],
    [
      { latitude: '-16.3', longitude: '-181' },
      'Longitude deve estar entre -180 e 180.',
    ],
  ])('deve recusar %j', async (query, mensagem) => {
    const { mensagens } = await validar(query);

    expect(mensagens).toContain(mensagem);
  });
});
