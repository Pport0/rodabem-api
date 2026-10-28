import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RotaResult {
  distanciaKm: number;
  descricaoRota: string;
  duracaoMinutos: number;
}

const ORS_API_KEY_PLACEHOLDER = 'your-ors-api-key-here';
const ORS_TIMEOUT_MS = 12_000;

@Injectable()
export class OrsService implements OnModuleInit {
  private readonly apiKey: string;
  private readonly logger = new Logger(OrsService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ORS_API_KEY') ?? '';
  }

  onModuleInit() {
    if (!this.apiKey || this.apiKey === ORS_API_KEY_PLACEHOLDER) {
      throw new Error(
        'ORS_API_KEY não configurada ou com valor de exemplo. ' +
        'Defina a variável no .env antes de subir a aplicação.',
      );
    }
  }

  async calcularRota(
    origem: string,
    destino: string,
    paradas?: string[],
  ): Promise<RotaResult> {
    const coordOrigem = await this.geocodificar(origem);
    const coordDestino = await this.geocodificar(destino);

    const coordParadas = paradas
      ? await Promise.all(paradas.map((p) => this.geocodificar(p)))
      : [];

    const coordinates = [coordOrigem, ...coordParadas, coordDestino];

    let response: Response;
    let data: any;

    try {
      response = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-hgv',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
          body: JSON.stringify({ coordinates }),
          signal: AbortSignal.timeout(ORS_TIMEOUT_MS),
        },
      );
      data = await response.json();
    } catch (err: unknown) {
      this.logger.error(
        'Falha de rede ao calcular rota: ' +
        (err instanceof Error ? err.message : 'erro desconhecido'),
      );
      throw new InternalServerErrorException(
        'Serviço de rotas indisponível. Tente novamente em instantes.',
      );
    }

    if (!response.ok) {
      this.logger.error(
        'ORS directions retornou HTTP ' + response.status + ': ' +
        JSON.stringify(data),
      );
      throw new InternalServerErrorException(
        'Serviço de rotas indisponível. Tente novamente em instantes.',
      );
    }

    if (!data.routes || data.routes.length === 0) {
      throw new BadRequestException(
        'Não foi possível calcular a rota entre origem e destino informados.',
      );
    }

    const rota = data.routes[0].summary;
    const distanciaKm = parseFloat((rota.distance / 1000).toFixed(2));
    const duracaoMinutos = Math.round(rota.duration / 60);

    return {
      distanciaKm,
      descricaoRota: `${origem} → ${destino}`,
      duracaoMinutos,
    };
  }

  private async geocodificar(endereco: string): Promise<[number, number]> {
    const url =
      'https://api.openrouteservice.org/geocode/search' +
      '?api_key=' + this.apiKey +
      '&text=' + encodeURIComponent(endereco) +
      '&boundary.country=BR&size=1';

    let response: Response;
    let data: any;

    try {
      response = await fetch(url, { signal: AbortSignal.timeout(ORS_TIMEOUT_MS) });
      data = await response.json();
    } catch (err: unknown) {
      this.logger.error(
        'Falha de rede ao geocodificar "' + endereco + '": ' +
        (err instanceof Error ? err.message : 'erro desconhecido'),
      );
      throw new InternalServerErrorException(
        'Serviço de rotas indisponível. Tente novamente em instantes.',
      );
    }

    if (!response.ok) {
      this.logger.error(
        'ORS geocode retornou HTTP ' + response.status +
        ' para "' + endereco + '": ' + JSON.stringify(data),
      );
      throw new InternalServerErrorException(
        'Serviço de rotas indisponível. Tente novamente em instantes.',
      );
    }

    if (!data.features || data.features.length === 0) {
      throw new BadRequestException(
        `Endereço não encontrado: "${endereco}". Tente ser mais específico (ex: "São Paulo, SP").`,
      );
    }

    const [lng, lat] = data.features[0].geometry.coordinates;
    return [lng, lat];
  }
}