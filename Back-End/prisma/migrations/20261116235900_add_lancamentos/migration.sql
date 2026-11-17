CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

CREATE TYPE "CategoriaLancamento" AS ENUM (
  'FRETE', 'PEDAGIO', 'MANUTENCAO',
  'ALIMENTACAO', 'PERNOITE', 'OUTROS'
);

CREATE TABLE lancamentos (
  id           SERIAL PRIMARY KEY,
  tipo         "TipoLancamento"      NOT NULL,
  categoria    "CategoriaLancamento" NOT NULL,
  valor        DECIMAL(10, 2)        NOT NULL CHECK (valor > 0),
  descricao    TEXT,
  data         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "userId"     INTEGER               NOT NULL REFERENCES usuarios(id),
  "caminhaoId" INTEGER               NOT NULL REFERENCES "Caminhao"(id),
  "createdAt"  TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX lancamentos_userId_idx     ON lancamentos ("userId");
CREATE INDEX lancamentos_caminhaoId_idx ON lancamentos ("caminhaoId");
CREATE INDEX lancamentos_data_idx       ON lancamentos (data);
