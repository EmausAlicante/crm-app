import type { EspecializacionKey, MarcaKey, ScoreKey } from "./constants";

export type Company = {
  id: number;
  createdAt: string;
  updatedAt: string;

  empresa: string;
  nombreComercial: string | null;
  direccion: string | null;
  municipio: string | null;
  codigoPostal: string | null;
  provincia: string | null;
  latitud: number | null;
  longitud: number | null;
  web: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  contacto: string | null;
  cargo: string | null;
  logoUrl: string | null;

  clasificacion: string | null;

  estado: string;
  fechaUltimaVisita: string | null;
  proximaVisita: string | null;
  // Set together with proximaVisita once the visit has a confirmed time —
  // treated as a fixed appointment when planning a day's route.
  proximaVisitaHora: string | null;
  competidorActual: string | null;
  objeciones: string | null;
  observaciones: string | null;
  productoRecomendado: string | null;
  argumentario: string | null;
  zonaRuta: string | null;
  // Whether the company only takes visits in the morning/afternoon — the
  // route generator skips estimated (non-confirmed) stops outside that.
  jornada: string | null;

  cif: string | null;
  razonSocialFiscal: string | null;
  iban: string | null;
  banco: string | null;
  titularCuenta: string | null;
  formaPago: string | null;
  plazoPago: string | null;
  limiteCredito: string | null;
  documentoBancarioUrl: string | null;
  lopdFirmado: boolean;
  lopdFechaFirma: string | null;
  lopdDocumentoUrl: string | null;

  valoracion: number | null;
  scoreEstimadoIa: boolean;

  // --- Módulo NETEL ---
  netelScore: number | null;
  netelPrioridad: string | null; // 'A+' | 'A' | 'B' | 'C'
  netelEstrategiaEntrada: string | null;
  netelArgumento: string | null;
  netelObjecionProbable: string | null;
  netelRespuestaSugerida: string | null;
  netelPreguntaRecepcion: string | null;
  nivelInvestigacion: string | null;
  fuenteInvestigacion: string | null;
  fechaVerificacionInvestigacion: string | null;
} & Record<EspecializacionKey, boolean> &
  Record<MarcaKey, boolean> &
  Record<ScoreKey, number | null>;

export type CompanyInput = Omit<Company, "id" | "createdAt" | "updatedAt">;

export type Contact = {
  id: number;
  companyId: number;
  nombre: string;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  fotoUrl: string | null;
  esPrincipal: boolean;
  notas: string | null;
  createdAt: string;
  // --- Módulo NETEL: rol dentro del proceso de prospección ---
  rolNetel: string | null; // 'decisor_economico' | 'prescriptor_tecnico'
  linkedinUrl: string | null;
};

export type ContactInput = Omit<Contact, "id" | "createdAt">;

export const TIPOS_ACCION = ["Llamada", "Visita", "Email", "Seguimiento", "Presupuesto", "Otro"] as const;
export type TipoAccion = (typeof TIPOS_ACCION)[number];

export type PipelineAction = {
  id: number;
  companyId: number;
  tipo: string;
  titulo: string;
  fechaPrevista: string | null;
  // Optional time-of-day ("HH:MM:SS"). NULL means only the date matters —
  // treated as due all day for the due-actions alert.
  horaPrevista: string | null;
  completada: boolean;
  completedAt: string | null;
  notas: string | null;
  createdAt: string;
  // --- Módulo NETEL: registro de llamadas comerciales ---
  resultadoLlamada: string | null;
  motivoRechazo: string | null;
};

export type PipelineActionInput = Omit<PipelineAction, "id" | "createdAt" | "completedAt">;

export type Recording = {
  id: number;
  companyId: number;
  titulo: string | null;
  audioUrl: string | null;
  fecha: string;
  notas: string | null;
  transcript: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any | null;
  analyzedAt: string | null;
  analysisError: string | null;
};

export const EMAIL_CATEGORIES = ["Urgente", "Acción requerida", "Informativo", "Spam"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export type Email = {
  id: number;
  companyId: number | null;
  messageId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  bodyPreview: string | null;
  receivedAt: string | null;
  classification: string | null;
  classificationReason: string | null;
  linkReason: string | null;
  noteCreated: boolean;
  processedAt: string;
  companyName?: string | null;
  accountEmail: string | null;
};

export type EmailAccount = {
  id: number;
  label: string | null;
  email: string;
  imapHost: string;
  imapPort: number;
  activo: boolean;
  createdAt: string;
};

export const BILLING_FRECUENCIAS = ["Mensual", "Trimestral", "Semestral", "Anual"] as const;
export type BillingFrecuencia = (typeof BILLING_FRECUENCIAS)[number];

export type BillingPlan = {
  id: number;
  companyId: number;
  concepto: string;
  importe: number;
  frecuencia: BillingFrecuencia;
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
  createdAt: string;
  companyName?: string | null;
};

export const CHARGE_ESTADOS = ["Pendiente", "Emitida", "Cobrada", "Cancelada"] as const;
export type ChargeEstado = (typeof CHARGE_ESTADOS)[number];

export type BillingCharge = {
  id: number;
  billingPlanId: number;
  companyId: number;
  fechaPrevista: string;
  importe: number;
  concepto: string;
  estado: ChargeEstado;
  fechaEmision: string | null;
  fechaCobro: string | null;
  createdAt: string;
  companyName?: string | null;
};

export const DOCUMENT_CATEGORIAS = ["Catálogo", "Logo", "Imagen", "Otro"] as const;
export type DocumentCategoria = (typeof DOCUMENT_CATEGORIAS)[number];

export type CrmDocument = {
  id: number;
  nombre: string;
  categoria: DocumentCategoria;
  url: string;
  nombreArchivo: string | null;
  tamanoBytes: number | null;
  createdAt: string;
};
