// Catálogos de comercio exterior (México) para el simulador de pedimentos.
// Datos ilustrativos con fines educativos. No son una fuente oficial.
// Referencias conceptuales: TIGIE, Ley Aduanera, Reglas Generales de Comercio Exterior, VUCEM.

// Aduanas de despacho (clave de 3 dígitos + nombre y entidad).
export const ADUANAS = [
  { clave: '240', nombre: 'Nuevo Laredo', entidad: 'Tamaulipas', tipo: 'Terrestre' },
  { clave: '070', nombre: 'Ciudad Juárez', entidad: 'Chihuahua', tipo: 'Terrestre' },
  { clave: '430', nombre: 'Tijuana', entidad: 'Baja California', tipo: 'Terrestre' },
  { clave: '110', nombre: 'Mexicali', entidad: 'Baja California', tipo: 'Terrestre' },
  { clave: '280', nombre: 'Nogales', entidad: 'Sonora', tipo: 'Terrestre' },
  { clave: '160', nombre: 'Manzanillo', entidad: 'Colima', tipo: 'Marítima' },
  { clave: '800', nombre: 'Lázaro Cárdenas', entidad: 'Michoacán', tipo: 'Marítima' },
  { clave: '650', nombre: 'Veracruz', entidad: 'Veracruz', tipo: 'Marítima' },
  { clave: '200', nombre: 'Altamira', entidad: 'Tamaulipas', tipo: 'Marítima' },
  { clave: '470', nombre: 'AICM (Aeropuerto Cd. de México)', entidad: 'Ciudad de México', tipo: 'Aérea' },
  { clave: '750', nombre: 'Aeropuerto de Toluca', entidad: 'Estado de México', tipo: 'Aérea' },
  { clave: '530', nombre: 'Guadalajara', entidad: 'Jalisco', tipo: 'Aérea / Interior' },
]

// Claves de pedimento. op: 'IMP' importación, 'EXP' exportación, 'AMB' ambas.
export const CLAVES_PEDIMENTO = [
  { clave: 'A1', desc: 'Importación / Exportación definitiva', op: 'AMB' },
  { clave: 'A3', desc: 'Regularización de mercancías', op: 'IMP' },
  { clave: 'C1', desc: 'Importación definitiva a la franja/región fronteriza', op: 'IMP' },
  { clave: 'IN', desc: 'Temporal de importación (IMMEX) — bienes a retornar', op: 'IMP' },
  { clave: 'AF', desc: 'Importación temporal de activo fijo (IMMEX)', op: 'IMP' },
  { clave: 'BP', desc: 'Depósito fiscal — entrada a almacén general', op: 'IMP' },
  { clave: 'D1', desc: 'Retorno de exportación temporal', op: 'EXP' },
  { clave: 'H1', desc: 'Retorno de importación temporal (mismo estado)', op: 'EXP' },
  { clave: 'F4', desc: 'Cambio de régimen de temporal a definitivo', op: 'IMP' },
]

// Regímenes aduaneros.
export const REGIMENES = [
  { clave: 'IMD', desc: 'Definitivo de importación' },
  { clave: 'EXD', desc: 'Definitivo de exportación' },
  { clave: 'ITR', desc: 'Temporal de importación para retornar en el mismo estado' },
  { clave: 'ITE', desc: 'Temporal de importación para elaboración/transformación (IMMEX)' },
  { clave: 'ETR', desc: 'Temporal de exportación para retornar en el mismo estado' },
  { clave: 'ETE', desc: 'Temporal de exportación para elaboración/transformación' },
  { clave: 'DFI', desc: 'Depósito fiscal' },
  { clave: 'RFE', desc: 'Recinto fiscalizado estratégico' },
  { clave: 'TRA', desc: 'Tránsito de mercancías' },
]

// Incoterms 2020. incrementables: indica si el flete/seguro internacional
// normalmente se suma al valor en aduana en una importación.
export const INCOTERMS = [
  { clave: 'EXW', desc: 'En fábrica', fleteIncrementa: true, seguroIncrementa: true },
  { clave: 'FCA', desc: 'Libre transportista', fleteIncrementa: true, seguroIncrementa: true },
  { clave: 'FAS', desc: 'Libre al costado del buque', fleteIncrementa: true, seguroIncrementa: true },
  { clave: 'FOB', desc: 'Libre a bordo', fleteIncrementa: true, seguroIncrementa: true },
  { clave: 'CFR', desc: 'Costo y flete', fleteIncrementa: false, seguroIncrementa: true },
  { clave: 'CIF', desc: 'Costo, seguro y flete', fleteIncrementa: false, seguroIncrementa: false },
  { clave: 'CPT', desc: 'Transporte pagado hasta', fleteIncrementa: false, seguroIncrementa: true },
  { clave: 'CIP', desc: 'Transporte y seguro pagados hasta', fleteIncrementa: false, seguroIncrementa: false },
  { clave: 'DAP', desc: 'Entregado en lugar', fleteIncrementa: false, seguroIncrementa: false },
  { clave: 'DPU', desc: 'Entregado en lugar descargado', fleteIncrementa: false, seguroIncrementa: false },
  { clave: 'DDP', desc: 'Entregado con derechos pagados', fleteIncrementa: false, seguroIncrementa: false },
]

