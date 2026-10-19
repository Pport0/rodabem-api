import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

// Query chega como texto; vazio conta como ausente (Number('') seria 0, uma coordenada valida).
const paraNumero = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : Number(value);

// Os validadores rodam de baixo para cima: obrigatorio, numero e so entao a faixa.
export class PostosProximosQueryDto {
  @Transform(paraNumero)
  @Max(90, { message: 'Latitude deve estar entre -90 e 90.' })
  @Min(-90, { message: 'Latitude deve estar entre -90 e 90.' })
  @IsNumber({}, { message: 'Latitude deve ser um número.' })
  @IsNotEmpty({ message: 'Latitude é obrigatória.' })
  latitude: number;

  @Transform(paraNumero)
  @Max(180, { message: 'Longitude deve estar entre -180 e 180.' })
  @Min(-180, { message: 'Longitude deve estar entre -180 e 180.' })
  @IsNumber({}, { message: 'Longitude deve ser um número.' })
  @IsNotEmpty({ message: 'Longitude é obrigatória.' })
  longitude: number;
}
