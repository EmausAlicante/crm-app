const ZONE_MAP: Record<string, string> = {
  "las rozas": "Zona Oeste",
  "las rozas de madrid": "Zona Oeste",
  "villaviciosa de odon": "Zona Oeste",
  "navalcarnero": "Zona Oeste",
  "collado villalba": "Zona Oeste",
  "santa maria de la alameda": "Zona Oeste",
  "boadilla del monte": "Zona Oeste",
  "majadahonda": "Zona Oeste",
  "pozuelo de alarcon": "Zona Oeste",
  "alpedrete": "Zona Oeste",
  "valdemorillo": "Zona Oeste",
  "guadarrama": "Zona Oeste",

  "san sebastian de los reyes": "Zona Norte",
  "alcobendas": "Zona Norte",
  "tres cantos": "Zona Norte",

  "fuenlabrada": "Zona Sur",
  "pinto": "Zona Sur",
  "alcorcon": "Zona Sur",
  "mostoles": "Zona Sur",
  "humanes de madrid": "Zona Sur",
  "getafe": "Zona Sur",
  "leganes": "Zona Sur",
  "valdemoro": "Zona Sur",
  "arroyomolinos": "Zona Sur",

  "coslada": "Corredor del Henares",
  "rivas vaciamadrid": "Corredor del Henares",
  "arganda del rey": "Corredor del Henares",
  "alcala de henares": "Corredor del Henares",
  "san fernando de henares": "Corredor del Henares",
  "paracuellos de jarama": "Corredor del Henares",
  "paracuellos del jarama": "Corredor del Henares",
  "cobena": "Corredor del Henares",
  "torrejon de ardoz": "Corredor del Henares",

  "madrid": "Madrid Centro",
  "tetuan": "Madrid Centro",
  "villaverde": "Madrid Centro",
  "fuencarral-el pardo": "Madrid Centro",
};

function stripAccents(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function inferZona(municipio: string | null | undefined, provincia: string | null | undefined): string | null {
  if (!municipio) return null;
  if (provincia && stripAccents(provincia.toLowerCase().trim()) !== "madrid") return "Otra Provincia";
  const key = stripAccents(municipio.toLowerCase().trim());
  return ZONE_MAP[key] ?? "Otra Provincia";
}