// Medios de transporte (clave del apéndice 3).
export const MEDIOS_TRANSPORTE = [
  { clave: '1', desc: 'Marítimo' },
  { clave: '4', desc: 'Aéreo' },
  { clave: '7', desc: 'Ferroviario' },
  { clave: '8', desc: 'Carretero / Terrestre' },
  { clave: '10', desc: 'Ductos' },
]

// Unidades de medida de la TIGIE (apéndice 7).
export const UNIDADES_MEDIDA = [
  { clave: '01', desc: 'Kilogramo' },
  { clave: '06', desc: 'Pieza' },
  { clave: '05', desc: 'Litro' },
  { clave: '03', desc: 'Metro lineal' },
  { clave: '04', desc: 'Metro cuadrado' },
  { clave: '02', desc: 'Gramo' },
  { clave: '09', desc: 'Par' },
  { clave: '10', desc: 'Kilowatt' },
  { clave: '08', desc: 'Caja' },
  { clave: '19', desc: 'Juego' },
]

// Países (clave del apéndice 4 + ISO).
export const PAISES = [
  { clave: 'USA', iso: 'US', nombre: 'Estados Unidos' },
  { clave: 'CHN', iso: 'CN', nombre: 'China' },
  { clave: 'CAN', iso: 'CA', nombre: 'Canadá' },
  { clave: 'DEU', iso: 'DE', nombre: 'Alemania' },
  { clave: 'JPN', iso: 'JP', nombre: 'Japón' },
  { clave: 'KOR', iso: 'KR', nombre: 'Corea del Sur' },
  { clave: 'BRA', iso: 'BR', nombre: 'Brasil' },
  { clave: 'ESP', iso: 'ES', nombre: 'España' },
  { clave: 'FRA', iso: 'FR', nombre: 'Francia' },
  { clave: 'ITA', iso: 'IT', nombre: 'Italia' },
  { clave: 'IND', iso: 'IN', nombre: 'India' },
  { clave: 'VNM', iso: 'VN', nombre: 'Vietnam' },
  { clave: 'TWN', iso: 'TW', nombre: 'Taiwán' },
  { clave: 'MEX', iso: 'MX', nombre: 'México' },
]

// Fracciones arancelarias de ejemplo (TIGIE) con NICO, tasa de IGI ad valorem,
// unidad de tarifa y si requiere alguna regulación no arancelaria (RRNA).
// Tasas ILUSTRATIVAS — verifica siempre la TIGIE y las RGCE vigentes.
export const FRACCIONES = [
  { fraccion: '8703.23.01', nico: '00', desc: 'Automóviles de turismo (cilindrada 1500-3000 cm³)', igi: 0.20, umt: '06', rrna: 'NOM-194 / Registro' },
  { fraccion: '8517.13.01', nico: '00', desc: 'Teléfonos inteligentes (smartphones)', igi: 0.00, umt: '06', rrna: 'NOM-208 / IFT' },
  { fraccion: '8471.30.01', nico: '00', desc: 'Computadoras portátiles (laptops)', igi: 0.00, umt: '06', rrna: '—' },
  { fraccion: '6109.10.01', nico: '00', desc: 'Camisetas (T-shirts) de punto de algodón', igi: 0.25, umt: '06', rrna: 'NOM-004 etiquetado' },
  { fraccion: '9403.60.01', nico: '00', desc: 'Muebles de madera (uso doméstico)', igi: 0.15, umt: '06', rrna: '—' },
  { fraccion: '0901.21.01', nico: '00', desc: 'Café tostado sin descafeinar', igi: 0.20, umt: '01', rrna: 'Certificado fitosanitario' },
  { fraccion: '2204.21.01', nico: '00', desc: 'Vino de uvas frescas (envase ≤ 2 L)', igi: 0.20, umt: '05', rrna: 'NOM-142 / aviso COFEPRIS' },
  { fraccion: '3004.90.99', nico: '99', desc: 'Medicamentos dosificados para venta al menor', igi: 0.00, umt: '01', rrna: 'Registro sanitario COFEPRIS' },
  { fraccion: '7308.90.99', nico: '99', desc: 'Estructuras y partes de estructuras de acero', igi: 0.15, umt: '01', rrna: 'NOM acero' },
  { fraccion: '8708.29.99', nico: '99', desc: 'Partes y accesorios de carrocería para vehículos', igi: 0.10, umt: '06', rrna: '—' },
  { fraccion: '0803.90.01', nico: '00', desc: 'Plátanos (bananas) frescos', igi: 0.20, umt: '01', rrna: 'Certificado fitosanitario' },
  { fraccion: '8544.42.99', nico: '99', desc: 'Cables y conductores eléctricos con conectores', igi: 0.05, umt: '01', rrna: '—' },
]

// Tipos de operación.
export const TIPOS_OPERACION = [
  { clave: 'IMP', nombre: 'Importación', icon: '📥' },
  { clave: 'EXP', nombre: 'Exportación', icon: '📤' },
]
