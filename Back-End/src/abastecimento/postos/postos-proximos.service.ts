import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PostoProximo {
  nome: string;
  distanciaMetros: number;
}

export interface PostosProximosResult {
  postos: PostoProximo[];
  mensagem: string | null;
}

// Trecho usado da resposta (GeoJSON FeatureCollection) da API de POIs.
interface OrsPoisResponse {
  features?: {
    properties?: {
      distance?: number;
      osm_tags?: { name?: string; brand?: string };
    };
  }[];
}

// Categoria "fuel" da API de POIs do openrouteservice (grupo transport, 580).
const CATEGORIA_POSTO = 596;
const RAIO_METROS = 500;
const LIMITE_POSTOS = 5;
const TIMEOUT_MS = 5000;

export const MENSAGEM_SEM_POSTOS = 'Nenhum posto encontrado por perto.';
export const MENSAGEM_FALHA = 'Não foi possível buscar postos próximos agora.';

// Sugestao de posto para o cadastro do abastecimento (#30). Mesmo padrao do OrsService,
// mas aqui a falha do ORS nunca vira erro HTTP: o app segue com o campo manual.
@Injectable()
export class PostosProximosService {
  private readonly apiKey: string;
  private readonly logger = new Logger(PostosProximosService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ORS_API_KEY') ?? '';
  }

  async buscar(
    latitude: number,
    longitude: number,
  ): Promise<PostosProximosResult> {
    let response: Response;
    let data: OrsPoisResponse;

    try {
      response = await fetch('https://api.openrouteservice.org/pois', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          request: 'pois',
          geometry: {
            geojson: { type: 'Point', coordinates: [longitude, latitude] },
            buffer: RAIO_METROS,
          },
          filters: { category_ids: [CATEGORIA_POSTO] },
          limit: LIMITE_POSTOS,
          sortby: 'distance',
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      data = (await response.json()) as OrsPoisResponse;
    } catch (err: unknown) {
      this.logger.error(
        'Falha de rede ao buscar postos próximos: ' +
          (err instanceof Error ? err.message : 'erro desconhecido'),
      );
      return { postos: [], mensagem: MENSAGEM_FALHA };
    }

    if (!response.ok) {
      this.logger.error(
        'ORS pois retornou HTTP ' +
          response.status +
          ': ' +
          JSON.stringify(data),
      );
      return { postos: [], mensagem: MENSAGEM_FALHA };
    }

    const features = Array.isArray(data?.features) ? data.features : [];
    const postos = features
      .map((feature): PostoProximo | null => {
        const tags = feature?.properties?.osm_tags ?? {};
        const nome = (tags.name ?? tags.brand ?? '').trim();
        const distancia = Number(feature?.properties?.distance);
        if (!nome || !Number.isFinite(distancia)) return null;
        return { nome, distanciaMetros: Math.round(distancia) };
      })
      .filter((posto): posto is PostoProximo => posto !== null)
      .sort((a, b) => a.distanciaMetros - b.distanciaMetros)
      .slice(0, LIMITE_POSTOS);

    return { postos, mensagem: postos.length ? null : MENSAGEM_SEM_POSTOS };
  }
}
