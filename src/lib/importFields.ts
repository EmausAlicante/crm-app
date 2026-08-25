export type ImportField =
  | "empresa"
  | "nombreComercial"
  | "direccion"
  | "municipio"
  | "codigoPostal"
  | "provincia"
  | "web"
  | "email"
  | "telefono"
  | "contacto"
  | "cargo"
  | "clasificacion"
  | "observaciones"
  // --- Campos que ya existían en companies, sin soporte previo en el importador ---
  | "valoracion"
  | "estado"
  | "fechaUltimaVisita"
  | "proximaVisita"
  | "competidorActual"
  | "objeciones"
  | "productoRecomendado"
  | "argumentario"
  | "zonaRuta"
  // --- Texto libre a parsear hacia los booleanos esp_*/marca_* (ver importParse.ts) ---
  | "especializacion"
  | "marcas"
  // --- Módulo NETEL ---
  | "netelPrioridad"
  | "netelScore"
  | "netelEstrategiaEntrada"
  | "netelArgumento"
  | "netelObjecionProbable"
  | "netelRespuestaSugerida"
  | "netelPreguntaRecepcion"
  | "nivelInvestigacion"
  | "fuenteInvestigacion"
  | "fechaVerificacionInvestigacion"
  // --- Personas NETEL: van a la tabla contacts, no a companies ---
  | "decisorEconomico"
  | "prescriptorTecnico";

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean }[] = [
  { key: "empresa", label: "Empresa", required: true },
  { key: "nombreComercial", label: "Nombre comercial" },
  { key: "direccion", label: "Dirección" },
  { key: "municipio", label: "Municipio / Ciudad" },
  { key: "codigoPostal", label: "Código postal" },
  { key: "provincia", label: "Provincia" },
  { key: "web", label: "Web" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  { key: "contacto", label: "Persona de contacto" },
  { key: "cargo", label: "Cargo" },
  { key: "clasificacion", label: "Clasificación" },
  { key: "observaciones", label: "Notas / Observaciones" },

  { key: "valoracion", label: "Valoración (0-5)" },
  { key: "estado", label: "Estado" },
  { key: "fechaUltimaVisita", label: "Fecha última visita" },
  { key: "proximaVisita", label: "Próxima visita" },
  { key: "competidorActual", label: "Competidor actual" },
  { key: "objeciones", label: "Objeciones" },
  { key: "productoRecomendado", label: "Producto recomendado" },
  { key: "argumentario", label: "Argumentario" },
  { key: "zonaRuta", label: "Zona de ruta" },

  { key: "especializacion", label: "Especialización (texto libre → se traduce a categorías)" },
  { key: "marcas", label: "Marcas (texto libre → se traduce a marcas conocidas)" },

  { key: "netelPrioridad", label: "Prioridad NETEL" },
  { key: "netelScore", label: "Score NETEL" },
  { key: "netelEstrategiaEntrada", label: "Estrategia de entrada" },
  { key: "netelArgumento", label: "Argumento NETEL personalizado" },
  { key: "netelObjecionProbable", label: "Objeción probable NETEL" },
  { key: "netelRespuestaSugerida", label: "Respuesta sugerida NETEL" },
  { key: "netelPreguntaRecepcion", label: "Pregunta para recepción" },
  { key: "nivelInvestigacion", label: "Nivel de investigación" },
  { key: "fuenteInvestigacion", label: "Fuente de investigación" },
  { key: "fechaVerificacionInvestigacion", label: "Fecha verificación investigación" },

  { key: "decisorEconomico", label: "Decisor económico (nombre)" },
  { key: "prescriptorTecnico", label: "Prescriptor técnico (nombre)" },
];

export type ParsedFile = {
  headers: string[];
  rows: string[][];
};

export type MappedRow = Partial<Record<ImportField, string>>;

export type ImportAction = "new" | "update" | "skip";

export type FieldDiff = { field: ImportField; label: string; current: string; incoming: string };

export type ImportPreviewItem = {
  rowIndex: number;
  data: MappedRow;
  action: ImportAction;
  matchedId: number | null;
  matchedName: string | null;
  reason: string;
  conflicts: FieldDiff[];
};
