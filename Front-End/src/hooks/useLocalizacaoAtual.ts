import * as Location from "expo-location";
import { useEffect, useState } from "react";

export type StatusLocalizacao = "inativa" | "buscando" | "capturada" | "negada" | "indisponivel";

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

// Posicao do aparelho para registrar onde o abastecimento foi feito (#30).
// Recusa ou falha nunca bloqueiam o cadastro: o motorista segue preenchendo o posto a mao.
export function useLocalizacaoAtual(ativa: boolean) {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [status, setStatus] = useState<StatusLocalizacao>("inativa");

  useEffect(() => {
    if (!ativa) return;
    let montado = true;

    (async () => {
      setStatus("buscando");
      try {
        const permissao = await Location.requestForegroundPermissionsAsync();
        if (!permissao?.granted) {
          if (montado) setStatus("negada");
          return;
        }

        const posicao = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!montado) return;
        setCoordenadas({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        });
        setStatus("capturada");
      } catch {
        if (montado) setStatus("indisponivel");
      }
    })();

    return () => {
      montado = false;
    };
  }, [ativa]);

  return { coordenadas, status };
}
