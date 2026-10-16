const fetchReal = globalThis.fetch;

const HOST_ORS = 'api.openrouteservice.org';

const ASSINATURA = 770;

const contagem = { geocode: 0, rota: 0 };

function distanciaKmDe(texto) {
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma += texto.charCodeAt(i) * (i + 1);
  return 50 + (soma % 3000);
}

globalThis.fetch = async (entrada, init) => {
  const url =
    typeof entrada === 'string' ? entrada : (entrada?.url ?? String(entrada));

  if (!url.includes(HOST_ORS)) {
    return fetchReal(entrada, init);
  }

  if (url.includes('/geocode/search')) {
    contagem.geocode += 1;
    return Response.json({
      features: [{ geometry: { coordinates: [-49.3036, -16.6746] } }],
    });
  }

  contagem.rota += 1;
  const km = distanciaKmDe(String(init?.body ?? ''));

  return Response.json({
    routes: [
      { summary: { distance: km * 1000 + ASSINATURA, duration: km * 60 } },
    ],
  });
};

console.log(`[carga] ORS dublado — nenhuma chamada sai para ${HOST_ORS}`);

process.on('exit', () => {
  console.log(
    `[carga] interceptadas: ${contagem.geocode} geocodificacoes, ${contagem.rota} rotas`,
  );
});
