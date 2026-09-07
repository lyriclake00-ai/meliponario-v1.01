import {
  pgTable,
  serial,
  integer,
  text,
  real,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ============ USERS ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  telefone: text("telefone"),
  foto: text("foto"),
  status: text("status").notNull().default("ativo"),
  resetToken: text("reset_token"),
  resetTokenExpira: ts("reset_token_expira"),
  ultimoAcesso: ts("ultimo_acesso"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ============ MELIPONARIOS ============
export const meliponarios = pgTable("meliponarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  proprietarioId: integer("proprietario_id")
    .notNull()
    .references(() => users.id),
  localizacao: text("localizacao"),
  cidade: text("cidade"),
  estado: text("estado"),
  pais: text("pais").default("Brasil"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  logo: text("logo"),
  timezone: text("timezone").default("America/Sao_Paulo"),
  codigoConvite: text("codigo_convite"),
  status: text("status").notNull().default("ativo"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ============ MEMBROS ============
export const membros = pgTable("membros", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  funcao: text("funcao").notNull().default("MANEJADOR"), // ADMIN, MANEJADOR, VISUALIZADOR
  status: text("status").notNull().default("ativo"), // ativo, pendente, recusado
  dataEntrada: ts("data_entrada"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ============ COLONIAS ============
export const colonias = pgTable("colonias", {
  id: serial("id").primaryKey(),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  codigo: text("codigo").notNull(),
  nome: text("nome"),
  especie: text("especie"),
  origem: text("origem"),
  dataAquisicao: text("data_aquisicao"),
  dataFormacao: text("data_formacao"),
  localizacao: text("localizacao"),
  tipoCaixa: text("tipo_caixa"),
  status: text("status").notNull().default("Ativa"),
  rainha: text("rainha"),
  populacao: text("populacao"),
  postura: text("postura"),
  mel: text("mel"),
  polen: text("polen"),
  espaco: text("espaco"),
  pragas: text("pragas"),
  umidade: text("umidade"),
  estadoGeral: text("estado_geral"),
  fotoPrincipal: text("foto_principal"),
  observacoes: text("observacoes"),
  coloniaMaeId: integer("colonia_mae_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

// ============ VISITAS ============
export const visitas = pgTable("visitas", {
  id: serial("id").primaryKey(),
  coloniaId: integer("colonia_id")
    .notNull()
    .references(() => colonias.id),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  responsavelId: integer("responsavel_id").references(() => users.id),
  responsavelNome: text("responsavel_nome"), // fallback "Responsável não informado"
  data: text("data").notNull(),
  hora: text("hora"),
  notaGeral: integer("nota_geral"),
  populacao: integer("populacao"),
  rainha: text("rainha"),
  postura: integer("postura"),
  mel: integer("mel"),
  polen: integer("polen"),
  espaco: text("espaco"),
  problemas: text("problemas"), // comma-separated
  manejos: text("manejos"), // comma-separated
  observacoes: text("observacoes"),
  fotos: text("fotos"), // JSON array of data urls
  createdBy: integer("created_by").references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

// ============ PRODUCAO ============
export const producoes = pgTable("producoes", {
  id: serial("id").primaryKey(),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  coloniaId: integer("colonia_id").references(() => colonias.id),
  responsavelId: integer("responsavel_id").references(() => users.id),
  responsavelNome: text("responsavel_nome"),
  produto: text("produto").notNull(), // mel, polen, propolis, outros
  quantidade: real("quantidade").notNull(),
  unidade: text("unidade").notNull().default("g"),
  data: text("data").notNull(),
  observacoes: text("observacoes"),
  createdAt: ts("created_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

// ============ DIVISOES ============
export const divisoes = pgTable("divisoes", {
  id: serial("id").primaryKey(),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  coloniaMaeId: integer("colonia_mae_id")
    .notNull()
    .references(() => colonias.id),
  coloniaFilhaId: integer("colonia_filha_id").references(() => colonias.id),
  responsavelId: integer("responsavel_id").references(() => users.id),
  responsavelNome: text("responsavel_nome"),
  data: text("data").notNull(),
  observacoes: text("observacoes"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ============ LEMBRETES ============
export const lembretes = pgTable("lembretes", {
  id: serial("id").primaryKey(),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  coloniaId: integer("colonia_id").references(() => colonias.id),
  responsavelId: integer("responsavel_id").references(() => users.id),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  data: text("data").notNull(),
  prioridade: text("prioridade").default("media"),
  status: text("status").notNull().default("pendente"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

// ============ NOTIFICAÇÕES DISPENSADAS ============
// Para cada (user, meliponario, chave da notificação), guardamos quando o
// usuário dispensou aquela notificação. A chave é determinística
// (ex.: "col:5:sem_visita") e reaproveitada em todas as visualizações
// (dashboard, "Seu Meliponário", etc.).
export const notificationDismissals = pgTable("notification_dismissals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  meliponarioId: integer("meliponario_id")
    .notNull()
    .references(() => meliponarios.id),
  chave: text("chave").notNull(),
  dismissedAt: ts("dismissed_at").notNull().defaultNow(),
});

export const notificationDismissalUniqueIndex = uniqueIndex("uq_notification_dismiss").on(
  notificationDismissals.userId,
  notificationDismissals.meliponarioId,
  notificationDismissals.chave,
);

// ============ HISTORICO / AUDITORIA ============
export const auditorias = pgTable("auditorias", {
  id: serial("id").primaryKey(),
  meliponarioId: integer("meliponario_id").references(() => meliponarios.id),
  userId: integer("user_id").references(() => users.id),
  userNome: text("user_nome"),
  acao: text("acao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: integer("entidade_id"),
  descricao: text("descricao"),
  dataHora: ts("data_hora").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Meliponario = typeof meliponarios.$inferSelect;
export type Membro = typeof membros.$inferSelect;
export type Colonia = typeof colonias.$inferSelect;
export type Visita = typeof visitas.$inferSelect;
export type Producao = typeof producoes.$inferSelect;
export type Divisao = typeof divisoes.$inferSelect;
export type Lembrete = typeof lembretes.$inferSelect;
export type Auditoria = typeof auditorias.$inferSelect;
