CREATE TABLE IF NOT EXISTS companies (
  id                  SERIAL PRIMARY KEY,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  empresa             TEXT NOT NULL,
  nombre_comercial    TEXT,
  direccion           TEXT,
  municipio           TEXT,
  codigo_postal       TEXT,
  provincia           TEXT,
  latitud             DOUBLE PRECISION,
  longitud            DOUBLE PRECISION,
  web                 TEXT,
  email               TEXT,
  telefono            TEXT,
  contacto            TEXT,
  cargo               TEXT,

  clasificacion       TEXT,

  esp_comunidades     BOOLEAN NOT NULL DEFAULT false,
  esp_industrial      BOOLEAN NOT NULL DEFAULT false,
  esp_parking         BOOLEAN NOT NULL DEFAULT false,
  esp_barreras        BOOLEAN NOT NULL DEFAULT false,
  esp_control_accesos BOOLEAN NOT NULL DEFAULT false,
  esp_rfid            BOOLEAN NOT NULL DEFAULT false,
  esp_lpr             BOOLEAN NOT NULL DEFAULT false,
  esp_automatismos    BOOLEAN NOT NULL DEFAULT false,

  marca_nice          BOOLEAN NOT NULL DEFAULT false,
  marca_faac          BOOLEAN NOT NULL DEFAULT false,
  marca_bft           BOOLEAN NOT NULL DEFAULT false,
  marca_came          BOOLEAN NOT NULL DEFAULT false,
  marca_hormann       BOOLEAN NOT NULL DEFAULT false,
  marca_motorline     BOOLEAN NOT NULL DEFAULT false,
  marca_erreka        BOOLEAN NOT NULL DEFAULT false,
  marca_gibidi        BOOLEAN NOT NULL DEFAULT false,
  marca_beninca       BOOLEAN NOT NULL DEFAULT false,
  marca_roger         BOOLEAN NOT NULL DEFAULT false,
  marca_dea           BOOLEAN NOT NULL DEFAULT false,
  marca_otras         BOOLEAN NOT NULL DEFAULT false,

  score_mantenimiento     INTEGER,
  score_comunidades       INTEGER,
  score_control_accesos   INTEGER,
  score_sat_propio        INTEGER,
  score_tamano            INTEGER,
  score_delegaciones      INTEGER,
  score_marcas            INTEGER,

  estado               TEXT NOT NULL DEFAULT 'Pendiente',
  fecha_ultima_visita  DATE,
  proxima_visita       DATE,
  competidor_actual    TEXT,
  objeciones           TEXT,
  observaciones        TEXT,
  producto_recomendado TEXT,
  argumentario         TEXT,
  zona_ruta            TEXT
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_estado ON companies(estado);
CREATE INDEX IF NOT EXISTS idx_companies_zona ON companies(zona_ruta);
CREATE INDEX IF NOT EXISTS idx_companies_clasificacion ON companies(clasificacion);

CREATE TABLE IF NOT EXISTS contacts (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  cargo         TEXT,
  email         TEXT,
  telefono      TEXT,
  foto_url      TEXT,
  es_principal  BOOLEAN NOT NULL DEFAULT false,
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

CREATE TABLE IF NOT EXISTS pipeline_actions (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'Seguimiento',
  titulo          TEXT NOT NULL,
  fecha_prevista  DATE,
  completada      BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_company ON pipeline_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_completada ON pipeline_actions(completada);
CREATE INDEX IF NOT EXISTS idx_pipeline_fecha ON pipeline_actions(fecha_prevista);

-- Optional time-of-day for an action ("llamar a las 10:00"). NULL means only
-- the date matters — the due-actions popup treats those as due all day.
ALTER TABLE pipeline_actions ADD COLUMN IF NOT EXISTS hora_prevista TIME;

-- Freeform, timestamped notes on a company — separate from the single
-- overwritable "observaciones" field, so nothing gets lost when a new note
-- is added.
CREATE TABLE IF NOT EXISTS company_notes (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_notes_company ON company_notes(company_id);

CREATE TABLE IF NOT EXISTS recordings (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  titulo      TEXT,
  audio_url   TEXT,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas       TEXT
);
CREATE INDEX IF NOT EXISTS idx_recordings_company ON recordings(company_id);

-- Meeting agent: audio_url made nullable (notes-only meetings allowed) + transcript/AI analysis columns.
ALTER TABLE recordings ALTER COLUMN audio_url DROP NOT NULL;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS analysis_error TEXT;

-- Legal-Financiero tab: datos fiscales/bancarios y cumplimiento LOPD
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cif TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS razon_social_fiscal TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS titular_cuenta TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS forma_pago TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plazo_pago TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS limite_credito TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documento_bancario_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lopd_firmado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lopd_fecha_firma DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lopd_documento_url TEXT;

-- Email agent
CREATE TABLE IF NOT EXISTS emails (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  message_id      TEXT UNIQUE,
  from_email      TEXT,
  from_name       TEXT,
  subject         TEXT,
  body_preview    TEXT,
  received_at     TIMESTAMPTZ,
  classification  TEXT, -- Urgente | Acción requerida | Informativo | Spam
  classification_reason TEXT,
  link_reason     TEXT,
  note_created    BOOLEAN NOT NULL DEFAULT false,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emails_company ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_classification ON emails(classification);
CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at);

-- Which inbox a synced email came from, for setups with multiple accounts
ALTER TABLE emails ADD COLUMN IF NOT EXISTS account_email TEXT;

-- Email agent: IMAP accounts configurable from the UI instead of fixed env vars,
-- so more than one inbox can be synced (and accounts can be added/removed at runtime).
CREATE TABLE IF NOT EXISTS email_accounts (
  id            SERIAL PRIMARY KEY,
  label         TEXT,
  email         TEXT NOT NULL,
  imap_host     TEXT NOT NULL DEFAULT 'imap.gmail.com',
  imap_port     INTEGER NOT NULL DEFAULT 993,
  imap_password TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_accounts_activo ON email_accounts(activo);

-- App-wide configuration: single row, logo/branding + timezone used for date/time display.
CREATE TABLE IF NOT EXISTS app_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  logo_url    TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Europe/Madrid',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Editable catalogs (forma de pago, plazo de pago...) so options can be added/removed from the UI
-- instead of being hardcoded, while existing company records keep whatever value they already had.
CREATE TABLE IF NOT EXISTS catalog_options (
  id          SERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,
  valor       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, valor)
);
CREATE INDEX IF NOT EXISTS idx_catalog_options_tipo ON catalog_options(tipo);

INSERT INTO catalog_options (tipo, valor) VALUES
  ('forma_pago', 'Transferencia'),
  ('forma_pago', 'Contado'),
  ('forma_pago', 'Domiciliación bancaria'),
  ('forma_pago', 'Pagaré'),
  ('plazo_pago', 'Al contado'),
  ('plazo_pago', '30 días'),
  ('plazo_pago', '60 días'),
  ('plazo_pago', '90 días')
ON CONFLICT (tipo, valor) DO NOTHING;

-- Recurring billing: a plan defines a recurring amount/concept for a company starting on a date,
-- optionally ending on another; charges are the individual due "cuotas" generated from active plans.
CREATE TABLE IF NOT EXISTS billing_plans (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  concepto      TEXT NOT NULL,
  importe       NUMERIC(10,2) NOT NULL,
  frecuencia    TEXT NOT NULL DEFAULT 'Mensual',
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_plans_company ON billing_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_activo ON billing_plans(activo);

CREATE TABLE IF NOT EXISTS billing_charges (
  id              SERIAL PRIMARY KEY,
  billing_plan_id INTEGER NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fecha_prevista  DATE NOT NULL,
  importe         NUMERIC(10,2) NOT NULL,
  concepto        TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'Pendiente',
  fecha_emision   DATE,
  fecha_cobro     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (billing_plan_id, fecha_prevista)
);
CREATE INDEX IF NOT EXISTS idx_billing_charges_company ON billing_charges(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_estado ON billing_charges(estado);
CREATE INDEX IF NOT EXISTS idx_billing_charges_fecha ON billing_charges(fecha_prevista);

-- AI pre-scoring: marks the score fields as an unconfirmed AI estimate (vs. a
-- manually entered score) so the UI can flag it until the sales rep confirms it.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS score_estimado_ia BOOLEAN NOT NULL DEFAULT false;

-- Next-best-action agent: one AI-written briefing per calendar day, cached by
-- (day, fingerprint-of-candidate-list) so repeated same-state dashboard visits
-- reuse it, but it regenerates the moment the actual situation changes
-- (action completed/added/rescheduled) instead of staying frozen all day.
CREATE TABLE IF NOT EXISTS daily_digest (
  id          SERIAL PRIMARY KEY,
  fecha       DATE NOT NULL UNIQUE,
  resumen     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE daily_digest DROP CONSTRAINT IF EXISTS daily_digest_fecha_key;
ALTER TABLE daily_digest ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_digest_fecha_fingerprint_key'
  ) THEN
    ALTER TABLE daily_digest ADD CONSTRAINT daily_digest_fecha_fingerprint_key UNIQUE (fecha, fingerprint);
  END IF;
END $$;

-- Shared document library: catalogs, logos, images, etc. not tied to a single company.
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  categoria     TEXT NOT NULL DEFAULT 'Otro',
  url           TEXT NOT NULL,
  nombre_archivo TEXT,
  tamano_bytes  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_categoria ON documents(categoria);

-- Single 0-5 star rating, replacing the old "fill in 4+ of 7 fields or it doesn't
-- count" gated scoring as the primary lead rating. Set directly by the AI (see
-- lib/ai/leadScoring.ts) or manually — no partial/incomplete state anymore.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS valoracion NUMERIC(2,1);

-- Editable weekly route schedule (which zone gets visited which day), so it's no
-- longer a fixed plan baked into the code — configurable from Configuración.
CREATE TABLE IF NOT EXISTS ruta_dias (
  id      SERIAL PRIMARY KEY,
  dia     TEXT NOT NULL UNIQUE,
  zona    TEXT,
  notas   TEXT,
  orden   INTEGER NOT NULL DEFAULT 0
);
INSERT INTO ruta_dias (dia, zona, notas, orden) VALUES
  ('Lunes', 'Zona Oeste', 'Las Rozas, Majadahonda, Pozuelo, Boadilla del Monte', 1),
  ('Martes', 'Zona Norte', 'Alcobendas, San Sebastián de los Reyes, Tres Cantos', 2),
  ('Miércoles', 'Zona Sur', 'Getafe, Leganés, Fuenlabrada', 3),
  ('Jueves', 'Corredor del Henares', 'Coslada, San Fernando de Henares, Torrejón de Ardoz, Alcalá de Henares', 4),
  ('Viernes', NULL, 'Seguimiento telefónico, propuestas, administración', 5)
ON CONFLICT (dia) DO NOTHING;

-- Editable pipeline phases (Kanban columns / company "estado"), so the fixed
-- 7-stage list baked into the code can be renamed, reordered, added to, or
-- removed from Configuración instead.
CREATE TABLE IF NOT EXISTS pipeline_estados (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  orden  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO pipeline_estados (nombre, orden) VALUES
  ('Pendiente', 1),
  ('Contactado', 2),
  ('Visita programada', 3),
  ('Visitado', 4),
  ('Negociación', 5),
  ('Cliente', 6),
  ('Descartado', 7)
ON CONFLICT (nombre) DO NOTHING;

-- Per-phase color for the Kanban board and Estado badges, so phases can be told
-- apart at a glance (e.g. a "No interesado" phase in red). Only seeds the
-- original hand-picked hues the very first time the column is added — after
-- that this block is a no-op, so it never clobbers colors the user picks later.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'pipeline_estados' AND column_name = 'color'
  ) THEN
    ALTER TABLE pipeline_estados ADD COLUMN color TEXT NOT NULL DEFAULT '#64748b';
    UPDATE pipeline_estados SET color = '#0ea5e9' WHERE nombre = 'Contactado';
    UPDATE pipeline_estados SET color = '#6366f1' WHERE nombre = 'Visita programada';
    UPDATE pipeline_estados SET color = '#f59e0b' WHERE nombre = 'Visitado';
    UPDATE pipeline_estados SET color = '#a855f7' WHERE nombre = 'Negociación';
    UPDATE pipeline_estados SET color = '#10b981' WHERE nombre = 'Cliente';
    UPDATE pipeline_estados SET color = '#ef4444' WHERE nombre = 'Descartado';
  END IF;
END $$;

-- Optional time-of-day for "Próxima visita", so a confirmed appointment
-- (date + time) can anchor the day's route plan instead of just being a
-- reminder date. NULL means "no confirmed time yet".
ALTER TABLE companies ADD COLUMN IF NOT EXISTS proxima_visita_hora TIME;

-- Whether the company only receives visits in the morning/afternoon, so the
-- route generator doesn't schedule an estimated stop when they'd be closed.
-- NULL/'completa' means no restriction.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS jornada TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Address the daily digest email (overdue/due-today pipeline actions) gets sent to.
-- NULL means the digest cron no-ops even if RESEND_API_KEY is configured.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS notify_email TEXT;

-- User-assigned colors for free-text clasificacion tags (e.g. "No interesado" -> red)
-- so they can be scanned at a glance in the Empresas list. Tags without a row here
-- just render in a neutral default color.
CREATE TABLE IF NOT EXISTS tag_colors (
  id     SERIAL PRIMARY KEY,
  tag    TEXT NOT NULL UNIQUE,
  color  TEXT NOT NULL DEFAULT '#64748b'
);

-- Cooldown tracking for paid AI actions (src/lib/rateLimit.ts), so a UI bug or
-- accidental double-click can't fire the same action back-to-back.
CREATE TABLE IF NOT EXISTS rate_limits (
  key       TEXT PRIMARY KEY,
  last_run  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access gate (src/lib/auth.ts): one-time codes emailed/texted to the owner's
-- registered contact info instead of a static shared code — nothing to
-- remember or leak. Destinations live in app_settings (single-row app-wide
-- setting, like the logo/timezone). access_code_hash is a leftover column
-- from an earlier static-code design, unused now but harmless to leave.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS access_code_hash TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS otp_email TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS otp_phone TEXT;

-- Server-validated sessions (checked in proxy.ts on every request) rather
-- than a self-contained signed cookie, so a logout takes effect immediately
-- instead of waiting out a token's lifetime.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- An earlier iteration of this feature had a per-user sessions table with a
-- NOT NULL user_id FK; the design changed before shipping. Idempotent no-op
-- on fresh installs, cleans up the column (and its FK) if it's still there.
ALTER TABLE sessions DROP COLUMN IF EXISTS user_id;

-- One-shot login codes: requesting a new one invalidates the previous (only
-- ever one row), short expiry, single use.
CREATE TABLE IF NOT EXISTS login_codes (
  code_hash   TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Módulo NETEL: prospección comercial de distribuidores
-- (ver informe-crm-app.md / propuesta-modulo-netel.md)
-- ============================================================

-- Mercados que faltaban junto a los esp_* ya existentes (comunidades/industrial/parking/
-- barreras/control_accesos/rfid/lpr/automatismos). Los "perfiles" (fabricante, instalador,
-- mantenedor, SAT, distribuidor, integrador) ya se cubren con clasificacion (texto/etiquetas);
-- solo faltan "Seguridad" y "Facility Services" como etiquetas nuevas, sin columna propia.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS esp_garajes         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS esp_empresas        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS esp_administradores BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS esp_residencial     BOOLEAN NOT NULL DEFAULT false;

-- Inteligencia NETEL propiamente dicha
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_score                INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_prioridad             VARCHAR(5);  -- 'A+' | 'A' | 'B' | 'C'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_estrategia_entrada    TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_argumento             TEXT;  -- distinto de "argumentario"
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_objecion_probable     TEXT;  -- distinto de "objeciones"
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_respuesta_sugerida    TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS netel_pregunta_recepcion    TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nivel_investigacion         VARCHAR(15); -- Baja/Media/Media-Alta/Alta
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fuente_investigacion        TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fecha_verificacion_investig DATE;

CREATE INDEX IF NOT EXISTS idx_companies_netel_prioridad ON companies(netel_prioridad);

-- Personas: rol dentro del proceso NETEL, reutilizando la tabla contacts existente
-- en vez de crear decisor_nombre/decisor_email sueltos en companies.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS rol_netel    TEXT;  -- 'decisor_economico' | 'prescriptor_tecnico'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Resultado de llamada / motivo de rechazo: se añaden a pipeline_actions, que ya
-- es el histórico de acciones por empresa — no hace falta tabla nueva.
ALTER TABLE pipeline_actions ADD COLUMN IF NOT EXISTS resultado_llamada TEXT;
ALTER TABLE pipeline_actions ADD COLUMN IF NOT EXISTS motivo_rechazo    TEXT;
