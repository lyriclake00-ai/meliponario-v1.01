CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  telefone TEXT,
  foto TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  reset_token TEXT,
  reset_token_expira TIMESTAMPTZ,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meliponarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  proprietario_id INTEGER NOT NULL REFERENCES users(id),
  localizacao TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  latitude REAL,
  longitude REAL,
  logo TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  codigo_convite TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membros (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  funcao TEXT NOT NULL DEFAULT 'MANEJADOR',
  status TEXT NOT NULL DEFAULT 'ativo',
  data_entrada TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colonias (
  id SERIAL PRIMARY KEY,
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  codigo TEXT NOT NULL,
  nome TEXT,
  especie TEXT,
  origem TEXT,
  data_aquisicao TEXT,
  data_formacao TEXT,
  localizacao TEXT,
  tipo_caixa TEXT,
  status TEXT NOT NULL DEFAULT 'Ativa',
  rainha TEXT,
  populacao TEXT,
  postura TEXT,
  mel TEXT,
  polen TEXT,
  espaco TEXT,
  pragas TEXT,
  umidade TEXT,
  estado_geral TEXT,
  foto_principal TEXT,
  observacoes TEXT,
  colonia_mae_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS visitas (
  id SERIAL PRIMARY KEY,
  colonia_id INTEGER NOT NULL REFERENCES colonias(id),
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  responsavel_id INTEGER REFERENCES users(id),
  responsavel_nome TEXT,
  data TEXT NOT NULL,
  hora TEXT,
  nota_geral INTEGER,
  populacao INTEGER,
  rainha TEXT,
  postura INTEGER,
  mel INTEGER,
  polen INTEGER,
  espaco TEXT,
  problemas TEXT,
  manejos TEXT,
  observacoes TEXT,
  fotos TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS producoes (
  id SERIAL PRIMARY KEY,
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  colonia_id INTEGER REFERENCES colonias(id),
  responsavel_id INTEGER REFERENCES users(id),
  responsavel_nome TEXT,
  produto TEXT NOT NULL,
  quantidade REAL NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'g',
  data TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS divisoes (
  id SERIAL PRIMARY KEY,
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  colonia_mae_id INTEGER NOT NULL REFERENCES colonias(id),
  colonia_filha_id INTEGER REFERENCES colonias(id),
  responsavel_id INTEGER REFERENCES users(id),
  responsavel_nome TEXT,
  data TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lembretes (
  id SERIAL PRIMARY KEY,
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  colonia_id INTEGER REFERENCES colonias(id),
  responsavel_id INTEGER REFERENCES users(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data TEXT NOT NULL,
  prioridade TEXT DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_dismissals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  meliponario_id INTEGER NOT NULL REFERENCES meliponarios(id),
  chave TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_dismiss UNIQUE (user_id, meliponario_id, chave)
);

CREATE TABLE IF NOT EXISTS auditorias (
  id SERIAL PRIMARY KEY,
  meliponario_id INTEGER REFERENCES meliponarios(id),
  user_id INTEGER REFERENCES users(id),
  user_nome TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id INTEGER,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membros_user ON membros(user_id);
CREATE INDEX IF NOT EXISTS idx_membros_meli ON membros(meliponario_id);
CREATE INDEX IF NOT EXISTS idx_colonias_meli ON colonias(meliponario_id);
CREATE INDEX IF NOT EXISTS idx_visitas_meli_data ON visitas(meliponario_id, data);
CREATE INDEX IF NOT EXISTS idx_visitas_colonia_data ON visitas(colonia_id, data);
CREATE INDEX IF NOT EXISTS idx_producoes_meli_data ON producoes(meliponario_id, data);
CREATE INDEX IF NOT EXISTS idx_lembretes_meli_data ON lembretes(meliponario_id, data);
CREATE INDEX IF NOT EXISTS idx_auditorias_meli_data ON auditorias(meliponario_id, data_hora);
