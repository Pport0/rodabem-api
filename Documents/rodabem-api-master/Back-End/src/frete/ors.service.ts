import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RotaResult {
  distanciaKm: number;
  descricaoRota: string;
  duracaoMinutos: number;
}

@Injectable()
export class OrsService {
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ORS_API_KEY');
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

    
    const coordinates = [
      coordOrigem,
      ...coordParadas,
      coordDestino,
    ];

    
    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-hgv',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        body: JSON.stringify({ coordinates }),
      },
    );

    const data = await response.json();

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
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${this.apiKey}&text=${encodeURIComponent(endereco)}&boundary.country=BR&size=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new BadRequestException(
        `Endereço não encontrado: "${endereco}". Tente ser mais específico (ex: "São Paulo, SP").`,
      );
    }

    const [lng, lat] = data.features[0].geometry.coordinates;
    return [lng, lat];
  }
}