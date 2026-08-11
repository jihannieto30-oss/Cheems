/*
  TECNOLOGÍA — what turns a metal into a specified material.

  The four stages are the argument of the page: a material is only a material
  once its composition is known, its microstructure is predictable and its
  performance is measured. Each stage carries its own rows so a new property
  can be added without touching the page component.

  Figures here are the standard requirements of the AWS A5 series and the
  common industry practice built on them. Where a number is a typical range
  rather than a code requirement it says so.
*/

export const MATERIAL_SCIENCE = [
  {
    id: 'material',
    index: '01',
    label: 'MATERIAL',
    title: 'Un metal no es un material hasta que tiene nombre',
    lead: 'La designación es lo que convierte una colada en un producto. ER70S-6 no describe un alambre: describe un conjunto de límites que ese alambre está obligado a cumplir.',
    rows: [
      {
        term: 'Designación',
        def: 'Clasificación AWS/ASME que fija composición, resistencia mínima y condiciones de ensayo. El prefijo indica la forma: ER alambre o varilla, E electrodo revestido, RB varilla de latón.',
      },
      {
        term: 'Especificación',
        def: 'El documento que contiene la clasificación. A5.18 para aceros al carbono en GMAW, A5.1 para electrodos revestidos, A5.9 para inoxidables, A5.10 para aluminio.',
      },
      {
        term: 'Forma de suministro',
        def: 'Rollo, varilla cortada o electrodo revestido. La forma decide el proceso, y el proceso decide el rango de espesores y posiciones accesibles.',
      },
      {
        term: 'Colada',
        def: 'La unidad real de trazabilidad. Dos rollos de la misma designación son intercambiables en especificación, pero sólo un certificado por colada dice qué contiene exactamente el que está en la máquina.',
        note: 'Heat number · lote · certificado',
      },
    ],
  },
  {
    id: 'composition',
    index: '02',
    label: 'COMPOSICIÓN',
    title: 'Cinco elementos deciden casi todo',
    lead: 'El análisis químico por espectrometría de emisión se hace sobre la colada, no sobre la muestra que llegó. Es el único punto del proceso donde el material todavía puede rechazarse entero.',
    rows: [
      {
        term: 'Carbono',
        def: 'Sube la resistencia y baja la soldabilidad. Por encima de cierto contenido el enfriamiento rápido forma martensita en la zona afectada por el calor, y ahí aparece la fisuración en frío.',
      },
      {
        term: 'Manganeso',
        def: 'Desoxidante y endurecedor por solución sólida. También fija el azufre como MnS y evita el agrietamiento en caliente que produciría el FeS.',
      },
      {
        term: 'Silicio',
        def: 'Desoxidante principal. Controla la fluidez del baño y la forma del cordón; es la diferencia práctica entre un ER70S-3 y un ER70S-6 sobre lámina oxidada.',
      },
      {
        term: 'Azufre y fósforo',
        def: 'Impurezas. Segregan al centro del cordón durante la solidificación y son la causa directa de la fisuración en caliente. Ambos se limitan por debajo de 0.03 %.',
      },
      {
        term: 'Carbono equivalente',
        def: 'CE (IIW) = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15. Es la manera de comparar la soldabilidad de dos aceros con un solo número.',
        note: 'Por encima de 0.45 se evalúa precalentamiento',
      },
    ],
  },
  {
    id: 'microstructure',
    index: '03',
    label: 'MICROESTRUCTURA',
    title: 'La tenacidad se decide mientras el baño solidifica',
    lead: 'Un cordón con la composición correcta puede seguir siendo frágil. Lo que resiste el impacto no es la química sino la forma en que esa química cristalizó al enfriarse.',
    rows: [
      {
        term: 'Ferrita acicular',
        def: 'La microestructura que se busca en acero al carbono: granos finos, orientados al azar, que obligan a la grieta a cambiar de dirección en cada frontera. Es lo que da tenacidad a baja temperatura.',
      },
      {
        term: 'Ferrita de borde de grano',
        def: 'Se forma primero, en las fronteras de la austenita previa, y ofrece a la grieta un camino continuo. Aumenta cuando el aporte térmico es alto y el enfriamiento lento.',
      },
      {
        term: 'Martensita',
        def: 'Producto de un enfriamiento demasiado rápido. Dura, frágil y sensible al hidrógeno. Se controla con precalentamiento y con temperatura entre pasadas, no con el consumible.',
      },
      {
        term: 'Ferrita delta',
        def: 'En inoxidables austeníticos se busca deliberadamente entre 3 y 10 FN: esa fracción de ferrita retenida es lo que impide la fisuración en caliente durante la solidificación.',
        note: 'Diagrama WRC-1992 · Creq / Nieq',
      },
      {
        term: 'Zona afectada por el calor',
        def: 'El metal base que no se fundió pero sí cambió. No se puede elegir un consumible que la mejore: se controla con el ciclo térmico.',
      },
    ],
  },
  {
    id: 'performance',
    index: '04',
    label: 'DESEMPEÑO',
    title: 'Lo que no se mide, no se puede garantizar',
    lead: 'Cada lote se ensaya sobre metal depositado, no sobre el alambre. Un certificado que reporta la química del alambre y no las propiedades del depósito no está diciendo lo que hace falta saber.',
    rows: [
      {
        term: 'Tracción',
        def: 'Resistencia última, límite de fluencia y elongación sobre probeta de metal depositado. Un ER70S-6 responde a 480 MPa de resistencia mínima y 22 % de elongación.',
        note: 'ASME IX · AWS B4.0',
      },
      {
        term: 'Impacto Charpy V',
        def: 'Energía absorbida a temperatura especificada. Es el ensayo que separa un depósito que aguanta de uno que sólo es fuerte: 27 J a −20 °C es el requisito habitual en estructura.',
      },
      {
        term: 'Hidrógeno difusible',
        def: 'Medido en ml por 100 g de metal depositado. H4 es el grado bajo hidrógeno para acero de alta resistencia; H8 y H16 son progresivamente más permisivos.',
        note: 'AWS A4.3',
      },
      {
        term: 'Humedad del revestimiento',
        def: 'Un electrodo bajo hidrógeno absorbe agua del aire y deja de serlo. El límite típico está en 0.4 % y se recupera con resecado controlado, no con una estufa cualquiera.',
        note: 'Resecado 260 – 430 °C según clasificación',
      },
      {
        term: 'Geometría del rollo',
        def: 'Cast y hélice: el diámetro que describe el alambre al soltarse y cuánto se sale del plano. Un cast fuera de rango desvía el arco del centro de la junta aunque la química sea perfecta.',
      },
    ],
  },
]

/*
  The control loop. Not a stage of the material — the thing that runs across
  all four of them and makes any of it repeatable.
*/
export const CONTROL = [
  {
    term: 'Análisis por colada',
    def: 'Espectrometría de emisión óptica sobre cada colada antes de trefilar. Es el punto de no retorno: después de este ensayo el material ya sólo puede rechazarse por lote.',
  },
  {
    term: 'Ensayo de depósito',
    def: 'Cupón soldado con los mismos parámetros que se recomiendan en la ficha, mecanizado a probeta y ensayado. Es lo que respalda cada número publicado.',
  },
  {
    term: 'Control dimensional',
    def: 'Diámetro, ovalidad y acabado superficial en línea. Una variación de centésimas cambia la corriente que el hilo acepta en el tubo de contacto.',
  },
  {
    term: 'Trazabilidad',
    def: 'Colada, lote y certificado unidos al empaque. Sin esa cadena, un hallazgo en obra no se puede acotar y hay que sustituir todo el material del proyecto.',
  },
]
