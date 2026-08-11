/*
  SOLDADURA — the processes, side by side.

  `record` points at an entry in the knowledge corpus, so each row on this page
  is a door into the article that covers the process properly rather than a
  duplicate of it. Add a process here and it appears in the matrix; give it a
  record id and the row becomes a link.

  Deposition rates are typical operating ranges, not code limits — they vary
  with diameter, position and duty cycle, and are here to compare processes
  against each other rather than to specify one.
*/

export const PROCESSES = [
  {
    code: 'SMAW',
    record: 'smaw',
    name: 'Electrodo revestido',
    current: 'CC ±  ·  CA',
    shielding: 'Descomposición del revestimiento',
    deposition: '0.5 – 4 kg/h',
    positions: 'Todas',
    strength: 'No depende del viento ni de una línea de gas. Es el proceso que llega a donde no llega nada más.',
    limit: 'Escoria en cada pasada y un electrodo que se consume. La productividad la fija el cambio de electrodo.',
  },
  {
    code: 'GMAW',
    record: 'gmaw',
    name: 'Alambre sólido con gas',
    current: 'CC +',
    shielding: 'Ar · Ar/CO₂ · CO₂',
    deposition: '2 – 6 kg/h',
    positions: 'Todas con transferencia controlada',
    strength: 'Alambre continuo, sin escoria y con arco estable. Es el proceso de la producción en serie.',
    limit: 'El gas se lo lleva el aire. Fuera de nave hace falta protección física del arco o cambiar de proceso.',
  },
  {
    code: 'GTAW',
    record: 'gtaw',
    name: 'Arco de tungsteno',
    current: 'CC −  ·  CA para aluminio',
    shielding: 'Ar puro · Ar/He',
    deposition: '0.2 – 1 kg/h',
    positions: 'Todas',
    strength: 'Control total sobre el aporte térmico y sobre cuánto material entra. La calidad más alta que se puede depositar.',
    limit: 'Lento y dependiente del soldador. Se reserva para raíces, espesores finos y lo que va a ser radiografiado.',
  },
  {
    code: 'FCAW',
    record: 'fcaw',
    name: 'Alambre tubular',
    current: 'CC +  ·  CC − autoprotegido',
    shielding: 'Núcleo de fundente ± gas',
    deposition: '3 – 8 kg/h',
    positions: 'Todas con alambre adecuado',
    strength: 'La productividad del alambre continuo con la tolerancia del electrodo revestido. El caballo de carga de la estructura pesada.',
    limit: 'Genera humo y deja escoria. Exige extracción y una pasada de limpieza entre cordones.',
  },
  {
    code: 'SAW',
    record: 'saw',
    name: 'Arco sumergido',
    current: 'CC +  ·  CA',
    shielding: 'Manto de fundente granular',
    deposition: '8 – 20 kg/h',
    positions: 'Plana · filete horizontal',
    strength: 'Depósito por hora que ningún proceso manual alcanza, con penetración profunda y sin radiación visible.',
    limit: 'Mecanizado y limitado a plano. El arco no se ve, así que todo se controla por parámetros y por preparación.',
  },
]

/*
  Choosing between them. The matrix above says what each process is; this says
  which one the job is asking for, which is the question people actually have.
*/
export const SELECTION = [
  {
    term: 'Espesor bajo 3 mm',
    def: 'GTAW o GMAW en corto circuito. El problema no es depositar sino no perforar, y ambos permiten bajar el aporte térmico lo suficiente.',
  },
  {
    term: 'Estructura pesada',
    def: 'FCAW para el volumen, SAW donde la junta sea recta y accesible en plano. La variable que decide es kilogramos por hora.',
  },
  {
    term: 'Trabajo en campo',
    def: 'SMAW o FCAW autoprotegido. Todo lo que dependa de una línea de gas es un punto de falla al aire libre.',
  },
  {
    term: 'Raíz de tubería',
    def: 'GTAW para la raíz, y el relleno con lo que la productividad permita. La raíz es lo que se radiografía.',
  },
  {
    term: 'Inoxidable',
    def: 'GTAW o GMAW con mezcla de bajo CO₂. El carbono del gas se incorpora al depósito y compromete la resistencia a la corrosión.',
  },
  {
    term: 'Aluminio',
    def: 'GTAW en corriente alterna o GMAW con antorcha de empuje. La capa de óxido funde a más del triple que el metal debajo: hay que romperla, no atravesarla.',
  },
  {
    term: 'Metales distintos',
    def: 'Latón o aleación de plata por capilaridad, sin fundir el metal base. Cuando fundir los dos lados produce una fase frágil, la respuesta es no fundirlos.',
  },
]

/**
 * The failures worth recognising on sight. Each links to its full article.
 */
export const DEFECTS = [
  {
    record: 'porosity',
    name: 'Porosidad',
    tell: 'Poros esféricos, en el cordón o bajo la superficie',
    cause: 'Gas atrapado: humedad, aceite, óxido, o protección insuficiente en la zona del arco.',
  },
  {
    record: 'lack-of-fusion',
    name: 'Falta de fusión',
    tell: 'Cordón bien formado que no llegó a unirse al flanco',
    cause: 'Aporte térmico bajo, ángulo equivocado o velocidad excesiva. No se ve en la superficie.',
  },
  {
    record: 'undercut',
    name: 'Socavado',
    tell: 'Canal fundido al borde del cordón, sin rellenar',
    cause: 'Corriente alta o avance rápido. Reduce la sección resistente y concentra tensión.',
  },
  {
    record: 'cracking',
    name: 'Fisuración',
    tell: 'Grieta longitudinal o transversal, en caliente o días después',
    cause: 'En caliente por segregación durante la solidificación; en frío por hidrógeno y martensita.',
  },
  {
    record: 'distortion',
    name: 'Distorsión',
    tell: 'La pieza dejó de estar donde se armó',
    cause: 'Contracción no simétrica. Se controla con secuencia de soldadura, no con más sujeción.',
  },
]
