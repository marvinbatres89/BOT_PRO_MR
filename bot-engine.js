/* ==========================================
   BOT V1 MR
   BOT-ENGINE.JS
   FIX14.9 FAVORABLE ZONE GATE + LOSS PROTECTION

   BASE: FIX13.7

   CONSERVA:
   - AUTOMÁTICO
   - MANUAL DIAGNÓSTICO
   - PREPARAR / EJECUTAR
   - DERIV DEMO
   - TELEMETRÍA
   - GANADA / PERDIDA
   - 12 MERCADOS
   - CALIBRACIÓN -0.3 A +1.0
   - SCORE BRUTO
   - PERFILES
   - COMPARADORES
   - HISTORIAL EN MEMORIA
   - CACHÉ DE ESTADÍSTICAS
   - ESTADO RÁPIDO
   - MANUAL LISTO DESDE PREPARAR
   - TARGET ACTUALIZA REFERENCIA DESPUÉS
   - NUEVA OPERACIÓN MANUAL DESCARTA ANTIGUA

   FIX13.8 AGREGA:
   - MEMORIA PERSISTENTE DE PATRONES
   - AGRUPACIÓN POR:
       MERCADO
       ESTRATEGIA
       DIRECCIÓN
       VALOR DEL PATRÓN
       CONFIANZA
       SCORE BRUTO
   - FAVORABLE / RIESGO / SIN EVIDENCIA
   - MODO APRENDIZAJE
   - FILTRO HISTÓRICO AUTOMÁTICO
   - MANUAL NUNCA ES BLOQUEADO
   - REGISTRO AUTOMÁTICO GANADA/PERDIDA
   - TIMING REAL SE GUARDA EN PATRÓN
   - BASE PARA TESTLOG DESCARGABLE
   ========================================== */

import {
  contractMapper
} from "./contract-mapper.js";

import {
  proposalSimulator
} from "./proposal-simulator.js";

import {
  derivProposal
} from "./deriv-proposal.js";

import {
  derivTrade
} from "./deriv-trade.js";

import {
  executionRecorder
} from "./execution-recorder.js";


/* ==========================================
   STORAGE
   ========================================== */

const TELEMETRY_KEY =
  "BOT_V1_MR_FIX8_TELEMETRY";

const CALIBRATION_KEY =
  "BOT_V1_MR_FIX11_CALIBRATION";

const EXECUTION_MODE_KEY =
  "BOT_V1_MR_FIX13_6_EXECUTION_MODE";

const PATTERN_MEMORY_KEY =
  "BOT_V1_MR_FIX13_8_PATTERN_MEMORY";

const DIRECTION_TIMING_KEY =
  "BOT_V1_MR_FIX14_DIRECTION_TIMING";

const DIRECTION_CALIBRATION_KEY =
  "BOT_V1_MR_FIX14_DIRECTION_CALIBRATION";

const PARITY_MOVEMENT_MEMORY_KEY =
  "BOT_V1_MR_FIX14_2_PARITY_MOVEMENT_MEMORY";


/* ==========================================
   VERSIONES
   ========================================== */

const TELEMETRY_VERSION =
  "FIX14.1";

const TIMING_BASE_VERSION =
  "FIX14.1";

const SYNC_VERSION =
  "FIX14.1-CLEAN-EXECUTION";

const PATTERN_VERSION =
  "FIX14.0-PATTERN-2";


const TIMING_COMPATIBLE_VERSIONS = [
  "FIX12",
  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2",
  "FIX13.5",
  "FIX13.6",
  "FIX13.7",
  "FIX13.8",
  "FIX13.9",
  "FIX14.0",
  "FIX14.1",
  "FIX14.2",
  "FIX14.2.1",
  "FIX14.2.2",
  "FIX14.3",
  "FIX14.4",
  "FIX14.5",
  "FIX14.6",
  "FIX14.8",
  "FIX14.9"
];


const SIGNAL_PROFILE_VERSIONS = [
  "FIX13",
  "FIX13.1",
  "FIX13.2",
  "FIX13.3",
  "FIX13.4",
  "FIX13.4.1",
  "FIX13.4.2",
  "FIX13.5",
  "FIX13.6",
  "FIX13.7",
  "FIX13.8",
  "FIX13.9",
  "FIX14.0",
  "FIX14.1",
  "FIX14.2",
  "FIX14.2.1",
  "FIX14.2.2",
  "FIX14.3",
  "FIX14.4",
  "FIX14.5",
  "FIX14.6",
  "FIX14.8",
  "FIX14.9"
];


const MODOS_EJECUCION = {

  AUTOMATICO:
    "AUTOMATICO",

  MANUAL:
    "MANUAL_DIAGNOSTICO"

};


/* ==========================================
   CONTROL
   ========================================== */

const PROFILE_CONTROL = {

  minimumPatternSamples:
    4,

  minimumStrongSamples:
    8,

  meaningfulGapPercent:
    20,

  strongGapPercent:
    30,

  maxHallazgos:
    8

};


const TIMING_LIMITS = {

  bridgeToProcessMaxMs:
    1000,

  proposalMaxMs:
    2000,

  buyConfirmationMaxMs:
    2000,

  targetDeviationMaxAbsMs:
    750,

  waitOvershootMaxMs:
    500

};


/* ==========================================
   FIX13.8
   CONTROL MEMORIA DE PATRONES
   ========================================== */

const PATTERN_CONTROL = {

  /*
    Con menos de 4 operaciones,
    no se bloquea nada.
  */

  minimumDecisionSamples:
    4,


  /*
    8 o más muestras convierten
    el patrón en evidencia más fuerte.
  */

  strongEvidenceSamples:
    8,


  /*
    Si alcanza 70% o más:
    FAVORABLE.
  */

  favorableAccuracy:
    70,


  /*
    Si cae a 35% o menos:
    RIESGO.
  */

  riskAccuracy:
    35,


  /*
    36% a 69%:
    NEUTRO / SIN EVIDENCIA FUERTE.
  */

  confidenceBucketSize:
    2,


  /*
    Score bruto se agrupa
    de 5 en 5.
  */

  scoreBucketSize:
    5,


  /*
    Valor especial de la predicción,
    si existe, se agrupa de 5 en 5.

    Ejemplos:
    20.0
    30.0
    40.0
  */

  valueBucketSize:
    5,


  /*
    Timing observado se agrupa
    de 100 ms en 100 ms.
  */

  timingBucketSizeMs:
    100,


  /*
    Número máximo de resultados
    recientes guardados dentro
    de cada patrón.
  */

  maxRecentResults:
    20,


  /*
    Límite de patrones persistidos.
  */

  maxPatterns:
    1500,


  /*
    El filtro se aplica únicamente
    al AUTOMÁTICO.
  */

  blockRiskInAutomatic:
    true,


  /*
    Los patrones desconocidos
    se ejecutan en DEMO para aprender.
  */

  learningMode:
    true

};


const DIRECTION_TIMING_CONTROL = {
  minimumDecisionSamples: 6,
  favorableAccuracy: 65,
  riskAccuracy: 40,
  timingBucketSizeMs: 100,
  maxBuckets: 300
};


/* ==========================================
   FIX14.2 · MOVIMIENTO EVEN / ODD
   Aprende el movimiento previo de paridad.
   No supone que una racha "debe" cambiar;
   solo clasifica con resultados reales.
   ========================================== */

const PARITY_MOVEMENT_CONTROL = {
  minimumDecisionSamples: 4,
  strongEvidenceSamples: 8,
  favorableAccuracy: 70,
  riskAccuracy: 35,
  maxPatterns: 600,
  maxRecentResults: 20,
  minDigits: 5,
  maxDigits: 12,
  blockRiskInAutomatic: true
};

/* ==========================================
   FIX14.3 · GUARDIA DE RÉGIMEN / RACHAS
   No intenta predecir el próximo dígito.
   Reduce exposición cuando el historial
   inmediato entra en un bloque perdedor.
   Solo bloquea AUTOMÁTICO y solo 1 señal
   por cada nueva huella de pérdidas.
   ========================================== */

const REGIME_GUARD_CONTROL = {
  enabled: true,
  minFinishedOperations: 6,
  globalConsecutiveLosses: 3,
  directionConsecutiveLosses: 2,
  recentWindow: 5,
  recentLossesToWarn: 4,
  requireNonFavorableMovement: true,
  blockOnlyOneSignalPerFingerprint: true
};


/* ==========================================
   FIX14.4 · DECISIÓN POR TIMING BUY
   Cruza la calibración que se va a usar con
   la memoria real de BUY de esa dirección.
   Si el bucket cercano ya demostró RIESGO,
   AUTOMÁTICO no compra. Si es FAVORABLE,
   sirve como confirmación adicional.
   ========================================== */

const BUY_TIMING_DECISION_CONTROL = {
  enabled: true,
  minimumSamples: 6,
  favorableAccuracy: 65,
  riskAccuracy: 40,
  maxBucketDistanceMs: 150,
  blockRiskInAutomatic: true
};


/* ==========================================
   FIX14.5 · PUERTA DE EVIDENCIA FAVORABLE
   No basta con "no ser riesgo": AUTOMÁTICO
   exige evidencia positiva antes de BUY.

   PROTECCIÓN TRAS PÉRDIDAS:
   - normal: al menos 1 soporte favorable fuerte
     (o 2 soportes favorables).
   - tras 1 pérdida: exige 2 soportes favorables.
   - tras 2+ pérdidas: exige 2 soportes y una
     calidad combinada más alta.

   Los NO OPERAR no cuentan como pérdidas.
   MANUAL DIAGNÓSTICO no se bloquea.
   ========================================== */

const FAVORABLE_EVIDENCE_CONTROL = {
  enabled: true,
  minimumSignalConfidence: 70,
  strongSingleEvidenceAccuracy: 75,
  strongSingleEvidenceSamples: 8,
  supportsNormal: 1,
  supportsAfterOneLoss: 2,
  supportsAfterTwoLosses: 2,
  minimumCombinedQualityAfterTwoLosses: 150,
  blockInsufficientEvidenceInAutomatic: true
};


/* ==========================================
   FIX14.9 · FAVORABLE ZONE GATE
   Rescata SOLO el bloqueo por evidencia
   insuficiente cuando la señal actual coincide
   con antecedentes ganadores cercanos.

   SEGURIDAD:
   - nunca anula PATRÓN RIESGO
   - nunca anula MOVIMIENTO RIESGO
   - nunca anula TIMING BUY RIESGO
   - nunca anula GUARDIA DE RACHA
   - exige confianza actual mínima
   - tras pérdidas aumenta la exigencia
   ========================================== */

const HISTORICAL_OPPORTUNITY_CONTROL = {
  enabled: true,
  minimumSignalConfidence: 72,

  /* Patrón cercano heredado de FIX14.8. */
  minimumSamples: 3,
  minimumAccuracy: 66.67,
  preferredAccuracy: 75,
  strongSamples: 8,
  maxConfidenceBucketDistance: 10,
  maxScoreBucketDistance: 25,
  maxValueBucketDistance: 25,
  minimumWeightedScore: 60,

  currentPatternMinimumSamples: 4,
  currentPatternMinimumAccuracy: 70,

  directionAggregateMinimumSamples: 10,
  directionAggregateMinimumAccuracy: 65,

  favorableClusterMinimumPatterns: 2,
  favorableClusterMinimumSamples: 6,
  favorableClusterMinimumAccuracy: 70,

  /*
    FIX14.9 · FAVORABLE ZONE GATE
    Suma antecedentes cercanos aunque estén repartidos
    entre varias firmas/patrones.
  */
  zoneEnabled: true,
  zoneMinimumSamples: 5,
  zoneMinimumAccuracy: 68,
  zoneStrongMinimumSamples: 7,
  zoneStrongMinimumAccuracy: 70,
  zoneMinimumPatterns: 2,
  zoneMaxConfidenceDistance: 20,
  zoneMaxScoreDistance: 40,
  zoneMaxValueDistance: 40,
  zoneMinimumCloseness: 48,

  /* Tras pérdidas se mantiene protección reforzada. */
  afterOneLossMinimumSamples: 4,
  afterOneLossMinimumAccuracy: 75,
  afterTwoLossesMinimumSamples: 6,
  afterTwoLossesMinimumAccuracy: 80,
  afterOneLossAggregateAccuracy: 72,
  afterTwoLossesAggregateAccuracy: 78,
  afterOneLossZoneMinimumAccuracy: 72,
  afterTwoLossesZoneMinimumAccuracy: 78,

  maxCandidates: 30
};

const DIRECTION_CALIBRATION_DEFAULT = {
  EVEN: -300,
  ODD: 300
};

const DIRECTION_CALIBRATION_ALLOWED_MS = [
  -500, -400, -300, -200, -100,
  0,
  100, 200, 300, 400, 500
];

const PREPARATION_TTL_MS =
  60000;


/* ==========================================
   MERCADOS
   ========================================== */

const MERCADOS_STANDARD = [
  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100"
];


const MERCADOS_1S = [
  "1HZ10V",
  "1HZ15V",
  "1HZ25V",
  "1HZ30V",
  "1HZ50V",
  "1HZ75V",
  "1HZ100V"
];


const MERCADOS_CONTROLADOS = [
  ...MERCADOS_STANDARD,
  ...MERCADOS_1S
];


/* ==========================================
   CALIBRACIÓN
   ========================================== */

const AJUSTES_PERMITIDOS_MS = [
  -300,
  -200,
  -100,
  0,
  100,
  200,
  300,
  400,
  500,
  600,
  700,
  800,
  900,
  1000
];


const CALIBRACION_INICIAL = {

  R_10:
    0,

  R_25:
    0,

  R_50:
    0,

  R_75:
    0,

  R_100:
    0,

  "1HZ10V":
    100,

  "1HZ15V":
    100,

  "1HZ25V":
    100,

  "1HZ30V":
    100,

  "1HZ50V":
    100,

  "1HZ75V":
    100,

  "1HZ100V":
    100

};


/* ==========================================
   MOTOR
   ========================================== */

class BotEngine {

  constructor() {

    this.activo =
      false;

    this.pausado =
      false;

    this.modo =
      "DERIV DEMO + FIX14.9 FAVORABLE ZONE GATE";

    this.modoEjecucion =
      this.cargarModoEjecucion();

    this.ultimaSenalProcesada =
      null;

    this.senalesEnProceso =
      new Set();

    this.preparaciones =
      new Map();

    /*
      FIX14.2.1 PARITY MOVEMENT SAFE
      Un único ciclo operativo puede estar vigente.
      Todo PREPARAR/EJECUTAR atrasado se descarta.
    */

    this.operacionActivaId =
      null;

    this.cicloSecuencia =
      0;

    this.ultimoMotivoLimpiezaCiclo =
      null;

    this.ultimoCicloLimpioAt =
      null;

    this.ultimoContrato =
      null;

    this.ultimaPropuesta =
      null;

    this.ultimaPropuestaDeriv =
      null;

    this.ultimaCompraDemo =
      null;

    this.ultimoResultadoDemo =
      null;

    this.ultimaTelemetria =
      null;

    this.ultimoAnalisisPatron =
      null;

    /* FIX14.3: estado liviano; no toca conexión ni localStorage. */
    this.regimeGuardSkips =
      new Map();

    this.ultimoAnalisisRegimenRacha =
      null;


    this.configuracion = {

      monto:
        1,

      moneda:
        "USD",

      duracion:
        1,

      unidadDuracion:
        "t"

    };


    /*
      GESTIÓN DE RIESGO DE SESIÓN.

      Valores por defecto conservadores para
      cuenta DEMO. Ajustables desde la UI si
      se agrega un panel de configuración.
    */

    this.limitesRiesgo = {

      perdidaMaximaSesion:
        10,

      perdidasConsecutivasMaximas:
        4,

      operacionesMaximasSesion:
        30

    };


    this.sesionRiesgo = {

      netoSesion:
        0,

      operacionesTotales:
        0,

      perdidasConsecutivasSesion:
        0,

      detenidoPorRiesgo:
        false,

      motivoDetencion:
        null

    };


    this.calibracion =
      this.cargarCalibracion();


    /*
      Historial FIX13.7:
      carga una sola vez.
    */

    this.historialTelemetria =
      this.cargarHistorialTelemetria();


    /*
      FIX13.8:
      memoria histórica consolidada.
    */

    this.memoriaPatrones =
      this.cargarMemoriaPatrones();


    this.memoriaTimingDireccion =
      this.cargarMemoriaTimingDireccion();

    this.calibracionDireccion =
      this.cargarCalibracionDireccion();


    /*
      Caché de analítica pesada.
    */

    this.cacheAnalitica =
      null;


    this.timerLimpieza =
      setInterval(
        () => {

          this
            .limpiarPreparacionesExpiradas();

        },
        5000
      );

  }


  /* ========================================
     UTILIDADES
     ======================================== */

  ahora() {

    if (
      typeof performance !==
        "undefined" &&
      typeof performance.now ===
        "function"
    ) {

      return performance.now();

    }


    return Date.now();

  }


  esperar(
    ms
  ) {

    const tiempo =
      Number(
        ms
      );


    if (
      !Number.isFinite(
        tiempo
      ) ||
      tiempo <=
        0
    ) {

      return Promise.resolve();

    }


    return new Promise(
      (
        resolve
      ) => {

        setTimeout(
          resolve,
          tiempo
        );

      }
    );

  }


  emitirEvento(
    nombre,
    detalle = {}
  ) {

    try {

      window.dispatchEvent(
        new CustomEvent(
          nombre,
          {
            detail:
              detalle
          }
        )
      );

    }

    catch (
      error
    ) {

      console.warn(
        `No se pudo emitir ${nombre}:`,
        error
      );

    }

  }


  redondear(
    valor
  ) {

    const numero =
      Number(
        valor
      );


    if (
      !Number.isFinite(
        numero
      )
    ) {

      return null;

    }


    return (
      Math.round(
        numero *
        100
      ) /
      100
    );

  }


  clonarSeguro(
    valor
  ) {

    if (
      valor === undefined
    ) {

      return undefined;

    }


    if (
      valor === null
    ) {

      return null;

    }


    try {

      if (
        typeof structuredClone ===
          "function"
      ) {

        return structuredClone(
          valor
        );

      }

    }

    catch {

      // continuar con JSON

    }


    try {

      return JSON.parse(
        JSON.stringify(
          valor
        )
      );

    }

    catch {

      return valor;

    }

  }


  valoresValidos(
    valores
  ) {

    return valores
      .map(
        Number
      )
      .filter(
        Number.isFinite
      );

  }


  promedio(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    if (
      !validos.length
    ) {

      return null;

    }


    const total =
      validos.reduce(
        (
          a,
          b
        ) =>
          a +
          b,
        0
      );


    return this.redondear(
      total /
      validos.length
    );

  }


  mediana(
    valores
  ) {

    const validos =
      this
        .valoresValidos(
          valores
        )
        .sort(
          (
            a,
            b
          ) =>
            a -
            b
        );


    if (
      !validos.length
    ) {

      return null;

    }


    const mitad =
      Math.floor(
        validos.length /
        2
      );


    if (
      validos.length %
        2 ===
      0
    ) {

      return this.redondear(
        (
          validos[
            mitad - 1
          ] +
          validos[
            mitad
          ]
        ) /
        2
      );

    }


    return this.redondear(
      validos[
        mitad
      ]
    );

  }


  minimo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    return validos.length
      ? this.redondear(
          Math.min(
            ...validos
          )
        )
      : null;

  }


  maximo(
    valores
  ) {

    const validos =
      this.valoresValidos(
        valores
      );


    return validos.length
      ? this.redondear(
          Math.max(
            ...validos
          )
        )
      : null;

  }


  diferencia(
    inicio,
    fin
  ) {

    const a =
      this.numeroSeguro(
        inicio
      );

    const b =
      this.numeroSeguro(
        fin
      );


    if (
      a === null ||
      b === null
    ) {

      return null;

    }


    return this.redondear(
      b -
      a
    );

  }


  normalizarTexto(
    valor
  ) {

    if (
      valor ===
        undefined ||
      valor ===
        null
    ) {

      return null;

    }


    const texto =
      String(
        valor
      )
        .trim()
        .toUpperCase();


    return texto ||
      null;

  }


  normalizarMercado(
    mercado
  ) {

    return String(
      mercado ||
      ""
    )
      .trim()
      .toUpperCase();

  }

  /* ========================================
     FIX13.7.1
     VALIDACIÓN NUMÉRICA SEGURA

     Evita que:
     Number(null) === 0

     TARGET, tiempos y offsets inexistentes
     deben mantenerse como NULL.
     ======================================== */
  numeroValido(
    valor
  ) {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {

      return false;

    }


    return Number.isFinite(
      Number(
        valor
      )
    );

  } 

     numeroSeguro(
    valor
  ) {

    if (
      !this.numeroValido(
        valor
      )
    ) {

      return null;

    }


    return Number(
      valor
    );

  }
  
  /* ========================================
     CACHÉ
     ======================================== */

  invalidarCacheAnalitica() {

    this.cacheAnalitica =
      null;

  }


  /* ========================================
     HISTORIAL TELEMETRÍA
     ======================================== */

  cargarHistorialTelemetria() {

    try {

      const datos =
        JSON.parse(
          localStorage.getItem(
            TELEMETRY_KEY
          ) ||
          "[]"
        );


      return Array.isArray(
        datos
      )
        ? datos
        : [];

    }

    catch {

      return [];

    }

  }


  obtenerHistorialTelemetria() {

    return this.historialTelemetria;

  }


  persistirHistorialTelemetria() {

    try {

      localStorage.setItem(
        TELEMETRY_KEY,
        JSON.stringify(
          this.historialTelemetria
        )
      );


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo persistir historial:",
        error
      );


      return false;

    }

  }


  /* ========================================
     FIX13.8
     MEMORIA DE PATRONES
     ======================================== */

  cargarMemoriaPatrones() {

    try {

      const datos =
        JSON.parse(
          localStorage.getItem(
            PATTERN_MEMORY_KEY
          ) ||
          "{}"
        );


      if (
        datos &&
        typeof datos ===
          "object" &&
        !Array.isArray(
          datos
        )
      ) {

        return datos;

      }

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo cargar memoria de patrones:",
        error
      );

    }


    return {};

  }


  persistirMemoriaPatrones() {

    try {

      const entradas =
        Object.entries(
          this.memoriaPatrones
        );


      /*
        Evita crecimiento ilimitado.
        Conserva los patrones más recientes.
      */

      if (
        entradas.length >
        PATTERN_CONTROL
          .maxPatterns
      ) {

        entradas.sort(
          (
            a,
            b
          ) =>
            Number(
              b[1]
                ?.updatedAt ??
              0
            ) -
            Number(
              a[1]
                ?.updatedAt ??
              0
            )
        );


        const recortadas =
          entradas.slice(
            0,
            PATTERN_CONTROL
              .maxPatterns
          );


        this.memoriaPatrones =
          Object.fromEntries(
            recortadas
          );

      }


      localStorage.setItem(
        PATTERN_MEMORY_KEY,
        JSON.stringify(
          this.memoriaPatrones
        )
      );


      return true;

    }

    catch (
      error
    ) {

      console.warn(
        "No se pudo guardar memoria de patrones:",
        error
      );


      return false;

    }

  }


  /* ========================================
     BUCKETS / AGRUPACIÓN
     ======================================== */

  agruparNumero(
    valor,
    paso
  ) {

    const numero =
      Number(
        valor
      );


    const tamano =
      Number(
        paso
      );


    if (
      !Number.isFinite(
        numero
      ) ||
      !Number.isFinite(
        tamano
      ) ||
      tamano <=
        0
    ) {

      return null;

    }


    return (
      Math.round(
        numero /
        tamano
      ) *
      tamano
    );

  }


  extraerValorPatron(
    senal
  ) {

    const candidatos = [

      senal
        ?.valorPatron,

      senal
        ?.predictionValue,

      senal
        ?.diferencia,

      senal
        ?.shortDiff,

      senal
        ?.valor,

      senal
        ?.metadata
        ?.valorPatron,

      senal
        ?.metadata
        ?.predictionValue,

      senal
        ?.metadata
        ?.diferencia,

      senal
        ?.metadata
        ?.shortDiff,

      senal
        ?.metadata
        ?.engine1
        ?.shortDiff,

      senal
        ?.metadata
        ?.engine1
        ?.difference

    ];


    for (
      const candidato
      of candidatos
    ) {

      const numero =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          numero
        )
      ) {

        return this.redondear(
          numero
        );

      }

    }


    return null;

  }


  crearFirmaPatron(
    senal
  ) {

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const estrategia =
      this.normalizarTexto(
        senal?.estrategia
      ) ||
      "SIN_ESTRATEGIA";


    const direccion =
      this.normalizarTexto(
        senal?.direccion
      ) ||
      "SIN_DIRECCION";


    const confianza =
      Number(
        senal?.confianza
      );


    const scoreBruto =
      this.extraerScoreBruto(
        senal
      );


    const valorPatron =
      this.extraerValorPatron(
        senal
      );


    const confianzaBucket =
      Number.isFinite(
        confianza
      )
        ? this.agruparNumero(
            confianza,
            PATTERN_CONTROL
              .confidenceBucketSize
          )
        : null;


    const scoreBucket =
      this.numeroValido(scoreBruto)
        ? this.agruparNumero(
            scoreBruto,
            PATTERN_CONTROL
              .scoreBucketSize
          )
        : null;


    const valorBucket =
      this.numeroValido(valorPatron)
        ? this.agruparNumero(
            valorPatron,
            PATTERN_CONTROL
              .valueBucketSize
          )
        : null;


    const key = [

      mercado ||
        "SIN_MERCADO",

      estrategia,

      direccion,

      `V${
        valorBucket ??
        "X"
      }`,

      `C${
        confianzaBucket ??
        "X"
      }`,

      `S${
        scoreBucket ??
        "X"
      }`

    ].join(
      "|"
    );


    return {

      key,

      version:
        PATTERN_VERSION,

      mercado,

      estrategia,

      direccion,

      confianza:
        Number.isFinite(
          confianza
        )
          ? this.redondear(
              confianza
            )
          : null,

      confianzaBucket,

      scoreBruto,

      scoreBucket,

      valorPatron,

      valorBucket

    };

  }


  /* ========================================
     CLASIFICAR PATRÓN
     ======================================== */

  clasificarPatronHistorico(
    entrada
  ) {

    if (
      !entrada ||
      Number(
        entrada.total ??
        0
      ) <
        PATTERN_CONTROL
          .minimumDecisionSamples
    ) {

      return {

        clasificacion:
          "SIN_EVIDENCIA",

        fuerza:
          "RECOPILANDO",

        decision:
          "APRENDER",

        bloquear:
          false

      };

    }


    const total =
      Number(
        entrada.total ??
        0
      );


    const ganadas =
      Number(
        entrada.ganadas ??
        0
      );


    const accuracy =
      total >
        0
        ? (
            ganadas /
            total
          ) *
          100
        : 0;


    const fuerte =
      total >=
      PATTERN_CONTROL
        .strongEvidenceSamples;


    if (
      accuracy >=
      PATTERN_CONTROL
        .favorableAccuracy
    ) {

      return {

        clasificacion:
          "FAVORABLE",

        fuerza:
          fuerte
            ? "FUERTE"
            : "PRELIMINAR",

        decision:
          "PERMITIR",

        bloquear:
          false

      };

    }


    if (
      accuracy <=
      PATTERN_CONTROL
        .riskAccuracy
    ) {

      return {

        clasificacion:
          "RIESGO",

        fuerza:
          fuerte
            ? "FUERTE"
            : "PRELIMINAR",

        decision:
          "NO_OPERAR",

        bloquear:
          true

      };

    }


    return {

      clasificacion:
        "NEUTRO",

      fuerza:
        fuerte
          ? "FUERTE"
          : "PRELIMINAR",

      decision:
        "APRENDER",

      bloquear:
        false

    };

  }


  analizarPatron(
    senal
  ) {

    const firma =
      this.crearFirmaPatron(
        senal
      );


    const entrada =
      this.memoriaPatrones[
        firma.key
      ] ||
      null;


    const clasificacion =
      this.clasificarPatronHistorico(
        entrada
      );


    const total =
      Number(
        entrada?.total ??
        0
      );


    const ganadas =
      Number(
        entrada?.ganadas ??
        0
      );


    const perdidas =
      Number(
        entrada?.perdidas ??
        0
      );


    const accuracy =
      total >
        0
        ? this.redondear(
            (
              ganadas /
              total
            ) *
              100
          )
        : null;


    const resultado = {

      ...firma,

      total,

      muestras:
        total,

      ganadas,

      perdidas,

      accuracy,

      clasificacion:
        clasificacion
          .clasificacion,

      fuerza:
        clasificacion
          .fuerza,

      decision:
        clasificacion
          .decision,

      bloquear:
        clasificacion
          .bloquear,

      promedioTimingMs:
        entrada
          ?.promedioTimingMs ??
        null,

      promedioManualClickTargetMs:
        entrada
          ?.promedioManualClickTargetMs ??
        null,

      promedioBuyTargetMs:
        entrada
          ?.promedioBuyTargetMs ??
        null,

      ultimosResultados:
        Array.isArray(
          entrada
            ?.ultimosResultados
        )
          ? [
              ...entrada
                .ultimosResultados
            ]
          : []

    };


    this.ultimoAnalisisPatron =
      {
        ...resultado
      };


    this.emitirEvento(
      "bot:pattern-evaluated",
      resultado
    );


    return resultado;

  }

  /* ========================================
     FIX14.2 · MOVIMIENTO EVEN / ODD
     ======================================== */

  cargarMemoriaMovimientoParidad() {

    try {

      const datos = JSON.parse(
        localStorage.getItem(
          PARITY_MOVEMENT_MEMORY_KEY
        ) || "{}"
      );

      return datos &&
        typeof datos === "object" &&
        !Array.isArray(datos)
          ? datos
          : {};

    }

    catch {
      return {};
    }

  }


  persistirMemoriaMovimientoParidad() {

    try {

      const entradas = Object.entries(
        this.memoriaMovimientoParidad || {}
      )
        .sort(
          (a, b) =>
            Number(b[1]?.updatedAt || 0) -
            Number(a[1]?.updatedAt || 0)
        )
        .slice(
          0,
          PARITY_MOVEMENT_CONTROL.maxPatterns
        );

      this.memoriaMovimientoParidad =
        Object.fromEntries(entradas);

      localStorage.setItem(
        PARITY_MOVEMENT_MEMORY_KEY,
        JSON.stringify(
          this.memoriaMovimientoParidad
        )
      );

      return true;

    }

    catch {
      return false;
    }

  }


  extraerDigitosMovimientoParidad(
    senal
  ) {

    const candidatos = [
      senal?.digitos,
      senal?.ultimosDigitos,
      senal?.recentDigits,
      senal?.lastDigits,
      senal?.digits,
      senal?.historialDigitos,
      senal?.metadata?.digitos,
      senal?.metadata?.ultimosDigitos,
      senal?.metadata?.recentDigits,
      senal?.metadata?.lastDigits,
      senal?.metadata?.digits,
      senal?.metadata?.historialDigitos,
      senal?.metadata?.engine1?.digitos,
      senal?.metadata?.engine1?.digits,
      senal?.metadata?.engine2?.digitos,
      senal?.metadata?.engine2?.digits
    ];

    const convertir = (
      arreglo
    ) => {

      if (
        !Array.isArray(arreglo)
      ) {
        return [];
      }

      const salida = [];

      for (
        const item of arreglo
      ) {

        let valor = item;

        if (
          item &&
          typeof item === "object"
        ) {

          valor =
            item.digito ??
            item.digit ??
            item.lastDigit ??
            item.ultimoDigito ??
            item.value ??
            item.valor ??
            null;

        }

        const n = Number(valor);

        if (
          Number.isInteger(n) &&
          n >= 0 &&
          n <= 9
        ) {
          salida.push(n);
        }

      }

      return salida;

    };

    for (
      const candidato of candidatos
    ) {

      const digitos =
        convertir(candidato);

      if (
        digitos.length >=
          PARITY_MOVEMENT_CONTROL.minDigits
      ) {

        return digitos.slice(
          -PARITY_MOVEMENT_CONTROL.maxDigits
        );

      }

    }

    return [];

  }


  resumirMovimientoParidad(
    senal
  ) {

    const estrategia = String(
      senal?.estrategia || ""
    )
      .trim()
      .toLowerCase();

    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );

    if (
      !(
        estrategia === "even_odd" ||
        estrategia === "even/odd"
      ) ||
      !["EVEN", "ODD"].includes(
        direccion
      )
    ) {

      return {
        disponible: false,
        motivo: "No corresponde a EVEN/ODD.",
        direccion,
        digitos: [],
        secuencia: ""
      };

    }

    const digitos =
      this.extraerDigitosMovimientoParidad(
        senal
      );

    if (
      digitos.length <
        PARITY_MOVEMENT_CONTROL.minDigits
    ) {

      return {
        disponible: false,
        motivo: "La señal no incluye suficientes dígitos recientes.",
        direccion,
        digitos,
        secuencia: digitos
          .map(d => d % 2 === 0 ? "E" : "O")
          .join("")
      };

    }

    const paridades = digitos.map(
      d => d % 2 === 0 ? "E" : "O"
    );

    const ultimo =
      paridades[paridades.length - 1];

    let racha = 1;

    for (
      let i = paridades.length - 2;
      i >= 0;
      i -= 1
    ) {

      if (
        paridades[i] !== ultimo
      ) {
        break;
      }

      racha += 1;

    }

    const ventana6 =
      paridades.slice(-6);

    let cambios = 0;

    for (
      let i = 1;
      i < ventana6.length;
      i += 1
    ) {

      if (
        ventana6[i] !==
        ventana6[i - 1]
      ) {
        cambios += 1;
      }

    }

    const clasificarAlternancia = () => {
      if (cambios >= 4) return "ALTA";
      if (cambios >= 2) return "MEDIA";
      return "BAJA";
    };

    const clasificarSesgo = (
      ventana,
      umbral
    ) => {

      const p = paridades.slice(-ventana);
      const even = p.filter(x => x === "E").length;
      const odd = p.length - even;
      const diferencia = even - odd;

      if (
        diferencia >= umbral
      ) return "EVEN";

      if (
        diferencia <= -umbral
      ) return "ODD";

      return "BALANCE";

    };

    const rachaBucket =
      racha >= 3
        ? "3+"
        : String(racha);

    const alternancia =
      clasificarAlternancia();

    const sesgo5 =
      clasificarSesgo(5, 2);

    const sesgo10 =
      clasificarSesgo(
        Math.min(10, paridades.length),
        paridades.length >= 8 ? 3 : 2
      );

    const secuencia =
      paridades.join("");

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );

    const key = [
      mercado || "SIN_MERCADO",
      "EVEN_ODD_MOVE",
      direccion,
      `U${ultimo}`,
      `R${rachaBucket}`,
      `A${alternancia}`,
      `B5${sesgo5}`,
      `B10${sesgo10}`
    ].join("|");

    return {
      disponible: true,
      key,
      mercado,
      direccion,
      digitos,
      secuencia,
      ultimo,
      racha,
      rachaBucket,
      alternancia,
      cambiosUltimos6: cambios,
      sesgo5,
      sesgo10
    };

  }


  clasificarMovimientoParidadHistorico(
    entrada
  ) {

    const total = Number(
      entrada?.total || 0
    );

    if (
      total <
        PARITY_MOVEMENT_CONTROL.minimumDecisionSamples
    ) {

      return {
        clasificacion: "SIN_EVIDENCIA",
        fuerza: "RECOPILANDO",
        decision: "APRENDER",
        bloquear: false
      };

    }

    const ganadas = Number(
      entrada?.ganadas || 0
    );

    const accuracy =
      total > 0
        ? (ganadas / total) * 100
        : 0;

    const fuerte =
      total >=
        PARITY_MOVEMENT_CONTROL.strongEvidenceSamples;

    if (
      accuracy >=
        PARITY_MOVEMENT_CONTROL.favorableAccuracy
    ) {

      return {
        clasificacion: "FAVORABLE",
        fuerza: fuerte ? "FUERTE" : "PRELIMINAR",
        decision: "OPERAR",
        bloquear: false
      };

    }

    if (
      accuracy <=
        PARITY_MOVEMENT_CONTROL.riskAccuracy
    ) {

      return {
        clasificacion: "RIESGO",
        fuerza: fuerte ? "FUERTE" : "PRELIMINAR",
        decision: "NO_OPERAR",
        bloquear: true
      };

    }

    return {
      clasificacion: "NEUTRO",
      fuerza: fuerte ? "FUERTE" : "PRELIMINAR",
      decision: "APRENDER",
      bloquear: false
    };

  }


  analizarMovimientoParidad(
    senal
  ) {

    /* FIX14.2.2: módulo 100% diferido. No se toca al cargar/conectar. */
    if (typeof this.memoriaMovimientoParidadCargada !== "boolean") {
      this.memoriaMovimientoParidadCargada = false;
    }
    if (!this.memoriaMovimientoParidad || typeof this.memoriaMovimientoParidad !== "object") {
      this.memoriaMovimientoParidad = {};
    }
    if (!this.memoriaMovimientoParidadCargada) {
      try {
        this.memoriaMovimientoParidad =
          this.cargarMemoriaMovimientoParidad();
      }
      catch {
        this.memoriaMovimientoParidad = {};
      }
      this.memoriaMovimientoParidadCargada = true;
    }

    const movimiento =
      this.resumirMovimientoParidad(
        senal
      );

    if (
      !movimiento.disponible
    ) {

      const resultado = {
        ...movimiento,
        muestras: 0,
        ganadas: 0,
        perdidas: 0,
        accuracy: null,
        clasificacion: "SIN_DATOS",
        fuerza: "SIN_DATOS",
        decision: "APRENDER",
        bloquear: false
      };

      this.ultimoAnalisisMovimientoParidad =
        resultado;

      this.emitirEvento(
        "bot:parity-movement-evaluated",
        resultado
      );

      return resultado;

    }

    const entrada =
      this.memoriaMovimientoParidad[
        movimiento.key
      ] || null;

    const clasificacion =
      this.clasificarMovimientoParidadHistorico(
        entrada
      );

    const total = Number(
      entrada?.total || 0
    );

    const ganadas = Number(
      entrada?.ganadas || 0
    );

    const perdidas = Number(
      entrada?.perdidas || 0
    );

    const accuracy =
      total > 0
        ? this.redondear(
            (ganadas / total) * 100
          )
        : null;

    const resultado = {
      ...movimiento,
      muestras: total,
      ganadas,
      perdidas,
      accuracy,
      clasificacion: clasificacion.clasificacion,
      fuerza: clasificacion.fuerza,
      decision: clasificacion.decision,
      bloquear: clasificacion.bloquear,
      ultimosResultados:
        Array.isArray(
          entrada?.ultimosResultados
        )
          ? [...entrada.ultimosResultados]
          : []
    };

    this.ultimoAnalisisMovimientoParidad =
      resultado;

    this.emitirEvento(
      "bot:parity-movement-evaluated",
      resultado
    );

    return resultado;

  }


  /* ========================================
     FIX14.4 · TIMING BUY PARA DECISIÓN
     ======================================== */

  analizarTimingBuyDecision(
    senal
  ) {

    const estrategia = String(
      senal?.estrategia || ""
    ).trim().toLowerCase();

    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );

    if (
      !BUY_TIMING_DECISION_CONTROL.enabled ||
      !(estrategia === "even_odd" || estrategia === "even/odd") ||
      !["EVEN", "ODD"].includes(direccion)
    ) {
      return {
        disponible: false,
        bloquear: false,
        apoyar: false,
        clasificacion: "NO_APLICA",
        decision: "OPERAR",
        mercado,
        direccion
      };
    }

    const ajustePlaneadoMs =
      Number(
        this.obtenerAjusteSenal(
          senal
        )
      );

    const entradas =
      Object.values(
        this.memoriaTimingDireccion || {}
      )
      .filter(item =>
        this.normalizarMercado(item?.mercado) === mercado &&
        this.normalizarTexto(item?.direccion) === direccion &&
        Number.isFinite(Number(item?.timingBucketMs))
      );

    if (!entradas.length) {
      return {
        disponible: true,
        bloquear: false,
        apoyar: false,
        clasificacion: "SIN_EVIDENCIA",
        decision: "APRENDER",
        mercado,
        direccion,
        ajustePlaneadoMs,
        muestras: 0,
        accuracy: null,
        distanciaBucketMs: null,
        motivo: "Aún no existe memoria BUY para esta dirección."
      };
    }

    const ordenadas =
      entradas
        .slice()
        .sort(
          (a, b) =>
            Math.abs(Number(a.timingBucketMs) - ajustePlaneadoMs) -
            Math.abs(Number(b.timingBucketMs) - ajustePlaneadoMs)
        );

    const mejor =
      ordenadas[0];

    const distanciaBucketMs =
      Math.abs(
        Number(mejor.timingBucketMs) -
        ajustePlaneadoMs
      );

    const muestras =
      Number(mejor?.total || 0);

    const accuracy =
      Number.isFinite(Number(mejor?.accuracy))
        ? Number(mejor.accuracy)
        : (
            muestras > 0
              ? this.redondear(
                  (Number(mejor?.ganadas || 0) / muestras) * 100
                )
              : null
          );

    if (
      distanciaBucketMs >
        BUY_TIMING_DECISION_CONTROL.maxBucketDistanceMs ||
      muestras <
        BUY_TIMING_DECISION_CONTROL.minimumSamples
    ) {
      return {
        disponible: true,
        bloquear: false,
        apoyar: false,
        clasificacion: "SIN_EVIDENCIA",
        decision: "APRENDER",
        mercado,
        direccion,
        ajustePlaneadoMs,
        timingBucketMs: Number(mejor.timingBucketMs),
        distanciaBucketMs,
        muestras,
        accuracy,
        motivo: "El bucket BUY cercano todavía no tiene evidencia suficiente."
      };
    }

    const favorable =
      accuracy >=
        BUY_TIMING_DECISION_CONTROL.favorableAccuracy;

    const riesgo =
      accuracy <=
        BUY_TIMING_DECISION_CONTROL.riskAccuracy;

    const resultado = {
      disponible: true,
      bloquear: riesgo,
      apoyar: favorable,
      clasificacion:
        favorable
          ? "FAVORABLE"
          : (riesgo ? "RIESGO" : "NEUTRO"),
      decision:
        favorable
          ? "CONFIRMAR"
          : (riesgo ? "NO_OPERAR" : "APRENDER"),
      mercado,
      direccion,
      ajustePlaneadoMs,
      timingBucketMs: Number(mejor.timingBucketMs),
      distanciaBucketMs,
      muestras,
      ganadas: Number(mejor?.ganadas || 0),
      perdidas: Number(mejor?.perdidas || 0),
      accuracy,
      promedioTimingMs:
        this.numeroSeguro(mejor?.promedioTimingMs),
      motivo:
        favorable
          ? "El timing BUY planeado coincide con una zona históricamente favorable."
          : (
              riesgo
                ? "El timing BUY planeado coincide con una zona históricamente riesgosa."
                : "El timing BUY planeado todavía es neutral."
            )
    };

    this.ultimoAnalisisTimingBuy = {
      ...resultado
    };

    this.emitirEvento(
      "bot:buy-timing-evaluated",
      resultado
    );

    return resultado;

  }


  /* ========================================
     FIX14.5 · EVIDENCIA FAVORABLE + PROTECCIÓN
     ======================================== */

  analizarEvidenciaFavorable(
    senal,
    analisisPatron = null,
    analisisMovimientoParidad = null,
    analisisTimingBuy = null
  ) {

    const estrategia = String(
      senal?.estrategia || ""
    ).trim().toLowerCase();

    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );

    if (
      !FAVORABLE_EVIDENCE_CONTROL.enabled ||
      !(estrategia === "even_odd" || estrategia === "even/odd") ||
      !["EVEN", "ODD"].includes(direccion)
    ) {
      return {
        disponible: false,
        bloquear: false,
        clasificacion: "NO_APLICA",
        decision: "OPERAR",
        mercado,
        direccion
      };
    }

    const finalizadas =
      (Array.isArray(this.historialTelemetria)
        ? this.historialTelemetria
        : [])
      .filter(item =>
        ["GANADA", "PERDIDA"].includes(item?.resultado) &&
        this.normalizarMercado(item?.mercado) === mercado &&
        String(item?.estrategia || "").trim().toLowerCase() === estrategia
      );

    let perdidasConsecutivas = 0;
    for (const item of finalizadas) {
      if (item?.resultado !== "PERDIDA") break;
      perdidasConsecutivas += 1;
    }

    const soportes = [];

    const agregarSoporte = (
      nombre,
      analisis,
      minimoMuestras,
      minimoAccuracy
    ) => {
      const muestras = Number(analisis?.muestras || 0);
      const accuracy = Number(analisis?.accuracy);
      const favorable =
        analisis?.clasificacion === "FAVORABLE" &&
        muestras >= minimoMuestras &&
        Number.isFinite(accuracy) &&
        accuracy >= minimoAccuracy;

      if (favorable) {
        soportes.push({
          nombre,
          muestras,
          accuracy: this.redondear(accuracy),
          fuerte:
            muestras >= FAVORABLE_EVIDENCE_CONTROL.strongSingleEvidenceSamples &&
            accuracy >= FAVORABLE_EVIDENCE_CONTROL.strongSingleEvidenceAccuracy
        });
      }
    };

    agregarSoporte(
      "PATRON",
      analisisPatron,
      PATTERN_CONTROL.minimumDecisionSamples,
      PATTERN_CONTROL.favorableAccuracy
    );

    agregarSoporte(
      "MOVIMIENTO_PARIDAD",
      analisisMovimientoParidad,
      PARITY_MOVEMENT_CONTROL.minimumDecisionSamples,
      PARITY_MOVEMENT_CONTROL.favorableAccuracy
    );

    const timingMuestras = Number(analisisTimingBuy?.muestras || 0);
    const timingAccuracy = Number(analisisTimingBuy?.accuracy);
    if (
      analisisTimingBuy?.apoyar === true &&
      timingMuestras >= BUY_TIMING_DECISION_CONTROL.minimumSamples &&
      Number.isFinite(timingAccuracy) &&
      timingAccuracy >= BUY_TIMING_DECISION_CONTROL.favorableAccuracy
    ) {
      soportes.push({
        nombre: "TIMING_BUY",
        muestras: timingMuestras,
        accuracy: this.redondear(timingAccuracy),
        fuerte:
          timingMuestras >= FAVORABLE_EVIDENCE_CONTROL.strongSingleEvidenceSamples &&
          timingAccuracy >= FAVORABLE_EVIDENCE_CONTROL.strongSingleEvidenceAccuracy
      });
    }

    const confianza = Number(senal?.confianza);
    const confianzaValida =
      Number.isFinite(confianza) &&
      confianza >= FAVORABLE_EVIDENCE_CONTROL.minimumSignalConfidence;

    const soporteFuerte =
      soportes.some(item => item.fuerte === true);

    const calidadCombinada =
      this.redondear(
        soportes.reduce(
          (total, item) => total + Number(item.accuracy || 0),
          0
        )
      ) || 0;

    let soportesRequeridos =
      FAVORABLE_EVIDENCE_CONTROL.supportsNormal;

    if (perdidasConsecutivas >= 2) {
      soportesRequeridos =
        FAVORABLE_EVIDENCE_CONTROL.supportsAfterTwoLosses;
    }
    else if (perdidasConsecutivas === 1) {
      soportesRequeridos =
        FAVORABLE_EVIDENCE_CONTROL.supportsAfterOneLoss;
    }

    const pasaCantidad =
      soportes.length >= soportesRequeridos;

    const pasaCasoNormal =
      perdidasConsecutivas === 0 &&
      (
        soportes.length >= 2 ||
        (soportes.length >= 1 && soporteFuerte && confianzaValida)
      );

    const pasaTrasUnaPerdida =
      perdidasConsecutivas === 1 &&
      soportes.length >= 2 &&
      confianzaValida;

    const pasaTrasDosPerdidas =
      perdidasConsecutivas >= 2 &&
      soportes.length >= 2 &&
      confianzaValida &&
      calidadCombinada >=
        FAVORABLE_EVIDENCE_CONTROL.minimumCombinedQualityAfterTwoLosses;

    const permitir =
      pasaCantidad &&
      (
        pasaCasoNormal ||
        pasaTrasUnaPerdida ||
        pasaTrasDosPerdidas
      );

    const resultado = {
      disponible: true,
      bloquear:
        FAVORABLE_EVIDENCE_CONTROL.blockInsufficientEvidenceInAutomatic &&
        !permitir,
      clasificacion:
        permitir ? "EVIDENCIA_FAVORABLE" : "EVIDENCIA_INSUFICIENTE",
      decision:
        permitir ? "OPERAR" : "NO_OPERAR",
      mercado,
      direccion,
      confianza:
        Number.isFinite(confianza) ? this.redondear(confianza) : null,
      confianzaValida,
      perdidasConsecutivas,
      soportesRequeridos,
      soportesFavorables: soportes.length,
      soporteFuerte,
      calidadCombinada,
      soportes,
      motivo:
        permitir
          ? "La señal superó la puerta de evidencia favorable antes del BUY."
          : (
              perdidasConsecutivas >= 2
                ? "Protección reforzada tras pérdidas: falta evidencia favorable suficiente para reanudar BUY."
                : (
                    perdidasConsecutivas === 1
                      ? "Tras una pérdida se exigen dos confirmaciones favorables antes del siguiente BUY."
                      : "La señal no reúne evidencia favorable suficiente; se omite para priorizar calidad sobre cantidad."
                  )
            )
    };

    this.ultimoAnalisisEvidenciaFavorable = {
      ...resultado
    };

    this.emitirEvento(
      "bot:favorable-evidence-evaluated",
      resultado
    );

    return resultado;
  }


  /* ========================================
     FIX14.9 · FAVORABLE ZONE GATE
     ======================================== */

  analizarOportunidadHistorica(
    senal,
    analisisPatron = null
  ) {

    const estrategia = String(
      senal?.estrategia || ""
    ).trim().toLowerCase();

    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );

    if (
      !HISTORICAL_OPPORTUNITY_CONTROL.enabled ||
      !(estrategia === "even_odd" || estrategia === "even/odd") ||
      !["EVEN", "ODD"].includes(direccion)
    ) {
      return {
        disponible: false,
        permitir: false,
        clasificacion: "NO_APLICA",
        decision: "ESPERAR",
        mercado,
        direccion
      };
    }

    const confianza = Number(senal?.confianza);

    if (
      !Number.isFinite(confianza) ||
      confianza < HISTORICAL_OPPORTUNITY_CONTROL.minimumSignalConfidence
    ) {
      return {
        disponible: true,
        permitir: false,
        clasificacion: "CONFIANZA_BAJA",
        decision: "ESPERAR",
        mercado,
        direccion,
        confianza: Number.isFinite(confianza)
          ? this.redondear(confianza)
          : null,
        candidatos: []
      };
    }

    const firmaActual = this.crearFirmaPatron(senal);

    const finalizadas =
      (Array.isArray(this.historialTelemetria)
        ? this.historialTelemetria
        : [])
      .filter(item =>
        ["GANADA", "PERDIDA"].includes(item?.resultado) &&
        this.normalizarMercado(item?.mercado) === mercado &&
        String(item?.estrategia || "").trim().toLowerCase() === estrategia
      );

    let perdidasConsecutivas = 0;
    for (const item of finalizadas) {
      if (item?.resultado !== "PERDIDA") break;
      perdidasConsecutivas += 1;
    }

    let minimoMuestras = HISTORICAL_OPPORTUNITY_CONTROL.minimumSamples;
    let minimoAccuracy = HISTORICAL_OPPORTUNITY_CONTROL.minimumAccuracy;
    let minimoAccuracyAgregada =
      HISTORICAL_OPPORTUNITY_CONTROL.directionAggregateMinimumAccuracy;

    if (perdidasConsecutivas >= 2) {
      minimoMuestras = HISTORICAL_OPPORTUNITY_CONTROL.afterTwoLossesMinimumSamples;
      minimoAccuracy = HISTORICAL_OPPORTUNITY_CONTROL.afterTwoLossesMinimumAccuracy;
      minimoAccuracyAgregada =
        HISTORICAL_OPPORTUNITY_CONTROL.afterTwoLossesAggregateAccuracy;
    }
    else if (perdidasConsecutivas === 1) {
      minimoMuestras = HISTORICAL_OPPORTUNITY_CONTROL.afterOneLossMinimumSamples;
      minimoAccuracy = HISTORICAL_OPPORTUNITY_CONTROL.afterOneLossMinimumAccuracy;
      minimoAccuracyAgregada =
        HISTORICAL_OPPORTUNITY_CONTROL.afterOneLossAggregateAccuracy;
    }

    const distancia = (a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isFinite(na) || !Number.isFinite(nb)) return null;
      return Math.abs(na - nb);
    };

    const estrategiaNormalizada = this.normalizarTexto(estrategia);

    const patronesDireccion = Object.values(this.memoriaPatrones || {})
      .filter(item =>
        this.normalizarMercado(item?.mercado) === mercado &&
        this.normalizarTexto(item?.estrategia) === estrategiaNormalizada &&
        this.normalizarTexto(item?.direccion) === direccion &&
        Number(item?.total || 0) > 0
      );

    const candidatos = patronesDireccion
      .filter(item =>
        Number(item?.total || 0) >= minimoMuestras &&
        Number(item?.accuracy || 0) >= minimoAccuracy
      )
      .map(item => {
        const dc = distancia(item?.confianzaBucket, firmaActual.confianzaBucket);
        const ds = distancia(item?.scoreBucket, firmaActual.scoreBucket);
        const dv = distancia(item?.valorBucket, firmaActual.valorBucket);

        if (dc !== null && dc > HISTORICAL_OPPORTUNITY_CONTROL.maxConfidenceBucketDistance) return null;
        if (ds !== null && ds > HISTORICAL_OPPORTUNITY_CONTROL.maxScoreBucketDistance) return null;
        if (dv !== null && dv > HISTORICAL_OPPORTUNITY_CONTROL.maxValueBucketDistance) return null;

        let cercania = 100;
        if (dc !== null) cercania -= Math.min(20, dc * 2);
        if (ds !== null) cercania -= Math.min(20, ds * 0.8);
        if (dv !== null) cercania -= Math.min(20, dv * 0.8);

        const muestras = Number(item?.total || 0);
        const accuracy = Number(item?.accuracy || 0);
        const pesoMuestras = Math.min(100, 55 + (muestras * 5));
        const scoreOportunidad = this.redondear(
          (accuracy * 0.55) +
          (cercania * 0.30) +
          (pesoMuestras * 0.15)
        );

        return {
          key: item?.key || null,
          muestras,
          ganadas: Number(item?.ganadas || 0),
          perdidas: Number(item?.perdidas || 0),
          accuracy: this.redondear(accuracy),
          confianzaBucket: item?.confianzaBucket ?? null,
          scoreBucket: item?.scoreBucket ?? null,
          valorBucket: item?.valorBucket ?? null,
          distanciaConfianza: dc,
          distanciaScore: ds,
          distanciaValor: dv,
          cercania: this.redondear(cercania),
          scoreOportunidad
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        Number(b.scoreOportunidad || 0) - Number(a.scoreOportunidad || 0)
      )
      .slice(0, HISTORICAL_OPPORTUNITY_CONTROL.maxCandidates);

    const mejor = candidatos[0] || null;

    const patronActualFavorable =
      analisisPatron?.clasificacion === "FAVORABLE" &&
      Number(analisisPatron?.muestras || 0) >=
        HISTORICAL_OPPORTUNITY_CONTROL.currentPatternMinimumSamples &&
      Number(analisisPatron?.accuracy || 0) >=
        HISTORICAL_OPPORTUNITY_CONTROL.currentPatternMinimumAccuracy;

    const candidatoFuerte =
      Boolean(mejor) &&
      Number(mejor?.scoreOportunidad || 0) >=
        HISTORICAL_OPPORTUNITY_CONTROL.minimumWeightedScore;

    const totalDireccion = patronesDireccion.reduce(
      (total, item) => total + Number(item?.total || 0),
      0
    );
    const ganadasDireccion = patronesDireccion.reduce(
      (total, item) => total + Number(item?.ganadas || 0),
      0
    );
    const accuracyDireccion = totalDireccion > 0
      ? this.redondear((ganadasDireccion / totalDireccion) * 100)
      : null;

    const direccionHistoricamenteFavorable =
      totalDireccion >=
        HISTORICAL_OPPORTUNITY_CONTROL.directionAggregateMinimumSamples &&
      Number(accuracyDireccion || 0) >= minimoAccuracyAgregada;

    const patronesFavorables = patronesDireccion.filter(item =>
      Number(item?.total || 0) >= 3 &&
      Number(item?.accuracy || 0) >=
        HISTORICAL_OPPORTUNITY_CONTROL.favorableClusterMinimumAccuracy
    );

    const muestrasCluster = patronesFavorables.reduce(
      (total, item) => total + Number(item?.total || 0),
      0
    );
    const ganadasCluster = patronesFavorables.reduce(
      (total, item) => total + Number(item?.ganadas || 0),
      0
    );
    const accuracyCluster = muestrasCluster > 0
      ? this.redondear((ganadasCluster / muestrasCluster) * 100)
      : null;

    const clusterFavorable =
      patronesFavorables.length >=
        HISTORICAL_OPPORTUNITY_CONTROL.favorableClusterMinimumPatterns &&
      muestrasCluster >=
        HISTORICAL_OPPORTUNITY_CONTROL.favorableClusterMinimumSamples &&
      Number(accuracyCluster || 0) >= minimoAccuracyAgregada;

    /*
      FIX14.9 · ZONA HISTÓRICAMENTE FAVORABLE
      Suma evidencia de firmas vecinas para evitar que
      la memoria quede fragmentada en patrones pequeños.
    */
    let minimoAccuracyZona =
      HISTORICAL_OPPORTUNITY_CONTROL.zoneMinimumAccuracy;

    if (perdidasConsecutivas >= 2) {
      minimoAccuracyZona =
        HISTORICAL_OPPORTUNITY_CONTROL.afterTwoLossesZoneMinimumAccuracy;
    }
    else if (perdidasConsecutivas === 1) {
      minimoAccuracyZona =
        HISTORICAL_OPPORTUNITY_CONTROL.afterOneLossZoneMinimumAccuracy;
    }

    const patronesZona = patronesDireccion
      .map(item => {
        const dc = distancia(item?.confianzaBucket, firmaActual.confianzaBucket);
        const ds = distancia(item?.scoreBucket, firmaActual.scoreBucket);
        const dv = distancia(item?.valorBucket, firmaActual.valorBucket);

        if (dc !== null && dc > HISTORICAL_OPPORTUNITY_CONTROL.zoneMaxConfidenceDistance) return null;
        if (ds !== null && ds > HISTORICAL_OPPORTUNITY_CONTROL.zoneMaxScoreDistance) return null;
        if (dv !== null && dv > HISTORICAL_OPPORTUNITY_CONTROL.zoneMaxValueDistance) return null;

        let cercaniaZona = 100;
        if (dc !== null) cercaniaZona -= Math.min(30, dc * 1.5);
        if (ds !== null) cercaniaZona -= Math.min(25, ds * 0.625);
        if (dv !== null) cercaniaZona -= Math.min(25, dv * 0.625);

        cercaniaZona = this.redondear(cercaniaZona);

        if (cercaniaZona < HISTORICAL_OPPORTUNITY_CONTROL.zoneMinimumCloseness) return null;

        return { item, cercaniaZona };
      })
      .filter(Boolean);

    const muestrasZona = patronesZona.reduce(
      (total, x) => total + Number(x?.item?.total || 0), 0
    );

    const ganadasZona = patronesZona.reduce(
      (total, x) => total + Number(x?.item?.ganadas || 0), 0
    );

    const perdidasZona = Math.max(0, muestrasZona - ganadasZona);

    const accuracyZona = muestrasZona > 0
      ? this.redondear((ganadasZona / muestrasZona) * 100)
      : null;

    const cercaniaZonaPromedio = muestrasZona > 0
      ? this.redondear(
          patronesZona.reduce(
            (total, x) =>
              total + (Number(x?.cercaniaZona || 0) * Number(x?.item?.total || 0)),
            0
          ) / muestrasZona
        )
      : null;

    const zonaFavorableBase =
      HISTORICAL_OPPORTUNITY_CONTROL.zoneEnabled &&
      patronesZona.length >= HISTORICAL_OPPORTUNITY_CONTROL.zoneMinimumPatterns &&
      muestrasZona >= HISTORICAL_OPPORTUNITY_CONTROL.zoneMinimumSamples &&
      Number(accuracyZona || 0) >= minimoAccuracyZona;

    const zonaFavorableFuerte =
      HISTORICAL_OPPORTUNITY_CONTROL.zoneEnabled &&
      muestrasZona >= HISTORICAL_OPPORTUNITY_CONTROL.zoneStrongMinimumSamples &&
      Number(accuracyZona || 0) >= Math.max(
        minimoAccuracyZona,
        HISTORICAL_OPPORTUNITY_CONTROL.zoneStrongMinimumAccuracy
      );

    const zonaHistoricamenteFavorable =
      Boolean(zonaFavorableBase || zonaFavorableFuerte);

    const permitir = Boolean(
      patronActualFavorable ||
      candidatoFuerte ||
      zonaHistoricamenteFavorable ||
      direccionHistoricamenteFavorable ||
      clusterFavorable
    );

    const fuentePrioridad =
      patronActualFavorable
        ? "PATRON_ACTUAL"
        : candidatoFuerte
          ? "PATRON_CERCANO"
          : zonaHistoricamenteFavorable
            ? "ZONA_FAVORABLE"
            : clusterFavorable
              ? "CLUSTER_FAVORABLE"
              : direccionHistoricamenteFavorable
                ? "DIRECCION_HISTORICA"
                : null;

    const resultado = {
      disponible: true,
      permitir,
      clasificacion: permitir
        ? "OPORTUNIDAD_HISTORICA_PRIORITARIA"
        : "SIN_OPORTUNIDAD_HISTORICA",
      decision: permitir
        ? "PERMITIR_POR_PRIORIDAD_FAVORABLE"
        : "ESPERAR",
      fuentePrioridad,
      mercado,
      estrategia,
      direccion,
      confianza: this.redondear(confianza),
      perdidasConsecutivas,
      minimoMuestras,
      minimoAccuracy,
      minimoAccuracyAgregada,
      patronActualFavorable,
      mejorCandidato: mejor,
      resumenDireccion: {
        muestras: totalDireccion,
        ganadas: ganadasDireccion,
        perdidas: Math.max(0, totalDireccion - ganadasDireccion),
        accuracy: accuracyDireccion,
        favorable: direccionHistoricamenteFavorable
      },
      resumenCluster: {
        patrones: patronesFavorables.length,
        muestras: muestrasCluster,
        ganadas: ganadasCluster,
        perdidas: Math.max(0, muestrasCluster - ganadasCluster),
        accuracy: accuracyCluster,
        favorable: clusterFavorable
      },
      resumenZona: {
        patrones: patronesZona.length,
        muestras: muestrasZona,
        ganadas: ganadasZona,
        perdidas: perdidasZona,
        accuracy: accuracyZona,
        cercaniaPromedio: cercaniaZonaPromedio,
        minimoAccuracy: minimoAccuracyZona,
        favorable: zonaHistoricamenteFavorable
      },
      candidatos,
      motivo: permitir
        ? (
            fuentePrioridad === "PATRON_ACTUAL"
              ? "El patrón actual ya tiene evidencia favorable suficiente."
              : fuentePrioridad === "PATRON_CERCANO"
                ? "La señal coincide con un patrón histórico ganador cercano."
                : fuentePrioridad === "ZONA_FAVORABLE"
                  ? "La señal cayó dentro de una zona histórica favorable formada por antecedentes cercanos."
                  : fuentePrioridad === "CLUSTER_FAVORABLE"
                    ? "Varios patrones favorables de esta dirección forman una zona ganadora consistente."
                    : "El historial agregado de esta dirección mantiene ventaja suficiente para priorizar la entrada."
          )
        : "No existe evidencia histórica favorable suficiente para priorizar esta entrada."
    };

    this.ultimoAnalisisOportunidadHistorica = { ...resultado };

    this.emitirEvento(
      "bot:historical-opportunity-evaluated",
      resultado
    );

    return resultado;

  }

  /* ========================================
     FIX14.3 · GUARDIA DE RÉGIMEN / RACHAS
     ======================================== */

  analizarRegimenRacha(
    senal,
    analisisMovimientoParidad = null
  ) {

    const estrategia = String(
      senal?.estrategia || ""
    ).trim().toLowerCase();

    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );

    /*
      FIX: el Regime Guard aplicaba únicamente a
      even_odd (EVEN/ODD), dejando sin protección a
      rise_fall, over_under y match ante rachas de
      pérdidas consecutivas. Se generaliza a cualquier
      estrategia con una dirección operable.
    */
    if (
      !REGIME_GUARD_CONTROL.enabled ||
      !direccion ||
      ["WAIT", "NO_OPERAR", ""].includes(direccion)
    ) {
      return {
        disponible: false,
        bloquear: false,
        clasificacion: "NO_APLICA",
        decision: "OPERAR",
        direccion,
        mercado
      };
    }

    const finalizadas =
      (Array.isArray(this.historialTelemetria)
        ? this.historialTelemetria
        : [])
      .filter(item =>
        ["GANADA", "PERDIDA"].includes(item?.resultado) &&
        this.normalizarMercado(item?.mercado) === mercado &&
        String(item?.estrategia || "").trim().toLowerCase() === estrategia
      );

    if (
      finalizadas.length <
        REGIME_GUARD_CONTROL.minFinishedOperations
    ) {
      const resultado = {
        disponible: true,
        bloquear: false,
        clasificacion: "APRENDIENDO",
        decision: "OPERAR",
        direccion,
        mercado,
        muestras: finalizadas.length,
        motivo: "Aún no hay suficientes operaciones cerradas para activar la guardia de rachas."
      };
      this.ultimoAnalisisRegimenRacha = resultado;
      return resultado;
    }

    const recientes =
      finalizadas.slice(
        0,
        REGIME_GUARD_CONTROL.recentWindow
      );

    let rachaPerdidasGlobal = 0;
    for (const item of finalizadas) {
      if (item?.resultado !== "PERDIDA") break;
      rachaPerdidasGlobal += 1;
    }

    const mismaDireccion =
      finalizadas.filter(
        item =>
          this.normalizarTexto(item?.direccion) === direccion
      );

    let rachaPerdidasDireccion = 0;
    for (const item of mismaDireccion) {
      if (item?.resultado !== "PERDIDA") break;
      rachaPerdidasDireccion += 1;
    }

    const perdidasRecientes =
      recientes.filter(
        item => item?.resultado === "PERDIDA"
      ).length;

    const disparadorGlobal =
      rachaPerdidasGlobal >=
        REGIME_GUARD_CONTROL.globalConsecutiveLosses;

    const disparadorDireccion =
      rachaPerdidasDireccion >=
        REGIME_GUARD_CONTROL.directionConsecutiveLosses;

    const disparadorVentana =
      recientes.length >= REGIME_GUARD_CONTROL.recentWindow &&
      perdidasRecientes >= REGIME_GUARD_CONTROL.recentLossesToWarn;

    const movimientoFavorableFuerte =
      analisisMovimientoParidad?.clasificacion === "FAVORABLE" &&
      Number(analisisMovimientoParidad?.muestras || 0) >=
        PARITY_MOVEMENT_CONTROL.minimumDecisionSamples;

    const hayRiesgo =
      disparadorGlobal ||
      disparadorDireccion ||
      disparadorVentana;

    const idsHuella =
      finalizadas
        .slice(0, 4)
        .map(item =>
          String(
            item?.operacionId ||
            item?.id ||
            item?.resultReceivedEpoch ||
            item?.buyConfirmedEpoch ||
            "SIN_ID"
          )
        )
        .join("|");

    const fingerprint = [
      mercado,
      direccion,
      rachaPerdidasGlobal,
      rachaPerdidasDireccion,
      perdidasRecientes,
      idsHuella
    ].join("::");

    const mapKey =
      `${mercado}|${direccion}`;

    const yaSaltado =
      this.regimeGuardSkips instanceof Map &&
      this.regimeGuardSkips.get(mapKey) === fingerprint;

    const riesgoFiltrable =
      hayRiesgo &&
      !(
        REGIME_GUARD_CONTROL.requireNonFavorableMovement &&
        movimientoFavorableFuerte
      );

    const bloquear =
      riesgoFiltrable &&
      !(
        REGIME_GUARD_CONTROL.blockOnlyOneSignalPerFingerprint &&
        yaSaltado
      );

    const resultado = {
      disponible: true,
      bloquear,
      clasificacion: hayRiesgo ? "RIESGO_RACHA" : "NORMAL",
      decision: bloquear
        ? "NO_OPERAR_UNA_SENAL"
        : (yaSaltado && riesgoFiltrable
            ? "REANUDAR_TRAS_SALTO"
            : "OPERAR"),
      direccion,
      mercado,
      muestras: finalizadas.length,
      rachaPerdidasGlobal,
      rachaPerdidasDireccion,
      perdidasRecientes,
      ventana: recientes.length,
      movimientoFavorableFuerte,
      fingerprint,
      yaSaltado,
      motivo: bloquear
        ? "Racha perdedora reciente detectada; se omite una señal automática para reducir exposición."
        : (movimientoFavorableFuerte && hayRiesgo
            ? "Hay racha de riesgo, pero el movimiento EVEN/ODD tiene evidencia favorable suficiente."
            : "Sin bloqueo de régimen para esta señal.")
    };

    this.ultimoAnalisisRegimenRacha = resultado;

    this.emitirEvento(
      "bot:regime-guard-evaluated",
      resultado
    );

    return resultado;

  }


  marcarSaltoRegimen(
    analisis
  ) {

    if (
      !analisis?.fingerprint ||
      !analisis?.mercado ||
      !analisis?.direccion
    ) {
      return false;
    }

    if (!(this.regimeGuardSkips instanceof Map)) {
      this.regimeGuardSkips = new Map();
    }

    this.regimeGuardSkips.set(
      `${analisis.mercado}|${analisis.direccion}`,
      analisis.fingerprint
    );

    return true;

  }


  registrarResultadoMovimientoParidad(
    telemetria
  ) {

    if (
      !telemetria ||
      !["GANADA", "PERDIDA"].includes(
        telemetria.resultado
      )
    ) {
      return null;
    }

    const firma =
      telemetria.movimientoParidadFirma ||
      null;

    const key =
      telemetria.movimientoParidadKey ||
      firma?.key ||
      null;

    if (
      !key ||
      !firma?.disponible
    ) {
      return null;
    }

    const anterior =
      this.memoriaMovimientoParidad[key] || {
        key,
        mercado: firma.mercado,
        direccion: firma.direccion,
        ultimo: firma.ultimo,
        rachaBucket: firma.rachaBucket,
        alternancia: firma.alternancia,
        sesgo5: firma.sesgo5,
        sesgo10: firma.sesgo10,
        total: 0,
        ganadas: 0,
        perdidas: 0,
        ultimosResultados: [],
        createdAt: Date.now()
      };

    anterior.total += 1;

    if (
      telemetria.resultado === "GANADA"
    ) {
      anterior.ganadas += 1;
    }
    else {
      anterior.perdidas += 1;
    }

    anterior.accuracy =
      this.redondear(
        (anterior.ganadas / anterior.total) * 100
      );

    anterior.ultimaSecuencia =
      firma.secuencia || null;

    anterior.ultimosResultados.unshift({
      resultado: telemetria.resultado,
      secuencia: firma.secuencia || null,
      entradaRealMs:
        this.numeroSeguro(
          telemetria.manualClickToTargetMs
        ) ??
        this.numeroSeguro(
          telemetria.targetToBuyMs
        ),
      at: Date.now()
    });

    if (
      anterior.ultimosResultados.length >
        PARITY_MOVEMENT_CONTROL.maxRecentResults
    ) {
      anterior.ultimosResultados.length =
        PARITY_MOVEMENT_CONTROL.maxRecentResults;
    }

    const nueva =
      this.clasificarMovimientoParidadHistorico(
        anterior
      );

    anterior.clasificacion =
      nueva.clasificacion;

    anterior.fuerza =
      nueva.fuerza;

    anterior.decision =
      nueva.decision;

    anterior.bloquear =
      nueva.bloquear;

    anterior.updatedAt =
      Date.now();

    this.memoriaMovimientoParidad[key] =
      anterior;

    const guardado =
      this.persistirMemoriaMovimientoParidad();

    const evento = {
      ok: guardado,
      ...anterior
    };

    this.emitirEvento(
      "bot:parity-movement-updated",
      evento
    );

    return evento;

  }


  /* ========================================
     REGISTRAR RESULTADO EN MEMORIA
     FIX13.8.1
     ======================================== */

  registrarResultadoPatron(
    telemetria
  ) {

    if (
      !telemetria ||
      !(
        telemetria.resultado ===
          "GANADA" ||
        telemetria.resultado ===
          "PERDIDA"
      )
    ) {

      return null;

    }


    const firma =
      telemetria.patronFirma ||
      null;


    const key =
      telemetria.patronKey ||
      firma?.key ||
      null;


    if (
      !key
    ) {

      console.warn(
        "FIX13.8.1 · No se pudo registrar patrón: falta patronKey."
      );


      return null;

    }


    const anterior =
      this.memoriaPatrones[
        key
      ] ||
      {

        key,

        version:
          PATTERN_VERSION,

        mercado:
          firma?.mercado ??
          telemetria.mercado ??
          null,

        estrategia:
          firma?.estrategia ??
          telemetria.estrategia ??
          null,

        direccion:
          firma?.direccion ??
          telemetria.direccion ??
          null,

        valorPatron:
          firma?.valorPatron ??
          telemetria.valorPatron ??
          null,

        valorBucket:
          firma?.valorBucket ??
          null,

        confianzaBucket:
          firma?.confianzaBucket ??
          null,

        scoreBucket:
          firma?.scoreBucket ??
          null,

        total:
          0,

        ganadas:
          0,

        perdidas:
          0,

        accuracy:
          null,

        sumaTimingMs:
          0,

        muestrasTiming:
          0,

        sumaManualClickTargetMs:
          0,

        muestrasManualClickTarget:
          0,

        sumaBuyTargetMs:
          0,

        muestrasBuyTarget:
          0,

        promedioTimingMs:
          null,

        promedioManualClickTargetMs:
          null,

        promedioBuyTargetMs:
          null,

        clasificacion:
          "SIN_EVIDENCIA",

        fuerza:
          "RECOPILANDO",

        decision:
          "APRENDER",

        ultimosResultados:
          [],

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()

      };


    /* ====================================
       CONTAR OPERACIÓN
       ==================================== */

    anterior.total =
      Number(
        anterior.total ??
        0
      ) +
      1;


    if (
      telemetria.resultado ===
      "GANADA"
    ) {

      anterior.ganadas =
        Number(
          anterior.ganadas ??
          0
        ) +
        1;

    }


    if (
      telemetria.resultado ===
      "PERDIDA"
    ) {

      anterior.perdidas =
        Number(
          anterior.perdidas ??
          0
        ) +
        1;

    }


    /* ====================================
       TIMING SEGURO

       IMPORTANTE:
       null NO se convierte en 0.
       ==================================== */

    const manualTimingSeguro =
      this.numeroSeguro(
        telemetria
          .manualClickToTargetMs
      );


    const buyTimingSeguro =
      this.numeroSeguro(
        telemetria
          .buyTargetDeviationMs
      );


    const timingPrincipal =
      manualTimingSeguro !==
        null
        ? manualTimingSeguro
        : buyTimingSeguro;


    /* ====================================
       TIMING PRINCIPAL
       ==================================== */

    if (
      timingPrincipal !==
        null
    ) {

      anterior.sumaTimingMs =
        Number(
          anterior.sumaTimingMs ??
          0
        ) +
        timingPrincipal;


      anterior.muestrasTiming =
        Number(
          anterior.muestrasTiming ??
          0
        ) +
        1;


      anterior.promedioTimingMs =
        this.redondear(
          anterior.sumaTimingMs /
          anterior.muestrasTiming
        );

    }


    /* ====================================
       TIMING MANUAL
       ==================================== */

    if (
      manualTimingSeguro !==
        null
    ) {

      anterior
        .sumaManualClickTargetMs =
        Number(
          anterior
            .sumaManualClickTargetMs ??
          0
        ) +
        manualTimingSeguro;


      anterior
        .muestrasManualClickTarget =
        Number(
          anterior
            .muestrasManualClickTarget ??
          0
        ) +
        1;


      anterior
        .promedioManualClickTargetMs =
        this.redondear(
          anterior
            .sumaManualClickTargetMs /
          anterior
            .muestrasManualClickTarget
        );

    }


    /* ====================================
       TIMING BUY
       AUTOMÁTICO O MANUAL
       ==================================== */

    if (
      buyTimingSeguro !==
        null
    ) {

      anterior.sumaBuyTargetMs =
        Number(
          anterior.sumaBuyTargetMs ??
          0
        ) +
        buyTimingSeguro;


      anterior.muestrasBuyTarget =
        Number(
          anterior.muestrasBuyTarget ??
          0
        ) +
        1;


      anterior.promedioBuyTargetMs =
        this.redondear(
          anterior.sumaBuyTargetMs /
          anterior.muestrasBuyTarget
        );

    }


    /* ====================================
       ACCURACY DEL PATRÓN
       ==================================== */

    anterior.accuracy =
      anterior.total >
        0
        ? this.redondear(
            (
              anterior.ganadas /
              anterior.total
            ) *
              100
          )
        : null;


    /* ====================================
       GUARDAR ÚLTIMO RESULTADO
       ==================================== */

    const resumenResultado = {

      resultado:
        telemetria.resultado,

      fecha:
        Date.now(),

      mercado:
        telemetria.mercado ??
        null,

      estrategia:
        telemetria.estrategia ??
        null,

      direccion:
        telemetria.direccion ??
        null,

      confianza:
        telemetria.confianza ??
        null,

      scoreBruto:
        telemetria.scoreBruto ??
        null,

      valorPatron:
        telemetria.valorPatron ??
        null,

      modo:
        telemetria.modoEjecucion ??
        null,

      clickTargetMs:
        manualTimingSeguro,

      buyTargetMs:
        buyTimingSeguro,

      profit:
        telemetria.profit ??
        null,

      contractId:
        telemetria.contractId ??
        null

    };


    if (
      !Array.isArray(
        anterior.ultimosResultados
      )
    ) {

      anterior.ultimosResultados =
        [];

    }


    anterior
      .ultimosResultados
      .unshift(
        resumenResultado
      );


    if (
      anterior
        .ultimosResultados
        .length >
      PATTERN_CONTROL
        .maxRecentResults
    ) {

      anterior
        .ultimosResultados
        .length =
        PATTERN_CONTROL
          .maxRecentResults;

    }


    /* ====================================
       RECLASIFICAR PATRÓN
       ==================================== */

    const nuevaClasificacion =
      this.clasificarPatronHistorico(
        anterior
      );


    anterior.clasificacion =
      nuevaClasificacion
        .clasificacion;


    anterior.fuerza =
      nuevaClasificacion
        .fuerza;


    anterior.decision =
      nuevaClasificacion
        .decision;


    anterior.bloquear =
      nuevaClasificacion
        .bloquear;


    anterior.updatedAt =
      Date.now();


    /* ====================================
       GUARDAR EN MEMORIA
       ==================================== */

    this.memoriaPatrones[
      key
    ] =
      anterior;


    const guardado =
      this.persistirMemoriaPatrones();


    this.registrarTimingDireccion(telemetria);


    /*
      La analítica del mercado también
      debe actualizarse después de
      aprender un nuevo resultado.
    */

    this.invalidarCacheAnalitica();


    /* ====================================
       RESULTADO PARA INTERFAZ
       ==================================== */

    const evento = {

      ok:
        guardado,

      key,

      mercado:
        anterior.mercado,

      estrategia:
        anterior.estrategia,

      direccion:
        anterior.direccion,

      valorPatron:
        anterior.valorPatron ??
        null,

      valorBucket:
        anterior.valorBucket ??
        null,

      confianzaBucket:
        anterior.confianzaBucket ??
        null,

      scoreBucket:
        anterior.scoreBucket ??
        null,

      total:
        anterior.total,

      muestras:
        anterior.total,

      ganadas:
        anterior.ganadas,

      perdidas:
        anterior.perdidas,

      accuracy:
        anterior.accuracy,

      clasificacion:
        anterior.clasificacion,

      fuerza:
        anterior.fuerza,

      decision:
        anterior.decision,

      bloquear:
        anterior.bloquear,

      promedioTimingMs:
        anterior.promedioTimingMs,

      promedioManualClickTargetMs:
        anterior
          .promedioManualClickTargetMs,

      promedioBuyTargetMs:
        anterior
          .promedioBuyTargetMs,

      ultimoResultado:
        telemetria.resultado

    };


    /*
      Actualizamos también el último
      análisis visible para que el
      resumen cambie inmediatamente.
    */

    this.ultimoAnalisisPatron =
      {

        key,

        mercado:
          anterior.mercado,

        estrategia:
          anterior.estrategia,

        direccion:
          anterior.direccion,

        valorPatron:
          anterior.valorPatron ??
          null,

        valorBucket:
          anterior.valorBucket ??
          null,

        confianzaBucket:
          anterior.confianzaBucket ??
          null,

        scoreBucket:
          anterior.scoreBucket ??
          null,

        total:
          anterior.total,

        muestras:
          anterior.total,

        ganadas:
          anterior.ganadas,

        perdidas:
          anterior.perdidas,

        accuracy:
          anterior.accuracy,

        clasificacion:
          anterior.clasificacion,

        fuerza:
          anterior.fuerza,

        decision:
          anterior.decision,

        bloquear:
          anterior.bloquear,

        promedioTimingMs:
          anterior.promedioTimingMs,

        promedioManualClickTargetMs:
          anterior
            .promedioManualClickTargetMs,

        promedioBuyTargetMs:
          anterior
            .promedioBuyTargetMs,

        ultimosResultados:
          [
            ...anterior
              .ultimosResultados
          ]

      };


    this.emitirEvento(
      "bot:pattern-updated",
      evento
    );


    console.log(
      "FIX13.8.1 · PATRÓN ACTUALIZADO:",
      evento
    );


    return evento;

  }


  /* ========================================
     RESUMEN MEMORIA
     ======================================== */

  obtenerResumenMemoriaPatrones() {

    const patrones =
      Object.values(
        this.memoriaPatrones
      );


    const favorables =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
          "FAVORABLE"
      );


    const riesgos =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
          "RIESGO"
      );


    const neutros =
      patrones.filter(
        (
          item
        ) =>
          item?.clasificacion ===
            "NEUTRO" ||
          item?.clasificacion ===
            "SIN_EVIDENCIA" ||
          !item?.clasificacion
      );


    const operaciones =
      patrones.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item?.total ??
            0
          ),
        0
      );


    return {

      version:
        PATTERN_VERSION,

      patrones:
        patrones.length,

      operaciones,

      favorables:
        favorables.length,

      riesgos:
        riesgos.length,

      sinEvidencia:
        neutros.length,

      minimumDecisionSamples:
        PATTERN_CONTROL
          .minimumDecisionSamples,

      favorableAccuracy:
        PATTERN_CONTROL
          .favorableAccuracy,

      riskAccuracy:
        PATTERN_CONTROL
          .riskAccuracy,

      learningMode:
        PATTERN_CONTROL
          .learningMode,

      filtroAutomatico:
        PATTERN_CONTROL
          .blockRiskInAutomatic

    };

  }


  obtenerPatronesOrdenados() {

    return Object
      .values(
        this.memoriaPatrones
      )
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b?.total ??
            0
          ) -
          Number(
            a?.total ??
            0
          )
      );

  }


  restablecerMemoriaPatrones() {

    this.memoriaPatrones =
      {};


    this.persistirMemoriaPatrones();


    this.ultimoAnalisisPatron =
      null;


    this.emitirEvento(
      "bot:pattern-memory-reset",
      {
        ok:
          true
      }
    );


    return {

      ok:
        true,

      mensaje:
        "Memoria de patrones restablecida."

    };

  }


  /* ========================================
     TESTLOG BASE
     ======================================== */

  obtenerTestLog() {

    return {

      generadoEn:
        new Date()
          .toISOString(),

      versionBot:
        TELEMETRY_VERSION,

      versionPatrones:
        PATTERN_VERSION,

      configuracion: {

        modoEjecucion:
          this.modoEjecucion,

        monto:
          this.configuracion
            .monto,

        calibracion:
          {
            ...this.calibracion
          },

        calibracionDireccion:
          {
            ...this.calibracionDireccion
          },

        patternControl:
          {
            ...PATTERN_CONTROL
          },

        directionTimingControl:
          {
            ...DIRECTION_TIMING_CONTROL
          },

        buyTimingDecisionControl:
          {
            ...BUY_TIMING_DECISION_CONTROL
          },

        regimeGuardControl:
          {
            ...REGIME_GUARD_CONTROL
          },

        historicalOpportunityControl:
          {
            ...HISTORICAL_OPPORTUNITY_CONTROL
          }

      },

      resumenMemoria:
        this
          .obtenerResumenMemoriaPatrones(),

      resumenTimingDireccion:
        this
          .obtenerResumenTimingDireccion(),

      auditoriaEstrategias:
        this
          .obtenerAuditoriaEstrategias(),

      patrones:
        this
          .obtenerPatronesOrdenados(),

      memoriaTimingDireccion:
        Object.values(
          this.memoriaTimingDireccion || {}
        ),

      telemetria:
        this.historialTelemetria
          .slice()

    };

  }


  /* ========================================
     MODO
     ======================================== */

  cargarModoEjecucion() {

    try {

      const guardado =
        String(
          localStorage.getItem(
            EXECUTION_MODE_KEY
          ) ||
          ""
        )
          .trim()
          .toUpperCase();


      if (
        guardado ===
        MODOS_EJECUCION.MANUAL
      ) {

        return MODOS_EJECUCION.MANUAL;

      }

    }

    catch {

      // sin almacenamiento

    }


    return MODOS_EJECUCION
      .AUTOMATICO;

  }


  guardarModoEjecucion() {

    try {

      localStorage.setItem(
        EXECUTION_MODE_KEY,
        this.modoEjecucion
      );


      return true;

    }

    catch {

      return false;

    }

  }


  establecerModoEjecucion(
    modo
  ) {

    const normalizado =
      String(
        modo ||
        ""
      )
        .trim()
        .toUpperCase();


    if (
      normalizado !==
        MODOS_EJECUCION
          .AUTOMATICO &&
      normalizado !==
        MODOS_EJECUCION
          .MANUAL
    ) {

      return {

        ok:
          false,

        mensaje:
          "Modo de ejecución no válido."

      };

    }


    if (
      normalizado !==
      this.modoEjecucion
    ) {

      this.preparaciones
        .clear();

      this.senalesEnProceso
        .clear();

      this.operacionActivaId =
        null;

    }


    this.modoEjecucion =
      normalizado;


    this.guardarModoEjecucion();


    this.emitirEvento(
      "bot:execution-mode",
      {

        modo:
          this.modoEjecucion

      }
    );


    return {

      ok:
        true,

      modo:
        this.modoEjecucion,

      mensaje:
        this.modoEjecucion ===
          MODOS_EJECUCION.MANUAL
          ? "Modo MANUAL DIAGNÓSTICO activo."
          : "Modo AUTOMÁTICO activo."

    };

  }


  obtenerModoEjecucion() {

    return this.modoEjecucion;

  }


  esModoManual() {

    return (
      this.modoEjecucion ===
      MODOS_EJECUCION.MANUAL
    );

  }


  /* ========================================
     MERCADO
     ======================================== */

  obtenerFamiliaMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    if (
      symbol.startsWith(
        "1HZ"
      )
    ) {

      return "1S";

    }


    if (
      symbol.startsWith(
        "R_"
      )
    ) {

      return "STANDARD";

    }


    return "OTHER";

  }


  mercadoControlado(
    mercado
  ) {

    return MERCADOS_CONTROLADOS
      .includes(
        this.normalizarMercado(
          mercado
        )
      );

  }


  obtenerRetrasoReferencia(
    mercado
  ) {

    const familia =
      this.obtenerFamiliaMercado(
        mercado
      );


    if (
      familia ===
      "1S"
    ) {

      return 100;

    }


    if (
      familia ===
      "STANDARD"
    ) {

      return 0;

    }


    return null;

  }


  /* ========================================
     FIX14.0 · TIMING POR DIRECCIÓN
     ======================================== */

  cargarMemoriaTimingDireccion() {
    try {
      const datos = JSON.parse(localStorage.getItem(DIRECTION_TIMING_KEY) || "{}");
      return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
    } catch { return {}; }
  }

  persistirMemoriaTimingDireccion() {
    try {
      const entradas = Object.entries(this.memoriaTimingDireccion || {})
        .sort((a,b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
        .slice(0, DIRECTION_TIMING_CONTROL.maxBuckets);
      this.memoriaTimingDireccion = Object.fromEntries(entradas);
      localStorage.setItem(DIRECTION_TIMING_KEY, JSON.stringify(this.memoriaTimingDireccion));
      return true;
    } catch { return false; }
  }

  cargarCalibracionDireccion() {
    try {
      const datos = JSON.parse(localStorage.getItem(DIRECTION_CALIBRATION_KEY) || "{}");
      const r = {...DIRECTION_CALIBRATION_DEFAULT};
      for (const dir of ["EVEN","ODD"]) {
        const v = Number(datos?.[dir]);
        if (DIRECTION_CALIBRATION_ALLOWED_MS.includes(v)) r[dir] = v;
      }
      return r;
    } catch { return {...DIRECTION_CALIBRATION_DEFAULT}; }
  }

  guardarCalibracionDireccion() {
    try {
      localStorage.setItem(DIRECTION_CALIBRATION_KEY, JSON.stringify(this.calibracionDireccion));
      return true;
    } catch { return false; }
  }

  establecerAjusteDireccion(direccion, ajusteMs) {
    const dir = this.normalizarTexto(direccion);
    const valor = Number(ajusteMs);
    if (!["EVEN","ODD"].includes(dir)) return {ok:false, mensaje:"Dirección no válida."};
    if (!DIRECTION_CALIBRATION_ALLOWED_MS.includes(valor)) return {ok:false, mensaje:"Ajuste no permitido."};
    this.calibracionDireccion[dir] = valor;
    this.guardarCalibracionDireccion();
    return {ok:true, direccion:dir, ajusteMs:valor, ajusteSeg:valor/1000};
  }

  obtenerAjusteSenal(senal) {
    const estrategia = String(senal?.estrategia || "").toLowerCase();
    const direccion = this.normalizarTexto(senal?.direccion);
    if (this.modoEjecucion === MODOS_EJECUCION.AUTOMATICO && (estrategia === "even_odd" || estrategia === "even/odd") && ["EVEN","ODD"].includes(direccion)) {
      return Number(this.calibracionDireccion[direccion] ?? 0);
    }
    return this.obtenerAjusteMercado(senal?.mercado);
  }

  registrarTimingDireccion(
  telemetria
) {

  if (
    !telemetria ||
    ![
      "GANADA",
      "PERDIDA"
    ].includes(
      telemetria.resultado
    )
  ) {

    return null;

  }


  const estrategia =
    String(
      telemetria.estrategia ||
      ""
    )
      .trim()
      .toLowerCase();


  const direccion =
    this.normalizarTexto(
      telemetria.direccion
    );


  if (
    !(
      estrategia ===
        "even_odd" ||
      estrategia ===
        "even/odd"
    ) ||
    ![
      "EVEN",
      "ODD"
    ].includes(
      direccion
    )
  ) {

    return null;

  }


  /*
    FIX14.1

    Para aprender el momento REAL
    de entrada usamos como referencia
    el TARGET visual/original.

    AUTOMÁTICO:
    targetToBuyMs =
    BUY - TARGET original.

    MANUAL:
    manualClickToTargetMs =
    CLIC - TARGET original.

    NO usamos como primera referencia
    buyTargetDeviationMs porque ese valor
    ya está afectado por la calibración
    programada del BOT.
  */

  let timing =
    null;


  if (
    telemetria.modoEjecucion ===
      MODOS_EJECUCION.MANUAL
  ) {

    timing =
      this.numeroSeguro(
        telemetria
          .manualClickToTargetMs
      );

  }

  else {

    timing =
      this.numeroSeguro(
        telemetria
          .targetToBuyMs
      );

  }


  /*
    Respaldo únicamente si el dato
    principal no está disponible.
  */

  if (
    timing ===
    null
  ) {

    timing =
      this.numeroSeguro(
        telemetria
          .buyTargetDeviationMs
      );

  }


  if (
    timing ===
    null
  ) {

    return null;

  }


  const bucket =
    Math.round(
      timing /
      DIRECTION_TIMING_CONTROL
        .timingBucketSizeMs
    ) *
    DIRECTION_TIMING_CONTROL
      .timingBucketSizeMs;


  const mercado =
    this.normalizarMercado(
      telemetria.mercado
    );


  const key = [

    mercado,

    "EVEN_ODD",

    direccion,

    `T${bucket}`

  ].join(
    "|"
  );


  const e =
    this.memoriaTimingDireccion[
      key
    ] || {

      key,

      mercado,

      estrategia:
        "even_odd",

      direccion,

      timingBucketMs:
        bucket,

      total:
        0,

      ganadas:
        0,

      perdidas:
        0,

      sumaTimingMs:
        0,

      createdAt:
        Date.now()

    };


  e.total +=
    1;


  if (
    telemetria.resultado ===
    "GANADA"
  ) {

    e.ganadas +=
      1;

  }

  else {

    e.perdidas +=
      1;

  }


  e.sumaTimingMs +=
    timing;


  e.promedioTimingMs =
    this.redondear(
      e.sumaTimingMs /
      e.total
    );


  e.accuracy =
    this.redondear(
      (
        e.ganadas /
        e.total
      ) *
      100
    );


  e.clasificacion =
    e.total <
      DIRECTION_TIMING_CONTROL
        .minimumDecisionSamples

      ? "SIN_EVIDENCIA"

      : e.accuracy >=
          DIRECTION_TIMING_CONTROL
            .favorableAccuracy

        ? "FAVORABLE"

        : e.accuracy <=
            DIRECTION_TIMING_CONTROL
              .riskAccuracy

          ? "RIESGO"

          : "NEUTRO";


  e.updatedAt =
    Date.now();


  this.memoriaTimingDireccion[
    key
  ] =
    e;


  this.persistirMemoriaTimingDireccion();


  this.emitirEvento(
    "bot:direction-timing-updated",
    {
      ...e
    }
  );


  return e;

}

 obtenerResumenTimingDireccion() {

  const entradas =
    Object.values(
      this.memoriaTimingDireccion || {}
    );


  const resumir = (
    dir
  ) => {

    const d =
      entradas.filter(
        x =>
          x?.direccion ===
          dir
      );


    const total =
      d.reduce(
        (a, x) =>
          a +
          Number(
            x?.total || 0
          ),
        0
      );


    const ganadas =
      d.reduce(
        (a, x) =>
          a +
          Number(
            x?.ganadas || 0
          ),
        0
      );


    const perdidas =
      Math.max(
        0,
        total -
        ganadas
      );


    const ordenadas =
      d
        .slice()
        .sort(
          (a, b) => {

            const accuracyA =
              Number(
                a?.accuracy || 0
              );

            const accuracyB =
              Number(
                b?.accuracy || 0
              );


            if (
              accuracyB !==
              accuracyA
            ) {

              return (
                accuracyB -
                accuracyA
              );

            }


            return (
              Number(
                b?.total || 0
              ) -
              Number(
                a?.total || 0
              )
            );

          }
        );


    const conEvidencia =
      ordenadas.filter(
        x =>
          Number(
            x?.total || 0
          ) >=
          DIRECTION_TIMING_CONTROL
            .minimumDecisionSamples
      );


    const mejor =
      conEvidencia[0] ||
      ordenadas[0] ||
      null;


    const mejorTimingMs =
      mejor
        ? Number(
            mejor
              .timingBucketMs || 0
          )
        : null;


    const mejorAccuracy =
      mejor
        ? Number(
            mejor
              .accuracy || 0
          )
        : null;


    const mejorMuestras =
      mejor
        ? Number(
            mejor
              .total || 0
          )
        : 0;


    const clasificacion =
      mejor
        ? String(
            mejor
              .clasificacion ||
            "SIN_EVIDENCIA"
          )
        : "SIN_EVIDENCIA";


    return {

      direccion:
        dir,

      total,

      ganadas,

      perdidas,

      accuracy:
        total
          ? this.redondear(
              (
                ganadas /
                total
              ) *
              100
            )
          : 0,

      mejorTimingMs,

      mejorTimingSeg:
        mejorTimingMs !==
        null
          ? this.redondear(
              mejorTimingMs /
              1000
            )
          : null,

      mejorAccuracy,

      mejorMuestras,

      clasificacion,

      suficienteEvidencia:
        mejorMuestras >=
        DIRECTION_TIMING_CONTROL
          .minimumDecisionSamples

    };

  };


  return {

    EVEN:
      resumir(
        "EVEN"
      ),

    ODD:
      resumir(
        "ODD"
      ),

    configuracion: {
      ...this.calibracionDireccion
    },

    control: {
      ...DIRECTION_TIMING_CONTROL
    }

  };

}

  obtenerAuditoriaEstrategias() {
    const estrategias = ["even_odd","over_under","match","rise_fall"];
    const historial = Array.isArray(this.historialTelemetria) ? this.historialTelemetria : [];
    const out = {};
    for (const est of estrategias) {
      const d = historial.filter(x => String(x?.estrategia||"").toLowerCase().replace("/","_") === est);
      const fin = d.filter(x => ["GANADA","PERDIDA"].includes(x?.resultado));
      const ganadas = fin.filter(x=>x.resultado==="GANADA").length;
      const errores = d.filter(x => String(x?.resultado||"").includes("ERROR") || String(x?.resultado||"").includes("RECHAZ")).length;
      out[est] = {recibidas:d.length, finalizadas:fin.length, ganadas, perdidas:fin.length-ganadas, accuracy:fin.length?this.redondear(ganadas/fin.length*100):null, errores};
    }
    return out;
  }

  /* ========================================
     CALIBRACIÓN
     ======================================== */

  cargarCalibracion() {

    try {

      const guardada =
        JSON.parse(
          localStorage.getItem(
            CALIBRATION_KEY
          ) ||
          "{}"
        );


      const resultado = {
        ...CALIBRACION_INICIAL
      };


      for (
        const mercado
        of MERCADOS_CONTROLADOS
      ) {

        const valor =
          Number(
            guardada[
              mercado
            ]
          );


        if (
          AJUSTES_PERMITIDOS_MS
            .includes(
              valor
            )
        ) {

          resultado[
            mercado
          ] =
            valor;

        }

      }


      return resultado;

    }

    catch {

      return {
        ...CALIBRACION_INICIAL
      };

    }

  }


  guardarCalibracion() {

    try {

      localStorage.setItem(
        CALIBRATION_KEY,
        JSON.stringify(
          this.calibracion
        )
      );


      return true;

    }

    catch {

      return false;

    }

  }


  obtenerAjusteMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const valor =
      Number(
        this.calibracion[
          symbol
        ]
      );


    if (
      AJUSTES_PERMITIDOS_MS
        .includes(
          valor
        )
    ) {

      return valor;

    }


    return (
      this.obtenerFamiliaMercado(
        symbol
      ) ===
      "1S"
        ? 100
        : 0
    );

  }


  establecerAjusteMercado(
    mercado,
    ajusteMs
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const valor =
      Number(
        ajusteMs
      );


    if (
      !this.mercadoControlado(
        symbol
      )
    ) {

      return {

        ok:
          false,

        mensaje:
          "Mercado no controlado."

      };

    }


    if (
      !AJUSTES_PERMITIDOS_MS
        .includes(
          valor
        )
    ) {

      return {

        ok:
          false,

        mensaje:
          "Ajuste no permitido."

      };

    }


    this.calibracion[
      symbol
    ] =
      valor;


    this.guardarCalibracion();


    this.invalidarCacheAnalitica();


    return {

      ok:
        true,

      mercado:
        symbol,

      ajusteMs:
        valor,

      ajusteSeg:
        valor /
        1000,

      mensaje:
        `Calibración ${symbol}: ${
          valor >
            0
            ? "+"
            : ""
        }${valor} ms`

    };

  }


  restablecerCalibracion() {

    this.calibracion =
      {
        ...CALIBRACION_INICIAL
      };


    this.guardarCalibracion();


    this.invalidarCacheAnalitica();


    return {

      ok:
        true,

      mensaje:
        "Calibración restablecida: STANDARD 0 ms / 1S +100 ms."

    };

  }


  /* ========================================
     TARGET
     ======================================== */

  obtenerTargetExecutionAt(
    senal
  ) {

    const candidatos = [

      senal
        ?.targetExecutionAt,

      senal
        ?.targetVisualAt,

      senal
        ?.metadata
        ?.targetExecutionAt,

      senal
        ?.metadata
        ?.targetVisualAt

    ];


    for (
      const candidato
      of candidatos
    ) {

      const valor =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          valor
        ) &&
        valor >
          0
      ) {

        return valor;

      }

    }


    return null;

  }


  calcularProgramacion(
    senal
  ) {

    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const ajusteMs =
      this.obtenerAjusteSenal(
        senal
      );


    const targetExecutionAt =
      this.obtenerTargetExecutionAt(
        senal
      );


    if (
      targetExecutionAt ===
        null
    ) {

      return {

        disponible:
          false,

        mercado,

        ajusteMs,

        ajusteSeg:
          ajusteMs /
          1000,

        targetExecutionAt:
          null,

        programmedAt:
          null,

        esperaMs:
          0,

        puedeAnticipar:
          false,

        motivo:
          "La señal no incluye TARGET."

      };

    }


    const programmedAt =
      targetExecutionAt +
      ajusteMs;


    const ahoraEpoch =
      Date.now();


    return {

      disponible:
        true,

      mercado,

      ajusteMs,

      ajusteSeg:
        ajusteMs /
        1000,

      targetExecutionAt,

      programmedAt,

      esperaMs:
        Math.max(
          0,
          programmedAt -
          ahoraEpoch
        ),

      puedeAnticipar:
        programmedAt >
        ahoraEpoch,

      motivo:
        programmedAt >
          ahoraEpoch
          ? "Programación válida."
          : "El instante programado ya ocurrió."

    };

  }


  /* ========================================
     CONTROL BOT
     ======================================== */

  iniciar() {

    this.activo =
      true;


    this.pausado =
      false;


    /*
      Cada inicio manual del bot es una
      sesión nueva de riesgo.
    */

    this.sesionRiesgo = {

      netoSesion:
        0,

      operacionesTotales:
        0,

      perdidasConsecutivasSesion:
        0,

      detenidoPorRiesgo:
        false,

      motivoDetencion:
        null

    };


    return {

      ok:
        true,

      mensaje:
        "Bot iniciado FIX14.8 FAVORABLE PRIORITY GATE + LOSS PROTECTION."

    };

  }


  pausar() {

    this.pausado =
      true;


    return {

      ok:
        true,

      mensaje:
        "Bot pausado."

    };

  }


  reanudar() {

    this.pausado =
      false;


    return {

      ok:
        true,

      mensaje:
        "Bot reanudado."

    };

  }


  detener() {

    this.activo =
      false;


    this.pausado =
      false;


    this.preparaciones
      .clear();


    this.senalesEnProceso
      .clear();


    this.operacionActivaId =
      null;


    return {

      ok:
        true,

      mensaje:
        "Bot detenido."

    };

  }


  /* ========================================
     GESTIÓN DE RIESGO DE SESIÓN

     Se evalúa después de cada resultado
     GANADA/PERDIDA confirmado. Si se supera
     algún límite, el bot se detiene por
     completo (no solo se salta la señal),
     igual que un detener() manual.
     ======================================== */

  detenerPorRiesgo(
    motivo
  ) {

    this.activo =
      false;


    this.pausado =
      false;


    this.preparaciones
      .clear();


    this.senalesEnProceso
      .clear();


    this.operacionActivaId =
      null;


    this.sesionRiesgo.detenidoPorRiesgo =
      true;


    this.sesionRiesgo.motivoDetencion =
      motivo;


    this.emitirEvento(
      "bot:risk-stop",
      {

        motivo,

        sesionRiesgo: {
          ...this.sesionRiesgo
        }

      }
    );

  }


  actualizarRiesgoSesion(
    resultado,
    profit
  ) {

    if (
      this.sesionRiesgo
        .detenidoPorRiesgo
    ) {

      return;

    }


    const montoProfit =
      Number(profit) ||
      0;


    this.sesionRiesgo.netoSesion =
      Math.round(
        (
          this.sesionRiesgo
            .netoSesion +
          montoProfit
        ) * 100
      ) / 100;


    this.sesionRiesgo
      .operacionesTotales += 1;


    if (
      resultado ===
        "PERDIDA"
    ) {

      this.sesionRiesgo
        .perdidasConsecutivasSesion += 1;

    }

    else if (
      resultado ===
        "GANADA"
    ) {

      this.sesionRiesgo
        .perdidasConsecutivasSesion =
        0;

    }


    let motivo =
      null;


    if (
      this.sesionRiesgo
        .netoSesion <=
        -Math.abs(
          this.limitesRiesgo
            .perdidaMaximaSesion
        )
    ) {

      motivo =
        `Límite de pérdida de sesión alcanzado (${
          this.sesionRiesgo
            .netoSesion
            .toFixed(2)
        } ${
          this.configuracion
            .moneda
        }). Bot detenido por seguridad.`;

    }

    else if (
      this.sesionRiesgo
        .perdidasConsecutivasSesion >=
        this.limitesRiesgo
          .perdidasConsecutivasMaximas
    ) {

      motivo =
        `${
          this.sesionRiesgo
            .perdidasConsecutivasSesion
        } pérdidas consecutivas en la sesión. Bot detenido por seguridad.`;

    }

    else if (
      this.sesionRiesgo
        .operacionesTotales >=
        this.limitesRiesgo
          .operacionesMaximasSesion
    ) {

      motivo =
        `Tope de ${
          this.limitesRiesgo
            .operacionesMaximasSesion
        } operaciones de la sesión alcanzado. Bot detenido.`;

    }


    if (
      motivo
    ) {

      this.detenerPorRiesgo(
        motivo
      );

    }

  }


  activarEjecucionDemo() {

    return derivTrade
      .activar();

  }


  desactivarEjecucionDemo() {

    return derivTrade
      .desactivar();

  }


  puedeProcesar() {

    if (
      !this.activo
    ) {

      return {

        ok:
          false,

        motivo:
          "El bot está apagado."

      };

    }


    if (
      this.pausado
    ) {

      return {

        ok:
          false,

        motivo:
          "El bot está pausado."

      };

    }


    return {

      ok:
        true

    };

  }


  /* ========================================
     OPERACIÓN / FASE
     ======================================== */

  obtenerOperacionId(
    senal
  ) {

    return String(
      senal
        ?.operacionId ??
      senal
        ?.metadata
        ?.operacionId ??
      ""
    )
      .trim();

  }


  obtenerFase(
    senal
  ) {

    return String(
      senal
        ?.fase ??
      senal
        ?.metadata
        ?.fase ??
      "LEGACY"
    )
      .trim()
      .toUpperCase();

  }


  /* ========================================
     FIX14.2.1 PARITY MOVEMENT SAFE
     CONTROL DE CICLO ÚNICO
     ======================================== */

  esOperacionActiva(
    operacionId
  ) {

    return Boolean(
      operacionId &&
      this.operacionActivaId ===
        String(operacionId)
    );

  }


  activarCicloOperacion(
    operacionId
  ) {

    const id =
      String(
        operacionId ||
        ""
      )
        .trim();


    if (
      !id
    ) {

      return {
        ok: false,
        motivo: "operacionId inválido."
      };

    }


    if (
      this.operacionActivaId &&
      this.operacionActivaId !==
        id
    ) {

      const anterior =
        this.preparaciones
          .get(
            this.operacionActivaId
          );


      if (
        anterior
          ?.ejecutando ===
          true
      ) {

        return {
          ok: false,
          motivo: "Hay una operación anterior ejecutándose.",
          operacionActivaId:
            this.operacionActivaId
        };

      }


      const operacionAnteriorId =
        this.operacionActivaId;


      this.preparaciones
        .delete(
          operacionAnteriorId
        );


      this.senalesEnProceso
        .delete(
          operacionAnteriorId
        );


      this.emitirEvento(
        "bot:cycle-replaced",
        {
          operacionId:
            operacionAnteriorId,
          nuevaOperacionId:
            id
        }
      );

    }


    if (
      this.operacionActivaId !==
      id
    ) {

      this.cicloSecuencia +=
        1;

    }


    this.operacionActivaId =
      id;


    this.senalesEnProceso
      .add(
        id
      );


    return {
      ok: true,
      operacionId: id,
      cicloSecuencia:
        this.cicloSecuencia
    };

  }


  limpiarCicloOperacion(
    operacionId,
    motivo =
      "CICLO_FINALIZADO"
  ) {

    const id =
      String(
        operacionId ||
        ""
      )
        .trim();


    if (
      id
    ) {

      this.preparaciones
        .delete(
          id
        );


      this.senalesEnProceso
        .delete(
          id
        );

    }


    if (
      !id ||
      this.operacionActivaId ===
        id
    ) {

      this.operacionActivaId =
        null;

    }


    this.ultimoMotivoLimpiezaCiclo =
      motivo;


    this.ultimoCicloLimpioAt =
      Date.now();


    this.emitirEvento(
      "bot:cycle-cleaned",
      {
        operacionId:
          id || null,
        motivo,
        cleanedAt:
          this.ultimoCicloLimpioAt
      }
    );

  }


  validarCicloOperacion(
    operacionId,
    preparada =
      null
  ) {

    const id =
      String(
        operacionId ||
        ""
      )
        .trim();


    if (
      !this.esOperacionActiva(
        id
      )
    ) {

      return {
        ok: false,
        motivo: "Operación obsoleta o reemplazada."
      };

    }


    if (
      preparada &&
      this.preparaciones
        .get(
          id
        ) !==
        preparada
    ) {

      return {
        ok: false,
        motivo: "La preparación ya no pertenece al ciclo vigente."
      };

    }


    return {
      ok: true
    };

  }


  /* ========================================
     LIMPIEZA
     ======================================== */

  limpiarPreparacionesExpiradas() {

    const ahora =
      Date.now();


    for (
      const [
        operacionId,
        preparacion
      ]
      of this.preparaciones
    ) {

      if (
        ahora -
          Number(
            preparacion
              ?.preparedAt ??
            0
          ) >
        PREPARATION_TTL_MS
      ) {

        this.preparaciones
          .delete(
            operacionId
          );


        this.senalesEnProceso
          .delete(
            operacionId
          );


        if (
          this.operacionActivaId ===
          operacionId
        ) {

          this.operacionActivaId =
            null;

        }


        this.emitirEvento(
          "bot:preparation-expired",
          {

            operacionId,

            mercado:
              preparacion
                ?.senalPreparacion
                ?.mercado ??
              null

          }
        );

      }

    }

  }


  limpiarManualPendienteAnterior(
    nuevaOperacionId
  ) {

    if (
      !this.esModoManual()
    ) {

      return;

    }


    for (
      const [
        operacionId,
        item
      ]
      of this.preparaciones
    ) {

      if (
        operacionId ===
        nuevaOperacionId
      ) {

        continue;

      }


      if (
        item
          ?.modoPreparacion ===
          MODOS_EJECUCION.MANUAL &&
        item
          ?.ejecutando !==
          true
      ) {

        this.preparaciones
          .delete(
            operacionId
          );


        this.emitirEvento(
          "bot:manual-replaced",
          {

            operacionId,

            nuevaOperacionId

          }
        );

      }

    }

  }


  /* ========================================
     MANUAL PENDIENTE
     ======================================== */

  obtenerPreparacionManualPendiente() {

    const candidatas =
      [
        ...this
          .preparaciones
          .values()
      ]
        .filter(
          (
            item
          ) =>
            item
              ?.manualReady ===
              true &&
            item
              ?.ejecutando !==
              true &&
            item
              ?.manualConsumida !==
              true
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              b
                ?.manualReadyAt ??
              b
                ?.preparedAt ??
              0
            ) -
            Number(
              a
                ?.manualReadyAt ??
              a
                ?.preparedAt ??
              0
            )
        );


    if (
      !candidatas.length
    ) {

      return null;

    }


    const item =
      candidatas[
        0
      ];


    return {

      operacionId:
        item.operacionId,

      mercado:
        item
          .senalEjecucion
          ?.mercado ??
        item
          .senalPreparacion
          ?.mercado ??
        null,

      estrategia:
        item
          .senalEjecucion
          ?.estrategia ??
        item
          .senalPreparacion
          ?.estrategia ??
        null,

      direccion:
        item
          .senalEjecucion
          ?.direccion ??
        item
          .senalPreparacion
          ?.direccion ??
        null,

      confianza:
        item
          .senalEjecucion
          ?.confianza ??
        item
          .senalPreparacion
          ?.confianza ??
        null,

      targetExecutionAt:
        item
          .telemetria
          ?.targetExecutionAt ??
        null,

      programmedExecutionAt:
        item
          .telemetria
          ?.programmedExecutionAt ??
        null,

      calibracionMs:
        item
          .telemetria
          ?.calibracionMs ??
        null,

      preparedAt:
        item.preparedAt,

      manualReadyAt:
        item.manualReadyAt,

      targetReceivedAt:
        item.targetReceivedAt,

      targetDisponible:
        this.numeroValido(item.telemetria?.targetExecutionAt),

      patron:
        item
          .analisisPatron ??
        null

    };

  }


  /* ========================================
     PERFIL
     ======================================== */

  clasificarConfianza(
    confianza
  ) {

    const valor =
      Number(
        confianza
      );


    if (
      !Number.isFinite(
        valor
      )
    ) {

      return "SIN_DATO";

    }


    if (
      valor <
      75
    ) {

      return "<75";

    }


    if (
      valor <
      80
    ) {

      return "75-79";

    }


    if (
      valor <
      85
    ) {

      return "80-84";

    }


    if (
      valor <
      90
    ) {

      return "85-89";

    }


    return "90-100";

  }


  clasificarRsi(
    rsi
  ) {

    const valor =
      Number(
        rsi
      );


    if (
      !Number.isFinite(
        valor
      )
    ) {

      return "SIN_DATO";

    }


    if (
      valor <=
      30
    ) {

      return "0-30";

    }


    if (
      valor <=
      44
    ) {

      return "31-44";

    }


    if (
      valor <=
      55
    ) {

      return "45-55";

    }


    if (
      valor <=
      69
    ) {

      return "56-69";

    }


    return "70-100";

  }


  clasificarDigito(
    digito
  ) {

    const valor =
      Number(
        digito
      );


    if (
      !Number.isInteger(
        valor
      ) ||
      valor <
        0 ||
      valor >
        9
    ) {

      return "SIN_DATO";

    }


    if (
      valor <=
      2
    ) {

      return "0-2";

    }


    if (
      valor <=
      5
    ) {

      return "3-5";

    }


    return "6-9";

  }


  crearPerfilSenal(
    senal
  ) {

    const confianza =
      Number(
        senal?.confianza
      );


    const rsi =
      Number(
        senal?.rsi
      );


    const ultimoDigito =
      Number(
        senal?.ultimoDigito
      );


    const tendencia =
      this.normalizarTexto(
        senal?.tendencia
      );


    const momentum =
      this.normalizarTexto(
        senal?.momentum
      );


    const direccion =
      this.normalizarTexto(
        senal?.direccion
      );


    const ultimoDigitoValido =
      Number.isInteger(
        ultimoDigito
      ) &&
      ultimoDigito >=
        0 &&
      ultimoDigito <=
        9;


    return {

      direccion,

      confianza:
        Number.isFinite(
          confianza
        )
          ? confianza
          : null,

      zonaConfianza:
        this.clasificarConfianza(
          confianza
        ),

      tendencia,

      rsi:
        Number.isFinite(
          rsi
        )
          ? rsi
          : null,

      zonaRsi:
        this.clasificarRsi(
          rsi
        ),

      momentum,

      tendenciaMomentum:
        tendencia &&
        momentum
          ? tendencia ===
              momentum
            ? "ALINEADOS"
            : "NO_ALINEADOS"
          : "SIN_DATO",

      volatilidad:
        this.normalizarTexto(
          senal?.volatilidad
        ),

      ultimoDigito:
        ultimoDigitoValido
          ? ultimoDigito
          : null,

      zonaDigito:
        this.clasificarDigito(
          ultimoDigito
        ),

      ultimoDigitoPar:
        ultimoDigitoValido
          ? ultimoDigito %
              2 ===
            0
          : null,

      paridadUltimoDigito:
        ultimoDigitoValido
          ? ultimoDigito %
                2 ===
              0
            ? "PAR"
            : "IMPAR"
          : "SIN_DATO",

      modo:
        senal?.modo ??
        null,

      origen:
        senal?.origen ??
        null

    };

  }


  extraerScoreBruto(
    senal
  ) {

    const candidatos = [

      senal?.rawScore,

      senal?.scoreBruto,

      senal
        ?.metadata
        ?.rawScore,

      senal
        ?.metadata
        ?.scoreBruto,

      senal
        ?.metadata
        ?.engine1
        ?.rawScore

    ];


    for (
      const candidato
      of candidatos
    ) {

      const numero =
        Number(
          candidato
        );


      if (
        Number.isFinite(
          numero
        )
      ) {

        return this.redondear(
          numero
        );

      }

    }


    return null;

  }


  /* ========================================
     TELEMETRÍA
     ======================================== */

  crearTelemetria(
    senal
  ) {

    const ahoraPerf =
      this.ahora();


    const ahoraEpoch =
      Date.now();


    const mercado =
      this.normalizarMercado(
        senal?.mercado
      );


    const perfil =
      this.crearPerfilSenal(
        senal
      );


    const programacion =
      this.calcularProgramacion(
        senal
      );


    const bridgeReceivedEpoch =
      Number(
        senal
          ?.bridgeReceivedEpoch ??
        senal
          ?.timestamp
      );


    const firmaPatron =
      this.crearFirmaPatron(
        senal
      );


    return {

      id:
        `${Date.now()}-${Math.floor(
          Math.random() *
          100000
        )}`,

      version:
        TELEMETRY_VERSION,

      timingBase:
        TIMING_BASE_VERSION,

      sincronizacionVisual:
        SYNC_VERSION,

      modoEjecucion:
        this.modoEjecucion,

      signalId:
        senal?.id ??
        null,

      operacionId:
        this.obtenerOperacionId(
          senal
        ) ||
        null,

      faseInicial:
        this.obtenerFase(
          senal
        ),

      mercado,

      mercadoControlado:
        this.mercadoControlado(
          mercado
        ),

      familiaMercado:
        this.obtenerFamiliaMercado(
          mercado
        ),

      estrategia:
        senal?.estrategia ??
        null,

      direccion:
        perfil.direccion,

      confianza:
        perfil.confianza,

      scoreBruto:
        this.extraerScoreBruto(
          senal
        ),

      valorPatron:
        firmaPatron
          .valorPatron,

      patronKey:
        firmaPatron.key,

      patronFirma:
        {
          ...firmaPatron
        },

      patronClasificacion:
        null,

      patronFuerza:
        null,

      patronDecision:
        null,

      patronMuestrasPrevias:
        0,

      patronGanadasPrevias:
        0,

      patronPerdidasPrevias:
        0,

      patronAccuracyPrevio:
        null,

      patronBloqueado:
        false,


      movimientoParidadKey:
        null,

      movimientoParidadFirma:
        null,

      movimientoParidadClasificacion:
        null,

      movimientoParidadFuerza:
        null,

      movimientoParidadDecision:
        null,

      movimientoParidadMuestrasPrevias:
        0,

      movimientoParidadAccuracyPrevio:
        null,

      movimientoParidadBloqueado:
        false,

      timingBuyClasificacion:
        null,

      timingBuyDecision:
        null,

      timingBuyMuestrasPrevias:
        0,

      timingBuyAccuracyPrevio:
        null,

      timingBuyBloqueado:
        false,

      timingBuyAnalisis:
        null,

      zonaConfianza:
        perfil.zonaConfianza,

      tendencia:
        perfil.tendencia,

      rsi:
        perfil.rsi,

      zonaRsi:
        perfil.zonaRsi,

      momentum:
        perfil.momentum,

      tendenciaMomentum:
        perfil.tendenciaMomentum,

      volatilidad:
        perfil.volatilidad,

      ultimoDigito:
        perfil.ultimoDigito,

      zonaDigito:
        perfil.zonaDigito,

      ultimoDigitoPar:
        perfil.ultimoDigitoPar,

      paridadUltimoDigito:
        perfil.paridadUltimoDigito,

      perfilSenal:
        {
          ...perfil
        },

      puntoEntrada:
        senal?.segundosEntrada ??
        10,

      retrasoReferenciaMs:
        this.obtenerRetrasoReferencia(
          mercado
        ),

      retrasoReferenciaSeg:
        this.obtenerRetrasoReferencia(
          mercado
        ) !==
          null
          ? this.obtenerRetrasoReferencia(
              mercado
            ) /
            1000
          : null,


      /* PREPARAR */

      prepareReceivedEpoch:
        ahoraEpoch,

      prepareStartedEpoch:
        ahoraEpoch,

      proposalRequestedEpoch:
        null,

      proposalReceivedEpoch:
        null,

      proposalPreparedEpoch:
        null,


      /* BOTÓN LISTO */

      manualReadyEpoch:
        null,

      prepareToManualReadyMs:
        null,

      targetToManualReadyMs:
        null,


      /* TARGET */

      targetReceivedEpoch:
        null,

      targetExecutionAt:
        programacion
          .targetExecutionAt,

      programmedExecutionAt:
        programacion
          .programmedAt,

      calibracionMs:
        programacion
          .ajusteMs,

      calibracionSeg:
        programacion
          .ajusteSeg,

      programacionDisponible:
        programacion
          .disponible,

      puedeAnticipar:
        programacion
          .puedeAnticipar,

      programacionMotivo:
        programacion
          .motivo,


      /* MANUAL */

      manualClickEpoch:
        null,

      manualClickPerf:
        null,

      manualClickToTargetMs:
        null,

      manualClickToProgrammedMs:
        null,

      manualClickToBuyMs:
        null,

      manualBuyToTargetMs:
        null,

      manualBuyConfirmToTargetMs:
        null,


      /* ESPERA */

      waitStartedEpoch:
        null,

      waitEndedEpoch:
        null,

      esperaProgramadaInicialMs:
        programacion
          .esperaMs,

      esperaProgramadaMs:
        programacion
          .esperaMs,


      /* BUY */

      buyRequestedEpoch:
        null,

      buyConfirmedEpoch:
        null,

      resultReceivedEpoch:
        null,


      /* PERF */

      signalReceivedPerf:
        ahoraPerf,

      processStartedPerf:
        ahoraPerf,

      proposalRequestedPerf:
        null,

      proposalReceivedPerf:
        null,

      calibrationWaitStartedPerf:
        null,

      calibrationWaitEndedPerf:
        null,

      buyRequestedPerf:
        null,

      buyConfirmedPerf:
        null,

      resultReceivedPerf:
        null,


      /* MÉTRICAS */

      bridgeToProcessMs:
        Number.isFinite(
          bridgeReceivedEpoch
        )
          ? this.redondear(
              ahoraEpoch -
              bridgeReceivedEpoch
            )
          : null,

      signalToProposalRequestMs:
        null,

      signalToProposalReceivedMs:
        null,

      processToProposalRequestMs:
        null,

      proposalLatencyMs:
        null,

      targetToPullRequestMs:
        null,

      targetToPullReceivedMs:
        null,

      programmedToBuyMs:
        null,

      programmedToBuyConfirmMs:
        null,

      prepareToTargetMs:
        null,

      targetToBuyMs:
        null,

      calibrationWaitActualMs:
        null,

      calibrationWaitOvershootMs:
        null,

      proposalToBuyMs:
        null,

      processToBuyMs:
        null,

      signalToBuyMs:
        null,

      signalToBuyConfirmMs:
        null,

      buyLatencyMs:
        null,

      buyTargetDeviationMs:
        null,

      buyConfirmTargetDeviationMs:
        null,

      totalUntilResultMs:
        null,


      /* TIMING */

      timingValido:
        false,

      timingClasificacion:
        "PENDIENTE",

      timingAnomalias:
        [],

      usableForTimingComparator:
        false,

      usableForSignalProfile:
        false,


      /* RESULTADO */

      contractId:
        null,

      resultado:
        "PREPARANDO",

      profit:
        null,

      source:
        null,

      createdAt:
        Date.now()

    };

  }


  calcularTelemetria(
    t
  ) {

    t.signalToProposalRequestMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.proposalRequestedPerf
      );


    t.signalToProposalReceivedMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.proposalReceivedPerf
      );


    t.processToProposalRequestMs =
      this.diferencia(
        t.processStartedPerf,
        t.proposalRequestedPerf
      );


    t.proposalLatencyMs =
      this.diferencia(
        t.proposalRequestedPerf,
        t.proposalReceivedPerf
      );


    if (
      this.numeroValido(t.targetExecutionAt) &&
      this.numeroValido(t.proposalRequestedEpoch)
    ) {

      t.targetToPullRequestMs =
        this.redondear(
          Number(
            t.proposalRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.targetExecutionAt) &&
      this.numeroValido(t.proposalReceivedEpoch)
    ) {

      t.targetToPullReceivedMs =
        this.redondear(
          Number(
            t.proposalReceivedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.programmedExecutionAt) &&
      this.numeroValido(t.buyRequestedEpoch)
    ) {

      t.programmedToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.programmedExecutionAt) &&
      this.numeroValido(t.buyConfirmedEpoch)
    ) {

      t.programmedToBuyConfirmMs =
        this.redondear(
          Number(
            t.buyConfirmedEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    t.prepareToTargetMs =
      this.diferencia(
        t.prepareReceivedEpoch,
        t.targetReceivedEpoch
      );


    if (
      this.numeroValido(t.manualReadyEpoch) &&
      this.numeroValido(t.prepareReceivedEpoch)
    ) {

      t.prepareToManualReadyMs =
        this.redondear(
          Number(
            t.manualReadyEpoch
          ) -
          Number(
            t.prepareReceivedEpoch
          )
        );

    }


    if (
      this.numeroValido(t.manualReadyEpoch) &&
      this.numeroValido(t.targetReceivedEpoch)
    ) {

      t.targetToManualReadyMs =
        this.redondear(
          Number(
            t.manualReadyEpoch
          ) -
          Number(
            t.targetReceivedEpoch
          )
        );

    }


    t.calibrationWaitActualMs =
      this.diferencia(
        t.calibrationWaitStartedPerf,
        t.calibrationWaitEndedPerf
      );


    if (
      Number.isFinite(
        t.calibrationWaitActualMs
      ) &&
      Number.isFinite(
        t.esperaProgramadaMs
      )
    ) {

      t.calibrationWaitOvershootMs =
        this.redondear(
          t.calibrationWaitActualMs -
          t.esperaProgramadaMs
        );

    }


    t.proposalToBuyMs =
      this.diferencia(
        t.proposalReceivedPerf,
        t.buyRequestedPerf
      );


    t.processToBuyMs =
      this.diferencia(
        t.processStartedPerf,
        t.buyRequestedPerf
      );


    t.signalToBuyMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.buyRequestedPerf
      );


    t.buyLatencyMs =
      this.diferencia(
        t.buyRequestedPerf,
        t.buyConfirmedPerf
      );


    t.signalToBuyConfirmMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.buyConfirmedPerf
      );


    t.totalUntilResultMs =
      this.diferencia(
        t.signalReceivedPerf,
        t.resultReceivedPerf
      );


    if (
      this.numeroValido(t.targetExecutionAt) &&
      this.numeroValido(t.buyRequestedEpoch)
    ) {

      t.targetToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.manualClickEpoch) &&
      this.numeroValido(t.targetExecutionAt)
    ) {

      t.manualClickToTargetMs =
        this.redondear(
          Number(
            t.manualClickEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.manualClickEpoch) &&
      this.numeroValido(t.programmedExecutionAt)
    ) {

      t.manualClickToProgrammedMs =
        this.redondear(
          Number(
            t.manualClickEpoch
          ) -
          Number(
            t.programmedExecutionAt
          )
        );

    }


    if (
      this.numeroValido(t.manualClickEpoch) &&
      this.numeroValido(t.buyRequestedEpoch)
    ) {

      t.manualClickToBuyMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.manualClickEpoch
          )
        );

    }


    if (
      t.modoEjecucion ===
        MODOS_EJECUCION.MANUAL &&
      this.numeroValido(t.targetExecutionAt) &&
      this.numeroValido(t.buyRequestedEpoch)
    ) {

      t.manualBuyToTargetMs =
        this.redondear(
          Number(
            t.buyRequestedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    if (
      t.modoEjecucion ===
        MODOS_EJECUCION.MANUAL &&
      this.numeroValido(t.targetExecutionAt) &&
      this.numeroValido(t.buyConfirmedEpoch)
    ) {

      t.manualBuyConfirmToTargetMs =
        this.redondear(
          Number(
            t.buyConfirmedEpoch
          ) -
          Number(
            t.targetExecutionAt
          )
        );

    }


    this.clasificarTiming(
      t
    );


    t.usableForSignalProfile =
      (
        t.resultado ===
          "GANADA" ||
        t.resultado ===
          "PERDIDA"
      );


    return t;

  }


  clasificarTiming(
    t
  ) {

    const anomalias =
      [];


    if (
      !TIMING_COMPATIBLE_VERSIONS
        .includes(
          String(
            t.version
          )
        )
    ) {

      t.timingValido =
        false;


      t.timingClasificacion =
        "LEGACY";


      t.timingAnomalias =
        [
          "Registro legacy."
        ];


      t.usableForTimingComparator =
        false;


      return t;

    }


    if (
      !this.numeroValido(t.targetExecutionAt) &&
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL
    ) {

      anomalias.push(
        "Sin TARGET 10."
      );

    }


    if (
      Number.isFinite(
        t.bridgeToProcessMs
      ) &&
      (
        t.bridgeToProcessMs <
          0 ||
        t.bridgeToProcessMs >
          TIMING_LIMITS
            .bridgeToProcessMaxMs
      )
    ) {

      anomalias.push(
        `Bridge→Proceso alto: ${
          t.bridgeToProcessMs
        } ms`
      );

    }


    if (
      Number.isFinite(
        t.proposalLatencyMs
      ) &&
      (
        t.proposalLatencyMs <
          0 ||
        t.proposalLatencyMs >
          TIMING_LIMITS
            .proposalMaxMs
      )
    ) {

      anomalias.push(
        `Cotización anómala: ${
          t.proposalLatencyMs
        } ms`
      );

    }


    if (
      Number.isFinite(
        t.buyLatencyMs
      ) &&
      (
        t.buyLatencyMs <
          0 ||
        t.buyLatencyMs >
          TIMING_LIMITS
            .buyConfirmationMaxMs
      )
    ) {

      anomalias.push(
        `BUY→confirmación anómalo: ${
          t.buyLatencyMs
        } ms`
      );

    }


    if (
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL &&
      Number.isFinite(
        t.buyTargetDeviationMs
      ) &&
      Math.abs(
        t.buyTargetDeviationMs
      ) >
        TIMING_LIMITS
          .targetDeviationMaxAbsMs
    ) {

      anomalias.push(
        `Desviación target alta: ${
          t.buyTargetDeviationMs
        } ms`
      );

    }


    if (
      t.modoEjecucion !==
        MODOS_EJECUCION.MANUAL &&
      Number.isFinite(
        t.calibrationWaitOvershootMs
      ) &&
      Math.abs(
        t.calibrationWaitOvershootMs
      ) >
        TIMING_LIMITS
          .waitOvershootMaxMs
    ) {

      anomalias.push(
        `Espera excedida: ${
          t.calibrationWaitOvershootMs
        } ms`
      );

    }


    if (
      !Number.isFinite(
        t.proposalLatencyMs
      )
    ) {

      anomalias.push(
        "Cotización sin medición."
      );

    }


    if (
      !Number.isFinite(
        t.buyLatencyMs
      )
    ) {

      anomalias.push(
        "BUY sin confirmación medible."
      );

    }


    t.timingAnomalias =
      anomalias;


    t.timingValido =
      anomalias.length ===
      0;


    if (
      t.modoEjecucion ===
      MODOS_EJECUCION.MANUAL
    ) {

      t.timingClasificacion =
        t.timingValido
          ? "MANUAL_VALIDO"
          : "MANUAL_ANOMALO";


      t.usableForTimingComparator =
        false;


      return t;

    }


    t.timingClasificacion =
      t.timingValido
        ? "VALIDO"
        : "ANOMALO";


    t.usableForTimingComparator =
      t.timingValido &&
      (
        t.resultado ===
          "GANADA" ||
        t.resultado ===
          "PERDIDA"
      );


    return t;

  }


  guardarTelemetria(
    telemetria
  ) {

    this.calcularTelemetria(
      telemetria
    );


    this.ultimaTelemetria =
      {
        ...telemetria
      };


    this.historialTelemetria
      .unshift(
        {
          ...telemetria
        }
      );


    if (
      this.historialTelemetria
        .length >
      2000
    ) {

      this.historialTelemetria
        .length =
        2000;

    }


    this.persistirHistorialTelemetria();


    this.invalidarCacheAnalitica();


    return telemetria;

  }


  /* ========================================
     FILTROS HISTORIALES
     ======================================== */

  obtenerTelemetriaPorMercado(
    mercado
  ) {

    const buscado =
      this.normalizarMercado(
        mercado
      );


    return this.historialTelemetria
      .filter(
        (
          item
        ) =>
          this.normalizarMercado(
            item?.mercado
          ) ===
          buscado
      );

  }


  /* ========================================
     ANÁLISIS: ¿EL SCORE PREDICE EL RESULTADO?

     Agrupa el historial real (no simulado) por
     rango de confianza y calcula el % de aciertos
     de cada rango. Si los rangos altos ganan más
     que los bajos, el score tiene valor predictivo
     real. Si todos los rangos rondan lo mismo, el
     score no está discriminando nada.
     ======================================== */

  analizarScoreVsResultado(
    estrategia = null
  ) {

    const rangos = [
      { min: 0, max: 59, label: "0-59" },
      { min: 60, max: 69, label: "60-69" },
      { min: 70, max: 79, label: "70-79" },
      { min: 80, max: 89, label: "80-89" },
      { min: 90, max: 100, label: "90-100" }
    ];

    const finalizadas = this.historialTelemetria.filter((item) => {
      if (!["GANADA", "PERDIDA"].includes(item?.resultado)) return false;
      if (estrategia && item?.estrategia !== estrategia) return false;
      return Number.isFinite(Number(item?.confianza));
    });

    const resultado = rangos.map((rango) => {
      const items = finalizadas.filter((item) => {
        const score = Number(item.confianza);
        return score >= rango.min && score <= rango.max;
      });

      const ganadas = items.filter((item) => item.resultado === "GANADA").length;
      const total = items.length;

      return {
        rango: rango.label,
        total,
        ganadas,
        perdidas: total - ganadas,
        winRate: total ? Math.round((ganadas / total) * 1000) / 10 : null
      };
    });

    return {
      estrategia: estrategia || "TODAS",
      totalMuestras: finalizadas.length,
      rangos: resultado
    };

  }


  obtenerTelemetriaPorFamilia(
    familia
  ) {

    const buscada =
      String(
        familia ||
        ""
      )
        .trim()
        .toUpperCase();


    return this.historialTelemetria
      .filter(
        (
          item
        ) =>
          String(
            item
              ?.familiaMercado ||
            ""
          )
            .toUpperCase() ===
          buscada
      );

  }


  obtenerTelemetriaPorCalibracion(
    mercado,
    ajusteMs
  ) {

    const ajuste =
      Number(
        ajusteMs
      );


    return this
      .obtenerTelemetriaPorMercado(
        mercado
      )
      .filter(
        (
          item
        ) =>
          Number(
            item
              ?.calibracionMs ??
            0
          ) ===
          ajuste
      );

  }


  filtrarTimingValido(
    datos
  ) {

    return datos.filter(
      (
        item
      ) =>
        TIMING_COMPATIBLE_VERSIONS
          .includes(
            String(
              item?.version
            )
          ) &&
        item
          ?.timingValido ===
          true &&
        item
          ?.usableForTimingComparator ===
          true &&
        item
          ?.modoEjecucion !==
          MODOS_EJECUCION.MANUAL
    );

  }


  filtrarPerfilFix13(
    datos
  ) {

    return datos.filter(
      (
        item
      ) =>
        SIGNAL_PROFILE_VERSIONS
          .includes(
            String(
              item?.version
            )
          ) &&
        (
          item
            ?.resultado ===
            "GANADA" ||
          item
            ?.resultado ===
            "PERDIDA"
        )
    );

  }


  /* ========================================
     MÉTRICAS
     ======================================== */

  construirMetricasGrupo(
    datos
  ) {

    const extraer =
      (
        campo
      ) =>
        datos.map(
          (
            item
          ) =>
            item?.[
              campo
            ]
        );


    return {

      cantidad:
        datos.length,

      promedioSignalToBuyMs:
        this.promedio(
          extraer(
            "signalToBuyMs"
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          extraer(
            "signalToBuyMs"
          )
        ),

      minimoSignalToBuyMs:
        this.minimo(
          extraer(
            "signalToBuyMs"
          )
        ),

      maximoSignalToBuyMs:
        this.maximo(
          extraer(
            "signalToBuyMs"
          )
        ),

      promedioProposalMs:
        this.promedio(
          extraer(
            "proposalLatencyMs"
          )
        ),

      promedioTargetToPullRequestMs:
        this.promedio(
          extraer(
            "targetToPullRequestMs"
          )
        ),

      medianaTargetToPullRequestMs:
        this.mediana(
          extraer(
            "targetToPullRequestMs"
          )
        ),

      promedioTargetToPullReceivedMs:
        this.promedio(
          extraer(
            "targetToPullReceivedMs"
          )
        ),

      medianaTargetToPullReceivedMs:
        this.mediana(
          extraer(
            "targetToPullReceivedMs"
          )
        ),

      promedioProgrammedToBuyMs:
        this.promedio(
          extraer(
            "programmedToBuyMs"
          )
        ),

      medianaProgrammedToBuyMs:
        this.mediana(
          extraer(
            "programmedToBuyMs"
          )
        ),

      promedioBuyMs:
        this.promedio(
          extraer(
            "buyLatencyMs"
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          extraer(
            "buyTargetDeviationMs"
          )
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          extraer(
            "buyTargetDeviationMs"
          )
        )

    };

  }


  construirComparadorTiming(
    datos
  ) {

    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      timingValido.filter(
        (
          item
        ) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      timingValido.filter(
        (
          item
        ) =>
          item.resultado ===
          "PERDIDA"
      );


    const metricasGanadas =
      this.construirMetricasGrupo(
        ganadas
      );


    const metricasPerdidas =
      this.construirMetricasGrupo(
        perdidas
      );


    let diferenciaPromedioMs =
      null;


    let diferenciaMedianaMs =
      null;


    let diferenciaTargetMedianaMs =
      null;


    if (
      metricasGanadas
        .promedioSignalToBuyMs !==
        null &&
      metricasPerdidas
        .promedioSignalToBuyMs !==
        null
    ) {

      diferenciaPromedioMs =
        this.redondear(
          metricasPerdidas
            .promedioSignalToBuyMs -
          metricasGanadas
            .promedioSignalToBuyMs
        );

    }


    if (
      metricasGanadas
        .medianaSignalToBuyMs !==
        null &&
      metricasPerdidas
        .medianaSignalToBuyMs !==
        null
    ) {

      diferenciaMedianaMs =
        this.redondear(
          metricasPerdidas
            .medianaSignalToBuyMs -
          metricasGanadas
            .medianaSignalToBuyMs
        );

    }


    if (
      metricasGanadas
        .medianaDesviacionTargetMs !==
        null &&
      metricasPerdidas
        .medianaDesviacionTargetMs !==
        null
    ) {

      diferenciaTargetMedianaMs =
        this.redondear(
          metricasPerdidas
            .medianaDesviacionTargetMs -
          metricasGanadas
            .medianaDesviacionTargetMs
        );

    }


    let lectura =
      "ESPERANDO MUESTRAS";


    if (
      ganadas.length >=
        3 &&
      perdidas.length >=
        3 &&
      diferenciaTargetMedianaMs !==
        null
    ) {

      if (
        diferenciaTargetMedianaMs >
        40
      ) {

        lectura =
          "GANADAS MÁS TEMPRANO";

      }

      else if (
        diferenciaTargetMedianaMs <
        -40
      ) {

        lectura =
          "GANADAS MÁS TARDE";

      }

      else {

        lectura =
          "TARGET MUY SIMILAR";

      }

    }


    return {

      totalHistorico:
        finalizadas.length,

      totalTimingValido:
        timingValido.length,

      totalTimingDescartado:
        finalizadas.length -
        timingValido.length,

      ganadas:
        metricasGanadas,

      perdidas:
        metricasPerdidas,

      diferenciaPromedioMs,

      diferenciaMedianaMs,

      diferenciaTargetMedianaMs,

      lectura

    };

  }


  construirPerfilNumerico(
    datos,
    campo
  ) {

    const ganadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
          "PERDIDA"
      );


    return {

      promedioTotal:
        this.promedio(
          datos.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      promedioGanadas:
        this.promedio(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      promedioPerdidas:
        this.promedio(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      medianaGanadas:
        this.mediana(
          ganadas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        ),

      medianaPerdidas:
        this.mediana(
          perdidas.map(
            (
              item
            ) =>
              item?.[
                campo
              ]
          )
        )

    };

  }


  contarCategorias(
    datos,
    campo
  ) {

    const resultado =
      {};


    for (
      const item
      of datos
    ) {

      const valor =
        this.normalizarTexto(
          item?.[
            campo
          ]
        ) ??
        "SIN_DATO";


      if (
        !resultado[
          valor
        ]
      ) {

        resultado[
          valor
        ] = {

          total:
            0,

          ganadas:
            0,

          perdidas:
            0,

          accuracy:
            null

        };

      }


      resultado[
        valor
      ].total +=
        1;


      if (
        item.resultado ===
        "GANADA"
      ) {

        resultado[
          valor
        ].ganadas +=
          1;

      }


      if (
        item.resultado ===
        "PERDIDA"
      ) {

        resultado[
          valor
        ].perdidas +=
          1;

      }

    }


    for (
      const clave
      of Object.keys(
        resultado
      )
    ) {

      const fila =
        resultado[
          clave
        ];


      fila.accuracy =
        fila.total >
          0
          ? this.redondear(
              (
                fila.ganadas /
                fila.total
              ) *
                100
            )
          : null;

    }


    return resultado;

  }


  construirHallazgosPerfil(
    distribuciones,
    accuracyGeneral
  ) {

    const candidatos =
      [];


    const agregar =
      (
        grupo,
        filas
      ) => {

        for (
          const [
            valor,
            fila
          ]
          of Object.entries(
            filas ||
            {}
          )
        ) {

          if (
            valor ===
              "SIN_DATO" ||
            Number(
              fila.total
            ) <
              PROFILE_CONTROL
                .minimumPatternSamples
          ) {

            continue;

          }


          const accuracy =
            Number(
              fila.accuracy
            );


          if (
            !Number.isFinite(
              accuracy
            ) ||
            !this.numeroValido(accuracyGeneral)
          ) {

            continue;

          }


          const diferencia =
            this.redondear(
              accuracy -
              Number(
                accuracyGeneral
              )
            );


          let clasificacion =
            "NEUTRO";


          if (
            diferencia >=
              PROFILE_CONTROL
                .meaningfulGapPercent
          ) {

            clasificacion =
              "FAVORABLE";

          }

          else if (
            diferencia <=
              -PROFILE_CONTROL
                .meaningfulGapPercent
          ) {

            clasificacion =
              "RIESGO";

          }


          if (
            clasificacion ===
            "NEUTRO"
          ) {

            continue;

          }


          candidatos.push({

            grupo,

            valor,

            muestras:
              fila.total,

            ganadas:
              fila.ganadas,

            perdidas:
              fila.perdidas,

            accuracy,

            accuracyGeneral,

            diferenciaVsGeneral:
              diferencia,

            clasificacion,

            fuerza:
              fila.total >=
                PROFILE_CONTROL
                  .minimumStrongSamples &&
              Math.abs(
                diferencia
              ) >=
                PROFILE_CONTROL
                  .strongGapPercent
                ? "MAS_FUERTE"
                : "PRELIMINAR"

          });

        }

      };


    agregar(
      "DIRECCION",
      distribuciones.direccion
    );


    agregar(
      "CONFIANZA",
      distribuciones.zonaConfianza
    );


    agregar(
      "RSI",
      distribuciones.zonaRsi
    );


    agregar(
      "TENDENCIA",
      distribuciones.tendencia
    );


    agregar(
      "MOMENTUM",
      distribuciones.momentum
    );


    agregar(
      "VOLATILIDAD",
      distribuciones.volatilidad
    );


    agregar(
      "PARIDAD_DIGITO",
      distribuciones
        .paridadUltimoDigito
    );


    candidatos.sort(
      (
        a,
        b
      ) =>
        Math.abs(
          b.diferenciaVsGeneral
        ) -
        Math.abs(
          a.diferenciaVsGeneral
        )
    );


    return candidatos.slice(
      0,
      PROFILE_CONTROL
        .maxHallazgos
    );

  }


  obtenerResumenPerfilSenal(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const datos =
      this.filtrarPerfilFix13(
        this.obtenerTelemetriaPorMercado(
          symbol
        )
      );


    const ganadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
          "GANADA"
      );


    const perdidas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
          "PERDIDA"
      );


    const total =
      datos.length;


    const accuracy =
      total >
        0
        ? this.redondear(
            (
              ganadas.length /
              total
            ) *
              100
          )
        : null;


    const normalizados =
      datos.map(
        (
          item
        ) => {

          const tendencia =
            this.normalizarTexto(
              item?.tendencia
            );


          const momentum =
            this.normalizarTexto(
              item?.momentum
            );


          return {

            ...item,

            zonaConfianza:
              item?.zonaConfianza ||
              this.clasificarConfianza(
                item?.confianza
              ),

            zonaRsi:
              item?.zonaRsi ||
              this.clasificarRsi(
                item?.rsi
              ),

            tendenciaMomentum:
              item?.tendenciaMomentum ||
              (
                tendencia &&
                momentum
                  ? tendencia ===
                      momentum
                    ? "ALINEADOS"
                    : "NO_ALINEADOS"
                  : "SIN_DATO"
              ),

            paridadUltimoDigito:
              item
                ?.paridadUltimoDigito ||
              (
                Number.isInteger(
                  Number(
                    item?.ultimoDigito
                  )
                )
                  ? Number(
                      item.ultimoDigito
                    ) %
                      2 ===
                    0
                    ? "PAR"
                    : "IMPAR"
                  : "SIN_DATO"
              )

          };

        }
      );


    const distribuciones = {

      direccion:
        this.contarCategorias(
          normalizados,
          "direccion"
        ),

      zonaConfianza:
        this.contarCategorias(
          normalizados,
          "zonaConfianza"
        ),

      zonaRsi:
        this.contarCategorias(
          normalizados,
          "zonaRsi"
        ),

      tendencia:
        this.contarCategorias(
          normalizados,
          "tendencia"
        ),

      momentum:
        this.contarCategorias(
          normalizados,
          "momentum"
        ),

      volatilidad:
        this.contarCategorias(
          normalizados,
          "volatilidad"
        ),

      paridadUltimoDigito:
        this.contarCategorias(
          normalizados,
          "paridadUltimoDigito"
        )

    };


    const hallazgos =
      this.construirHallazgosPerfil(
        distribuciones,
        accuracy
      );


    return {

      mercado:
        symbol,

      versionAnalisis:
        TELEMETRY_VERSION,

      filtroAutomaticoActivo:
        PATTERN_CONTROL
          .blockRiskInAutomatic,

      muestras:
        total,

      ganadas:
        ganadas.length,

      perdidas:
        perdidas.length,

      accuracy,

      estadoAnalisis:
        total >=
          20
          ? "ANALISIS_ACTIVO"
          : total >=
              10
            ? "ANALISIS_PRELIMINAR"
            : total >
                0
              ? "RECOPILANDO"
              : "SIN_MUESTRAS",

      confianza:
        this.construirPerfilNumerico(
          normalizados,
          "confianza"
        ),

      scoreBruto:
        this.construirPerfilNumerico(
          normalizados,
          "scoreBruto"
        ),

      rsi:
        this.construirPerfilNumerico(
          normalizados,
          "rsi"
        ),

      distribuciones,

      hallazgos,

      favorables:
        hallazgos.filter(
          (
            item
          ) =>
            item.clasificacion ===
            "FAVORABLE"
        ),

      riesgos:
        hallazgos.filter(
          (
            item
          ) =>
            item.clasificacion ===
            "RIESGO"
        )

    };

  }


  obtenerResumenMercado(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const datos =
      this.obtenerTelemetriaPorMercado(
        symbol
      );


    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
          "GANADA"
      ).length;


    const perdidas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
          "PERDIDA"
      ).length;


    const pruebas =
      finalizadas.length;


    const perfil =
      this.obtenerResumenPerfilSenal(
        symbol
      );


    const manuales =
      finalizadas.filter(
        (
          item
        ) =>
          item
            ?.modoEjecucion ===
          MODOS_EJECUCION.MANUAL
      );


    const patronesMercado =
      Object.values(
        this.memoriaPatrones
      )
        .filter(
          (
            item
          ) =>
            this.normalizarMercado(
              item?.mercado
            ) ===
            symbol
        );


    return {

      mercado:
        symbol,

      familia:
        this.obtenerFamiliaMercado(
          symbol
        ),

      controlado:
        this.mercadoControlado(
          symbol
        ),

      calibracionActualMs:
        this.obtenerAjusteMercado(
          symbol
        ),

      calibracionActualSeg:
        this.obtenerAjusteMercado(
          symbol
        ) /
        1000,

      pruebas,

      ganadas,

      perdidas,

      accuracy:
        pruebas >
          0
          ? this.redondear(
              (
                ganadas /
                pruebas
              ) *
                100
            )
          : null,

      patrones:
        patronesMercado.length,

      patronesFavorables:
        patronesMercado
          .filter(
            (
              item
            ) =>
              item
                ?.clasificacion ===
              "FAVORABLE"
          )
          .length,

      patronesRiesgo:
        patronesMercado
          .filter(
            (
              item
            ) =>
              item
                ?.clasificacion ===
              "RIESGO"
          )
          .length,

      muestrasManual:
        manuales.length,

      promedioManualClickTargetMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .manualClickToTargetMs
          )
        ),

      promedioManualClickBuyMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .manualClickToBuyMs
          )
        ),

      promedioPrepareManualReadyMs:
        this.promedio(
          manuales.map(
            (
              item
            ) =>
              item
                .prepareToManualReadyMs
          )
        ),

      muestrasTimingFix12:
        timingValido.length,

      muestrasTimingDescartadas:
        finalizadas.length -
        timingValido.length,

      promedioSignalToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      promedioProposalMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.proposalLatencyMs
          )
        ),

      promedioTargetToPullRequestMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullRequestMs
          )
        ),

      medianaTargetToPullRequestMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullRequestMs
          )
        ),

      promedioTargetToPullReceivedMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullReceivedMs
          )
        ),

      medianaTargetToPullReceivedMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.targetToPullReceivedMs
          )
        ),

      promedioProgrammedToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.programmedToBuyMs
          )
        ),

      promedioBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyLatencyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        ),

      medianaDesviacionTargetMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        ),

      retrasoReferenciaMs:
        this.obtenerRetrasoReferencia(
          symbol
        ),

      comparadorTiming:
        this.construirComparadorTiming(
          finalizadas
        ),

      perfilSenalFix13:
        perfil,

      analisisPerfilFix13_2:
        perfil

    };

  }


  obtenerResumenMercados() {

    const resultado =
      {};


    for (
      const mercado
      of MERCADOS_CONTROLADOS
    ) {

      resultado[
        mercado
      ] =
        this.obtenerResumenMercado(
          mercado
        );

    }


    return resultado;

  }


  obtenerResumenFamilia(
    familia
  ) {

    const datos =
      this.obtenerTelemetriaPorFamilia(
        familia
      );


    const finalizadas =
      datos.filter(
        (
          item
        ) =>
          item.resultado ===
            "GANADA" ||
          item.resultado ===
            "PERDIDA"
      );


    const timingValido =
      this.filtrarTimingValido(
        finalizadas
      );


    const ganadas =
      finalizadas.filter(
        (
          item
        ) =>
          item.resultado ===
          "GANADA"
      ).length;


    const pruebas =
      finalizadas.length;


    return {

      familia:
        String(
          familia
        )
          .toUpperCase(),

      pruebas,

      ganadas,

      perdidas:
        pruebas -
        ganadas,

      accuracy:
        pruebas >
          0
          ? this.redondear(
              (
                ganadas /
                pruebas
              ) *
                100
            )
          : null,

      muestrasTimingFix12:
        timingValido.length,

      promedioSignalToBuyMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      medianaSignalToBuyMs:
        this.mediana(
          timingValido.map(
            (
              item
            ) =>
              item.signalToBuyMs
          )
        ),

      promedioDesviacionTargetMs:
        this.promedio(
          timingValido.map(
            (
              item
            ) =>
              item.buyTargetDeviationMs
          )
        )

    };

  }


  obtenerComparacionMercado(
    mercado
  ) {

    const resumen =
      this.obtenerResumenMercado(
        mercado
      );


    return {

      mercado:
        resumen.mercado,

      familia:
        resumen.familia,

      pruebas:
        resumen.pruebas,

      accuracy:
        resumen.accuracy,

      calibracionActualMs:
        resumen
          .calibracionActualMs,

      muestrasTimingFix12:
        resumen
          .muestrasTimingFix12,

      muestrasTimingDescartadas:
        resumen
          .muestrasTimingDescartadas,

      ganadas:
        resumen
          .comparadorTiming
          .ganadas,

      perdidas:
        resumen
          .comparadorTiming
          .perdidas,

      diferenciaPromedioMs:
        resumen
          .comparadorTiming
          .diferenciaPromedioMs,

      diferenciaMedianaMs:
        resumen
          .comparadorTiming
          .diferenciaMedianaMs,

      diferenciaTargetMedianaMs:
        resumen
          .comparadorTiming
          .diferenciaTargetMedianaMs,

      lectura:
        resumen
          .comparadorTiming
          .lectura,

      perfilSenalFix13:
        resumen
          .perfilSenalFix13,

      analisisPerfilFix13_2:
        resumen
          .analisisPerfilFix13_2

    };

  }


  obtenerResumenCalibracion(
    mercado
  ) {

    const symbol =
      this.normalizarMercado(
        mercado
      );


    const ajustes =
      {};


    for (
      const ajuste
      of AJUSTES_PERMITIDOS_MS
    ) {

      const datos =
        this
          .obtenerTelemetriaPorCalibracion(
            symbol,
            ajuste
          )
          .filter(
            (
              item
            ) =>
              (
                item.resultado ===
                  "GANADA" ||
                item.resultado ===
                  "PERDIDA"
              ) &&
              item
                ?.modoEjecucion !==
                MODOS_EJECUCION.MANUAL
          );


      const ganadas =
        datos.filter(
          (
            item
          ) =>
            item.resultado ===
            "GANADA"
        ).length;


      ajustes[
        String(
          ajuste
        )
      ] = {

        ajusteMs:
          ajuste,

        ajusteSeg:
          ajuste /
          1000,

        pruebas:
          datos.length,

        ganadas,

        perdidas:
          datos.length -
          ganadas,

        accuracy:
          datos.length >
            0
            ? this.redondear(
                (
                  ganadas /
                  datos.length
                ) *
                  100
              )
            : null

      };

    }


    return {

      mercado:
        symbol,

      ajusteActualMs:
        this.obtenerAjusteMercado(
          symbol
        ),

      ajustes

    };

  }


  /* ========================================
     PREPARAR PROPUESTA
     ======================================== */

  async crearPreparacion(
    senal,
    telemetria
  ) {

    const contrato =
      contractMapper
        .mapear(
          senal
        );


    if (
      !contrato.ok
    ) {

      return {

        ok:
          false,

        etapa:
          "CONTRACT_MAPPER",

        error:
          contrato.error

      };

    }


    this.ultimoContrato =
      contrato;


    const propuestaSimulada =
      proposalSimulator
        .crearPropuesta(
          contrato,
          {

            monto:
              this
                .configuracion
                .monto,

            moneda:
              this
                .configuracion
                .moneda,

            duracion:
              this
                .configuracion
                .duracion,

            unidadDuracion:
              this
                .configuracion
                .unidadDuracion

          }
        );


    if (
      !propuestaSimulada.ok
    ) {

      return {

        ok:
          false,

        etapa:
          "PROPOSAL_SIMULATOR",

        error:
          propuestaSimulada.error

      };

    }


    this.ultimaPropuesta =
      propuestaSimulada;


    telemetria
      .proposalRequestedEpoch =
      Date.now();


    telemetria
      .proposalRequestedPerf =
      this.ahora();


    try {

      executionRecorder
        .recordProposalRequested(
          String(
            senal.id
          )
        );

    }

    catch (
      error
    ) {

      console.warn(
        "EXECUTION RECORDER proposal:",
        error
      );

    }


    const propuestaDeriv =
      await derivProposal
        .solicitar(
          contrato,
          {

            monto:
              this
                .configuracion
                .monto,

            moneda:
              this
                .configuracion
                .moneda,

            duracion:
              this
                .configuracion
                .duracion,

            unidadDuracion:
              this
                .configuracion
                .unidadDuracion

          }
        );


    telemetria
      .proposalReceivedEpoch =
      Date.now();


    telemetria
      .proposalReceivedPerf =
      this.ahora();


    try {

      executionRecorder
        .recordProposalReceived(
          String(
            senal.id
          ),
          {

            receivedAt:
              telemetria
                .proposalReceivedEpoch

          }
        );

    }

    catch (
      error
    ) {

      console.warn(
        "EXECUTION RECORDER response:",
        error
      );

    }


    if (
      !propuestaDeriv.ok
    ) {

      return {

        ok:
          false,

        etapa:
          "DERIV_PROPOSAL",

        error:
          propuestaDeriv.error,

        contrato,

        propuestaSimulada,

        propuestaDeriv

      };

    }


    this.ultimaPropuestaDeriv =
      propuestaDeriv;


    telemetria
      .proposalPreparedEpoch =
      Date.now();


    telemetria.resultado =
      "PROPUESTA_PREPARADA";


    return {

      ok:
        true,

      contrato,

      propuestaSimulada,

      propuestaDeriv

    };

  }


  /* ========================================
     PREPARAR
     ======================================== */

  async procesarPreparacion(
    senal
  ) {

    const operacionId =
      this.obtenerOperacionId(
        senal
      );


    if (
      !operacionId
    ) {

      return {

        aceptada:
          false,

        etapa:
          "PREPARAR",

        motivo:
          "PREPARAR no incluye operacionId."

      };

    }


    const ciclo =
      this.activarCicloOperacion(
        operacionId
      );


    if (
      !ciclo.ok
    ) {

      return {
        aceptada:
          false,
        fase:
          "PREPARAR",
        estado:
          "CICLO_OCUPADO",
        motivo:
          ciclo.motivo,
        operacionActivaId:
          ciclo.operacionActivaId ??
          this.operacionActivaId
      };

    }


    if (
      this.preparaciones
        .has(
          operacionId
        )
    ) {

      const existente =
        this.preparaciones
          .get(
            operacionId
          );


      return {

        aceptada:
          true,

        fase:
          "PREPARAR",

        estado:
          "YA_PREPARADA",

        operacionId,

        contrato:
          existente.contrato,

        propuestaDeriv:
          existente.propuestaDeriv,

        analisisPatron:
          existente
            .analisisPatron ??
          null,

        telemetria:
          {
            ...existente.telemetria
          }

      };

    }


    this.limpiarManualPendienteAnterior(
      operacionId
    );


    /*
      FIX13.8:
      Antes de comprar nada,
      consultamos memoria histórica.
    */

    const analisisPatron =
      this.analizarPatron(
        senal
      );


    let analisisMovimientoParidad;

    try {
      analisisMovimientoParidad =
        this.analizarMovimientoParidad(
          senal
        );
    }
    catch (error) {
      analisisMovimientoParidad = {
        disponible: false,
        clasificacion: "SIN_EVIDENCIA",
        decision: "APRENDER",
        bloquear: false,
        muestras: 0,
        accuracy: null,
        motivo: "Filtro de movimiento omitido de forma segura.",
        error: String(error?.message || error || "")
      };
    }


    let analisisTimingBuy;

    try {
      analisisTimingBuy =
        this.analizarTimingBuyDecision(
          senal
        );
    }
    catch (error) {
      analisisTimingBuy = {
        disponible: false,
        bloquear: false,
        apoyar: false,
        clasificacion: "OMITIDO_SEGURO",
        decision: "APRENDER",
        muestras: 0,
        accuracy: null,
        motivo: "Análisis de timing BUY omitido de forma segura.",
        error: String(error?.message || error || "")
      };
    }


    let analisisOportunidadHistorica;

    try {
      analisisOportunidadHistorica =
        this.analizarOportunidadHistorica(
          senal,
          analisisPatron
        );
    }
    catch (error) {
      analisisOportunidadHistorica = {
        disponible: false,
        permitir: false,
        clasificacion: "OMITIDO_SEGURO",
        decision: "ESPERAR",
        motivo: "Oportunidad histórica omitida de forma segura.",
        error: String(error?.message || error || "")
      };
    }


    let analisisRegimenRacha;

    try {
      analisisRegimenRacha =
        this.analizarRegimenRacha(
          senal,
          analisisMovimientoParidad
        );
    }
    catch (error) {
      analisisRegimenRacha = {
        disponible: false,
        bloquear: false,
        clasificacion: "OMITIDO_SEGURO",
        decision: "OPERAR",
        motivo: "Guardia de rachas omitida de forma segura.",
        error: String(error?.message || error || "")
      };
    }


    const telemetria =
      this.crearTelemetria(
        senal
      );


    telemetria
      .patronClasificacion =
      analisisPatron
        .clasificacion;


    telemetria
      .patronFuerza =
      analisisPatron
        .fuerza;


    telemetria
      .patronDecision =
      analisisPatron
        .decision;


    telemetria
      .patronMuestrasPrevias =
      analisisPatron
        .muestras;


    telemetria
      .patronGanadasPrevias =
      analisisPatron
        .ganadas;


    telemetria
      .patronPerdidasPrevias =
      analisisPatron
        .perdidas;


    telemetria
      .patronAccuracyPrevio =
      analisisPatron
        .accuracy;


    telemetria
      .movimientoParidadKey =
      analisisMovimientoParidad
        ?.key ?? null;


    telemetria
      .movimientoParidadFirma =
      analisisMovimientoParidad
        ?.disponible
          ? {
              ...analisisMovimientoParidad
            }
          : null;


    telemetria
      .movimientoParidadClasificacion =
      analisisMovimientoParidad
        ?.clasificacion ?? null;


    telemetria
      .movimientoParidadFuerza =
      analisisMovimientoParidad
        ?.fuerza ?? null;


    telemetria
      .movimientoParidadDecision =
      analisisMovimientoParidad
        ?.decision ?? null;


    telemetria
      .movimientoParidadMuestrasPrevias =
      Number(
        analisisMovimientoParidad
          ?.muestras || 0
      );


    telemetria
      .movimientoParidadAccuracyPrevio =
      analisisMovimientoParidad
        ?.accuracy ?? null;


    telemetria
      .timingBuyClasificacion =
      analisisTimingBuy
        ?.clasificacion ?? null;

    telemetria
      .timingBuyDecision =
      analisisTimingBuy
        ?.decision ?? null;

    telemetria
      .timingBuyMuestrasPrevias =
      Number(
        analisisTimingBuy
          ?.muestras || 0
      );

    telemetria
      .timingBuyAccuracyPrevio =
      analisisTimingBuy
        ?.accuracy ?? null;

    telemetria
      .timingBuyAnalisis =
      analisisTimingBuy
        ? { ...analisisTimingBuy }
        : null;


    telemetria
      .oportunidadHistorica =
      analisisOportunidadHistorica
        ? { ...analisisOportunidadHistorica }
        : null;


    telemetria
      .regimenRachaClasificacion =
      analisisRegimenRacha
        ?.clasificacion ?? null;

    telemetria
      .regimenRachaDecision =
      analisisRegimenRacha
        ?.decision ?? null;

    telemetria
      .regimenRachaBloqueado =
      false;

    telemetria
      .regimenRacha =
      analisisRegimenRacha
        ? { ...analisisRegimenRacha }
        : null;


    const preparacion =
      await this.crearPreparacion(
        senal,
        telemetria
      );


    if (
      !this.esOperacionActiva(
        operacionId
      )
    ) {

      return {
        aceptada:
          false,
        fase:
          "PREPARAR",
        estado:
          "PREPARACION_OBSOLETA",
        motivo:
          "La propuesta terminó después de que el ciclo fue reemplazado.",
        operacionId
      };

    }


    if (
      !preparacion.ok
    ) {

      telemetria.resultado =
        preparacion.etapa ===
          "DERIV_PROPOSAL"
          ? "PROPUESTA_RECHAZADA"
          : "PREPARACION_RECHAZADA";


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        "PREPARACION_RECHAZADA"
      );


      return {

        aceptada:
          false,

        fase:
          "PREPARAR",

        etapa:
          preparacion.etapa,

        motivo:
          preparacion.error,

        analisisPatron,

        telemetria

      };

    }


    const ahora =
      Date.now();


    const manualReady =
      this.esModoManual();


    if (
      manualReady
    ) {

      telemetria
        .modoEjecucion =
        MODOS_EJECUCION.MANUAL;


      telemetria
        .manualReadyEpoch =
        ahora;


      telemetria
        .prepareToManualReadyMs =
        this.redondear(
          ahora -
          telemetria
            .prepareReceivedEpoch
        );


      telemetria.resultado =
        "MANUAL_LISTO_SIN_TARGET";

    }


    const registro = {

      operacionId,

      cicloSecuencia:
        this.cicloSecuencia,

      buyConsumido:
        false,

      senalPreparacion:
        {
          ...senal
        },

      senalEjecucion:
        null,

      contrato:
        preparacion.contrato,

      propuesta:
        preparacion
          .propuestaSimulada,

      propuestaDeriv:
        preparacion
          .propuestaDeriv,

      telemetria,

      analisisPatron,

      analisisMovimientoParidad,

      analisisTimingBuy,

      analisisOportunidadHistorica,

      analisisRegimenRacha,

      preparedAt:
        ahora,

      targetReceivedAt:
        null,

      manualReadyAt:
        manualReady
          ? ahora
          : null,

      manualReady,

      modoPreparacion:
        this.modoEjecucion,

      ejecutando:
        false,

      manualConsumida:
        false

    };


    this.preparaciones
      .set(
        operacionId,
        registro
      );


    this.ultimaTelemetria =
      {
        ...telemetria
      };


    this.emitirEvento(
      "bot:prepared",
      {

        ok:
          true,

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        proposalId:
          preparacion
            .propuestaDeriv
            ?.id ??
          null,

        preparedAt:
          ahora,

        modoEjecucion:
          this.modoEjecucion,

        analisisPatron

      }
    );


    if (
      manualReady
    ) {

      this.emitirEvento(
        "bot:manual-ready",
        {

          ok:
            true,

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          targetExecutionAt:
            null,

          programmedExecutionAt:
            null,

          calibracionMs:
            this.obtenerAjusteMercado(
              senal.mercado
            ),

          readyAt:
            ahora,

          prepareToReadyMs:
            telemetria
              .prepareToManualReadyMs,

          targetDisponible:
            false,

          estado:
            "LISTO_SIN_TARGET",

          analisisPatron

        }
      );

    }


    return {

      aceptada:
        true,

      fase:
        "PREPARAR",

      estado:
        manualReady
          ? "MANUAL_LISTO_SIN_TARGET"
          : "PROPUESTA_PREPARADA",

      operacionId,

      mercado:
        senal.mercado,

      estrategia:
        senal.estrategia,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      analisisPatron,

      contrato:
        preparacion.contrato,

      propuesta:
        preparacion
          .propuestaSimulada,

      propuestaDeriv:
        preparacion
          .propuestaDeriv,

      compraDemo:
        null,

      resultadoDemo:
        null,

      telemetria:
        {
          ...telemetria
        },

      preparacionLista:
        true,

      ejecucionManualLista:
        manualReady,

      modoEjecucion:
        this.modoEjecucion,

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     TARGET
     ======================================== */

  actualizarTargetPreparacion(
    preparada,
    senal
  ) {

    const telemetria =
      preparada.telemetria;


    telemetria
      .targetReceivedEpoch =
      Date.now();


    const programacion =
      this.calcularProgramacion(
        senal
      );


    telemetria
      .targetExecutionAt =
      programacion
        .targetExecutionAt;


    telemetria
      .programmedExecutionAt =
      programacion
        .programmedAt;


    telemetria
      .calibracionMs =
      programacion
        .ajusteMs;


    telemetria
      .calibracionSeg =
      programacion
        .ajusteSeg;


    telemetria
      .programacionDisponible =
      programacion
        .disponible;


    telemetria
      .puedeAnticipar =
      programacion
        .puedeAnticipar;


    telemetria
      .programacionMotivo =
      programacion
        .motivo;


    telemetria
      .esperaProgramadaInicialMs =
      programacion
        .esperaMs;


    telemetria
      .esperaProgramadaMs =
      programacion
        .esperaMs;


    if (
      this.numeroValido(telemetria.manualReadyEpoch)
    ) {

      telemetria
        .targetToManualReadyMs =
        this.redondear(
          Number(
            telemetria
              .manualReadyEpoch
          ) -
          Number(
            telemetria
              .targetReceivedEpoch
          )
        );

    }


    return {

      telemetria,

      programacion

    };

  }


  /* ========================================
     COMPRA PREPARADA
     ======================================== */

  async ejecutarCompraPreparada(
    preparada,
    senal,
    {
      onOperacionUpdate =
        null,

      origen =
        "AUTOMATICO"
    } = {}
  ) {

    const operacionId =
      preparada
        ?.operacionId;


    const cicloVigenteInicial =
      this.validarCicloOperacion(
        operacionId,
        preparada
      );


    if (
      !cicloVigenteInicial.ok
    ) {

      return {
        aceptada:
          false,
        fase:
          "EJECUTAR",
        estado:
          "CICLO_OBSOLETO",
        motivo:
          cicloVigenteInicial.motivo,
        operacionId
      };

    }


    if (
      preparada.buyConsumido ===
      true
    ) {

      return {
        aceptada:
          false,
        fase:
          "EJECUTAR",
        estado:
          "BUY_YA_CONSUMIDO",
        motivo:
          "Este ciclo ya envió su único BUY.",
        operacionId
      };

    }


    if (
      preparada.ejecutando
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "Esta operación ya se está ejecutando."

      };

    }


    preparada.ejecutando =
      true;


    const telemetria =
      preparada.telemetria;


        /* ====================================
       FIX13.7.1
       TARGET / PROGRAMACIÓN SEGURA

       null NO puede convertirse en 0.
       ==================================== */

    const targetExecutionAt =
      this.numeroSeguro(
        telemetria
          .targetExecutionAt
      );


    const programmedAt =
      this.numeroSeguro(
        telemetria
          .programmedExecutionAt
      );


    const calibracionMs =
      this.numeroSeguro(
        telemetria
          .calibracionMs
      ) ??
      0;


    if (
      !derivTrade
        .obtenerEstado()
        .ejecucionActiva
    ) {

      telemetria.resultado =
        "SOLO_COTIZACION";


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "SOLO_COTIZACION",

        operacionId,

        analisisPatron:
          preparada
            .analisisPatron ??
          null,

        contrato:
          preparada.contrato,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

        compraDemo:
          null,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          },

        ejecucionDemoActiva:
          false

      };

    }


    const buyRequestedAt =
      Date.now();


    telemetria
      .buyRequestedEpoch =
      buyRequestedAt;


    telemetria
      .buyRequestedPerf =
      this.ahora();


    if (
      Number.isFinite(
        programmedAt
      )
    ) {

      telemetria
        .buyTargetDeviationMs =
        this.redondear(
          buyRequestedAt -
          programmedAt
        );

    }


    if (
      origen ===
        "MANUAL" &&
      this.numeroValido(telemetria.manualClickEpoch)
    ) {

      telemetria
        .manualClickToBuyMs =
        this.redondear(
          buyRequestedAt -
          Number(
            telemetria
              .manualClickEpoch
          )
        );

    }


    /*
      FIX14.1:
      Consumimos el único BUY antes de tocar Deriv.
      Aunque llegue otro evento, este ciclo no puede comprar otra vez.
    */

    preparada.buyConsumido =
      true;


    this.emitirEvento(
      "bot:buy-requested",
      {

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        targetExecutionAt:
          Number.isFinite(
            targetExecutionAt
          )
            ? targetExecutionAt
            : null,

        programmedExecutionAt:
          Number.isFinite(
            programmedAt
          )
            ? programmedAt
            : null,

        calibracionMs,

        buyRequestedAt,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        modoEjecucion:
          telemetria
            .modoEjecucion,

        manualClickEpoch:
          telemetria
            .manualClickEpoch,

        manualClickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        manualClickToBuyMs:
          telemetria
            .manualClickToBuyMs,

        analisisPatron:
          preparada
            .analisisPatron ??
          null

      }
    );


    let compraDemo =
      null;


    try {

      compraDemo =
        await derivTrade
          .comprar(
            preparada
              .propuestaDeriv
          );

    }

    catch (
      error
    ) {

      telemetria.resultado =
        "BUY_ERROR";


      telemetria.buyError =
        error
          ?.message ??
        String(error);


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        "BUY_ERROR"
      );


      return {
        aceptada:
          false,
        fase:
          "EJECUTAR",
        estado:
          "BUY_ERROR",
        motivo:
          telemetria.buyError,
        operacionId,
        telemetria:
          {
            ...telemetria
          }
      };

    }


    const buyConfirmedAt =
      Date.now();


    telemetria
      .buyConfirmedEpoch =
      buyConfirmedAt;


    telemetria
      .buyConfirmedPerf =
      this.ahora();


    if (
      Number.isFinite(
        programmedAt
      )
    ) {

      telemetria
        .buyConfirmTargetDeviationMs =
        this.redondear(
          buyConfirmedAt -
          programmedAt
        );

    }


    if (
      !compraDemo.ok
    ) {

      telemetria.resultado =
        "BUY_RECHAZADO";


      this.emitirEvento(
        "bot:buy-confirmed",
        {

          ok:
            false,

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          error:
            compraDemo.error ??
            compraDemo.mensaje ??
            "BUY rechazado.",

          buyTargetDeviationMs:
            telemetria
              .buyTargetDeviationMs,

          buyConfirmTargetDeviationMs:
            telemetria
              .buyConfirmTargetDeviationMs,

          modoEjecucion:
            telemetria
              .modoEjecucion

        }
      );


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "BUY_RECHAZADO",

        operacionId,

        analisisPatron:
          preparada
            .analisisPatron ??
          null,

        contrato:
          preparada.contrato,

        propuesta:
          preparada.propuesta,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

        compraDemo,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          }

      };

    }


    this.ultimaCompraDemo =
      compraDemo.compra;


    telemetria.contractId =
      compraDemo
        .compra
        .contractId;


    this.emitirEvento(
      "bot:buy-confirmed",
      {

        ok:
          true,

        operacionId,

        mercado:
          senal.mercado,

        direccion:
          senal.direccion,

        compra:
          compraDemo.compra,

        targetExecutionAt:
          Number.isFinite(
            targetExecutionAt
          )
            ? targetExecutionAt
            : null,

        programmedExecutionAt:
          Number.isFinite(
            programmedAt
          )
            ? programmedAt
            : null,

        calibracionMs,

        buyTargetDeviationMs:
          telemetria
            .buyTargetDeviationMs,

        buyConfirmTargetDeviationMs:
          telemetria
            .buyConfirmTargetDeviationMs,

        modoEjecucion:
          telemetria
            .modoEjecucion,

        manualClickEpoch:
          telemetria
            .manualClickEpoch,

        manualClickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        manualClickToBuyMs:
          telemetria
            .manualClickToBuyMs

      }
    );


    let seguimiento =
      null;


    try {

      seguimiento =
        await derivTrade
          .esperarResultado(
            compraDemo
              .compra
              .contractId,
            {

              onUpdate:
                onOperacionUpdate

            }
          );

    }

    catch (
      error
    ) {

      seguimiento =
        {
          ok:
            false,
          error:
            error
              ?.message ??
            String(error)
        };

    }


    telemetria
      .resultReceivedEpoch =
      Date.now();


    telemetria
      .resultReceivedPerf =
      this.ahora();


    let resultadoDemo =
      null;


    if (
      seguimiento.ok
    ) {

      resultadoDemo =
        seguimiento.resultado;


      this.ultimoResultadoDemo =
        resultadoDemo;


      const profit =
        Number(
          resultadoDemo
            .profit ??
          0
        );


      telemetria.resultado =
        profit >
          0
          ? "GANADA"
          : "PERDIDA";


      telemetria.profit =
        profit;


      /*
        GESTIÓN DE RIESGO DE SESIÓN:
        evaluar límites justo después de
        conocer el resultado real.
      */

      this.actualizarRiesgoSesion(
        telemetria.resultado,
        profit
      );


      telemetria.source =
        resultadoDemo
          .source ??
        null;


      this.emitirEvento(
        "bot:result",
        {

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          resultado:
            telemetria
              .resultado,

          profit,

          resultadoDemo,

          modoEjecucion:
            telemetria
              .modoEjecucion,

          manualClickToTargetMs:
            telemetria
              .manualClickToTargetMs,

          manualClickToBuyMs:
            telemetria
              .manualClickToBuyMs

        }
      );

    }

    else {

      resultadoDemo =
        seguimiento;


      telemetria.resultado =
        "SIN_CONFIRMAR";


      telemetria.profit =
        null;


      this.emitirEvento(
        "bot:result",
        {

          operacionId,

          mercado:
            senal.mercado,

          direccion:
            senal.direccion,

          resultado:
            "SIN_CONFIRMAR",

          profit:
            null,

          resultadoDemo,

          modoEjecucion:
            telemetria
              .modoEjecucion

        }
      );

    }


    this.ultimaSenalProcesada =
      operacionId;


    this.guardarTelemetria(
      telemetria
    );


    /*
      FIX13.8:
      Solo GANADA/PERDIDA alimenta
      la memoria del patrón.
    */

    const patronActualizado =
      this.registrarResultadoPatron(
        telemetria
      );


    let movimientoParidadActualizado = null;

    try {
      movimientoParidadActualizado =
        this.registrarResultadoMovimientoParidad(
          telemetria
        );
    }
    catch {
      movimientoParidadActualizado = null;
    }


    this.limpiarCicloOperacion(
      operacionId,
      telemetria.resultado
    );


    const perfilSenal =
      this.obtenerResumenPerfilSenal(
        telemetria.mercado
      );


    return {

      aceptada:
        true,

      fase:
        "EJECUTAR",

      estado:
        telemetria.resultado,

      modo:
        this.modo,

      modoEjecucion:
        telemetria
          .modoEjecucion,

      operacionId,

      mercado:
        senal.mercado,

      familia:
        telemetria
          .familiaMercado,

      estrategia:
        senal.estrategia,

      direccion:
        senal.direccion,

      confianza:
        senal.confianza,

      scoreBruto:
        telemetria
          .scoreBruto,

      valorPatron:
        telemetria
          .valorPatron,

      analisisPatron:
        preparada
          .analisisPatron ??
        null,

      analisisMovimientoParidad:
        preparada
          .analisisMovimientoParidad ??
        null,

      analisisTimingBuy:
        preparada
          .analisisTimingBuy ??
        null,

      analisisRegimenRacha:
        preparada
          .analisisRegimenRacha ??
        null,

      patronActualizado,

      segundoEntrada:
        senal.segundosEntrada,

      calibracionMs:
        telemetria
          .calibracionMs,

      calibracionSeg:
        telemetria
          .calibracionSeg,

      programacionDisponible:
        telemetria
          .programacionDisponible,

      targetExecutionAt:
        telemetria
          .targetExecutionAt,

      programmedExecutionAt:
        telemetria
          .programmedExecutionAt,

      manualClickEpoch:
        telemetria
          .manualClickEpoch,

      manualClickToTargetMs:
        telemetria
          .manualClickToTargetMs,

      manualClickToProgrammedMs:
        telemetria
          .manualClickToProgrammedMs,

      manualClickToBuyMs:
        telemetria
          .manualClickToBuyMs,

      manualBuyToTargetMs:
        telemetria
          .manualBuyToTargetMs,

      buyTargetDeviationMs:
        telemetria
          .buyTargetDeviationMs,

      timingValido:
        telemetria
          .timingValido,

      timingClasificacion:
        telemetria
          .timingClasificacion,

      timingAnomalias:
        [
          ...(
            telemetria
              .timingAnomalias ||
            []
          )
        ],

      contrato:
        preparada.contrato,

      propuesta:
        preparada.propuesta,

      propuestaDeriv:
        preparada
          .propuestaDeriv,

      compraDemo,

      resultadoDemo,

      telemetria:
        {
          ...telemetria
        },

      resumenMercado:
        this.obtenerResumenMercado(
          telemetria.mercado
        ),

      comparacionMercado:
        this.obtenerComparacionMercado(
          telemetria.mercado
        ),

      resumenCalibracion:
        this.obtenerResumenCalibracion(
          telemetria.mercado
        ),

      perfilSenal,

      analisisPerfil:
        perfilSenal,

      resumenMemoria:
        this
          .obtenerResumenMemoriaPatrones(),

      ejecucionDemoActiva:
        derivTrade
          .obtenerEstado()
          .ejecucionActiva

    };

  }


  /* ========================================
     EJECUTAR / TARGET
     ======================================== */

  async procesarEjecucion(
    senal,
    {
      onOperacionUpdate =
        null
    } = {}
  ) {

    const operacionId =
      this.obtenerOperacionId(
        senal
      );


    if (
      !operacionId
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "EJECUTAR no incluye operacionId."

      };

    }


    if (
      !this.esOperacionActiva(
        operacionId
      )
    ) {

      return {
        aceptada:
          false,
        fase:
          "EJECUTAR",
        estado:
          "EJECUCION_OBSOLETA",
        motivo:
          "TARGET/EJECUTAR pertenece a un ciclo que ya no está vigente.",
        operacionId,
        operacionActivaId:
          this.operacionActivaId
      };

    }


    const preparada =
      this.preparaciones
        .get(
          operacionId
        );


    if (
      !preparada
    ) {

      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        etapa:
          "PREPARACION_NO_ENCONTRADA",

        motivo:
          "No existe una cotización PREPARAR para esta operación."

      };

    }


    preparada.senalEjecucion =
      {
        ...senal
      };


    preparada.targetReceivedAt =
      Date.now();


    const {
      telemetria,
      programacion
    } =
      this.actualizarTargetPreparacion(
        preparada,
        senal
      );


    if (
      !programacion.disponible
    ) {

      telemetria.resultado =
        "TARGET_INVALIDO";


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "TARGET no disponible.",

        telemetria

      };

    }


    /* ====================================
       MANUAL
       ==================================== */

    if (
      preparada
        .modoPreparacion ===
        MODOS_EJECUCION.MANUAL ||
      this.esModoManual()
    ) {

      telemetria
        .modoEjecucion =
        MODOS_EJECUCION.MANUAL;


      telemetria.resultado =
        "MANUAL_ESPERANDO_CLICK";


      preparada.manualReady =
        true;


      preparada.ejecutando =
        false;


      if (
        !this.numeroValido(telemetria.manualReadyEpoch)
      ) {

        telemetria
          .manualReadyEpoch =
          Date.now();


        preparada.manualReadyAt =
          telemetria
            .manualReadyEpoch;

      }


      telemetria
        .targetToManualReadyMs =
        this.redondear(
          Number(
            telemetria
              .manualReadyEpoch
          ) -
          Number(
            telemetria
              .targetReceivedEpoch
          )
        );


      this.ultimaTelemetria =
        {
          ...telemetria
        };


      this.emitirEvento(
        "bot:manual-ready",
        {

          ok:
            true,

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          targetExecutionAt:
            programacion
              .targetExecutionAt,

          programmedExecutionAt:
            programacion
              .programmedAt,

          calibracionMs:
            programacion
              .ajusteMs,

          readyAt:
            telemetria
              .manualReadyEpoch,

          prepareToReadyMs:
            telemetria
              .prepareToManualReadyMs,

          targetToReadyMs:
            telemetria
              .targetToManualReadyMs,

          targetDisponible:
            true,

          estado:
            "LISTO_CON_TARGET",

          analisisPatron:
            preparada
              .analisisPatron ??
            null

        }
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "MANUAL_ESPERANDO_CLICK",

        operacionId,

        mercado:
          senal.mercado,

        estrategia:
          senal.estrategia,

        direccion:
          senal.direccion,

        confianza:
          senal.confianza,

        scoreBruto:
          telemetria
            .scoreBruto,

        valorPatron:
          telemetria
            .valorPatron,

        analisisPatron:
          preparada
            .analisisPatron ??
          null,

        targetExecutionAt:
          programacion
            .targetExecutionAt,

        programmedExecutionAt:
          programacion
            .programmedAt,

        calibracionMs:
          programacion
            .ajusteMs,

        contrato:
          preparada.contrato,

        propuesta:
          preparada.propuesta,

        propuestaDeriv:
          preparada
            .propuestaDeriv,

        compraDemo:
          null,

        resultadoDemo:
          null,

        telemetria:
          {
            ...telemetria
          },

        modoEjecucion:
          MODOS_EJECUCION.MANUAL,

        ejecucionManualLista:
          true

      };

    }


    /* ====================================
       AUTOMÁTICO
       FILTRO HISTÓRICO FIX13.8
       ==================================== */

    telemetria
      .modoEjecucion =
      MODOS_EJECUCION.AUTOMATICO;


    const analisisPatron =
      preparada
        .analisisPatron ||
      this.analizarPatron(
        senal
      );


    let analisisMovimientoParidad =
      preparada
        .analisisMovimientoParidad ||
      null;

    if (!analisisMovimientoParidad) {
      try {
        analisisMovimientoParidad =
          this.analizarMovimientoParidad(
            senal
          );
      }
      catch {
        analisisMovimientoParidad = {
          disponible: false,
          clasificacion: "SIN_EVIDENCIA",
          decision: "APRENDER",
          bloquear: false,
          muestras: 0,
          accuracy: null
        };
      }
    }


    let analisisTimingBuy =
      preparada
        .analisisTimingBuy ||
      null;

    if (!analisisTimingBuy) {
      try {
        analisisTimingBuy =
          this.analizarTimingBuyDecision(
            senal
          );
      }
      catch {
        analisisTimingBuy = {
          disponible: false,
          bloquear: false,
          apoyar: false,
          clasificacion: "OMITIDO_SEGURO",
          decision: "APRENDER",
          muestras: 0,
          accuracy: null
        };
      }
    }


    let analisisEvidenciaFavorable =
      preparada
        .analisisEvidenciaFavorable ||
      null;

    if (!analisisEvidenciaFavorable) {
      try {
        analisisEvidenciaFavorable =
          this.analizarEvidenciaFavorable(
            senal,
            analisisPatron,
            analisisMovimientoParidad,
            analisisTimingBuy
          );
      }
      catch {
        analisisEvidenciaFavorable = {
          disponible: false,
          bloquear: false,
          clasificacion: "OMITIDO_SEGURO",
          decision: "OPERAR"
        };
      }
    }


    let analisisOportunidadHistorica =
      preparada
        .analisisOportunidadHistorica ||
      null;

    if (!analisisOportunidadHistorica) {
      try {
        analisisOportunidadHistorica =
          this.analizarOportunidadHistorica(
            senal,
            analisisPatron
          );
      }
      catch {
        analisisOportunidadHistorica = {
          disponible: false,
          permitir: false,
          clasificacion: "OMITIDO_SEGURO",
          decision: "ESPERAR"
        };
      }
    }


    let analisisRegimenRacha =
      preparada
        .analisisRegimenRacha ||
      null;

    if (!analisisRegimenRacha) {
      try {
        analisisRegimenRacha =
          this.analizarRegimenRacha(
            senal,
            analisisMovimientoParidad
          );
      }
      catch {
        analisisRegimenRacha = {
          disponible: false,
          bloquear: false,
          clasificacion: "OMITIDO_SEGURO",
          decision: "OPERAR"
        };
      }
    }


    /*
      Solo se bloquea si:
      - automático
      - filtro activado
      - patrón RIESGO
      - ya alcanzó mínimo de muestras
    */

    const bloquearPorPatron =
      PATTERN_CONTROL
        .blockRiskInAutomatic &&
      analisisPatron
        ?.bloquear ===
        true &&
      Number(
        analisisPatron
          ?.muestras ??
        0
      ) >=
        PATTERN_CONTROL
          .minimumDecisionSamples;


    const bloquearPorMovimiento =
      PARITY_MOVEMENT_CONTROL
        .blockRiskInAutomatic &&
      analisisMovimientoParidad
        ?.bloquear === true &&
      Number(
        analisisMovimientoParidad
          ?.muestras || 0
      ) >=
        PARITY_MOVEMENT_CONTROL
          .minimumDecisionSamples;


    const bloquearPorTimingBuy =
      BUY_TIMING_DECISION_CONTROL
        .blockRiskInAutomatic &&
      analisisTimingBuy
        ?.bloquear === true &&
      Number(
        analisisTimingBuy
          ?.muestras || 0
      ) >=
        BUY_TIMING_DECISION_CONTROL
          .minimumSamples;


    const oportunidadHistoricaDetectada =
      analisisOportunidadHistorica
        ?.permitir === true;


    /*
      FIX14.9 · FAVORABLE ZONE GATE CONTROLADO
      El historial ganador solo puede liberar
      EVIDENCIA_INSUFICIENTE cuando ninguno de
      los filtros duros actuales detecta riesgo.
    */
    const liberarPorOportunidadHistorica =
      oportunidadHistoricaDetectada &&
      !bloquearPorPatron &&
      !bloquearPorMovimiento &&
      !bloquearPorTimingBuy &&
      !(analisisRegimenRacha?.bloquear === true);


    const bloquearPorEvidencia =
      FAVORABLE_EVIDENCE_CONTROL
        .blockInsufficientEvidenceInAutomatic &&
      analisisEvidenciaFavorable
        ?.bloquear === true &&
      !liberarPorOportunidadHistorica;


    const bloquearPorRegimen =
      analisisRegimenRacha
        ?.bloquear === true;


    telemetria
      .timingBuyBloqueado =
      bloquearPorTimingBuy;

    telemetria
      .timingBuyAnalisis =
      analisisTimingBuy
        ? { ...analisisTimingBuy }
        : null;


    telemetria
      .evidenciaFavorableBloqueada =
      bloquearPorEvidencia;

    telemetria
      .evidenciaFavorableAnalisis =
      analisisEvidenciaFavorable
        ? { ...analisisEvidenciaFavorable }
        : null;


    telemetria
      .oportunidadHistorica =
      analisisOportunidadHistorica
        ? { ...analisisOportunidadHistorica }
        : null;

    telemetria
      .oportunidadHistoricaDetectada =
      oportunidadHistoricaDetectada;

    telemetria
      .oportunidadHistoricaPermitida =
      liberarPorOportunidadHistorica;


    telemetria
      .regimenRachaBloqueado =
      bloquearPorRegimen;


    telemetria
      .movimientoParidadBloqueado =
      bloquearPorMovimiento;


    if (
      liberarPorOportunidadHistorica &&
      analisisEvidenciaFavorable?.bloquear === true
    ) {

      this.emitirEvento(
        "bot:historical-rescue-activated",
        {
          operacionId,
          mercado: senal.mercado,
          estrategia: senal.estrategia,
          direccion: senal.direccion,
          confianza: senal.confianza,
          analisisPatron,
          analisisMovimientoParidad,
          analisisTimingBuy,
          analisisRegimenRacha,
          analisisOportunidadHistorica,
          motivo: "FIX14.9: una zona histórica favorable liberó únicamente EVIDENCIA_INSUFICIENTE."
        }
      );

    }


    if (
      bloquearPorEvidencia
    ) {

      telemetria.resultado =
        "NO_OPERAR_EVIDENCIA_INSUFICIENTE";

      this.guardarTelemetria(
        telemetria
      );

      this.emitirEvento(
        "bot:favorable-evidence-blocked",
        {
          operacionId,
          mercado: senal.mercado,
          estrategia: senal.estrategia,
          direccion: senal.direccion,
          confianza: senal.confianza,
          analisisPatron,
          analisisMovimientoParidad,
          analisisTimingBuy,
          analisisEvidenciaFavorable,
          analisisOportunidadHistorica,
          motivo:
            analisisEvidenciaFavorable?.motivo ||
            "Evidencia favorable insuficiente. BUY automático bloqueado."
        }
      );

      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );

      return {
        aceptada: true,
        fase: "EJECUTAR",
        estado: "NO_OPERAR_EVIDENCIA_INSUFICIENTE",
        bloqueada: true,
        motivo:
          analisisEvidenciaFavorable?.motivo ||
          "La entrada no reunió evidencia favorable suficiente. No se ejecutó BUY.",
        operacionId,
        mercado: senal.mercado,
        estrategia: senal.estrategia,
        direccion: senal.direccion,
        confianza: senal.confianza,
        analisisPatron,
        analisisMovimientoParidad,
        analisisTimingBuy,
        analisisEvidenciaFavorable,
        analisisOportunidadHistorica,
        analisisRegimenRacha,
        telemetria: { ...telemetria },
        compraDemo: null,
        resultadoDemo: null
      };

    }


    if (
      bloquearPorTimingBuy
    ) {

      telemetria.resultado =
        "NO_OPERAR_TIMING_BUY_RIESGO";

      this.guardarTelemetria(
        telemetria
      );

      this.emitirEvento(
        "bot:buy-timing-blocked",
        {
          operacionId,
          mercado: senal.mercado,
          estrategia: senal.estrategia,
          direccion: senal.direccion,
          confianza: senal.confianza,
          analisisPatron,
          analisisMovimientoParidad,
          analisisTimingBuy,
          analisisRegimenRacha,
          motivo:
            analisisTimingBuy?.motivo ||
            "Timing BUY histórico de riesgo. BUY automático bloqueado."
        }
      );

      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );

      return {
        aceptada: true,
        fase: "EJECUTAR",
        estado: "NO_OPERAR_TIMING_BUY_RIESGO",
        bloqueada: true,
        motivo:
          analisisTimingBuy?.motivo ||
          "Timing BUY histórico de riesgo. No se ejecutó BUY.",
        operacionId,
        mercado: senal.mercado,
        estrategia: senal.estrategia,
        direccion: senal.direccion,
        confianza: senal.confianza,
        analisisPatron,
        analisisMovimientoParidad,
        analisisTimingBuy,
        analisisRegimenRacha,
        telemetria: { ...telemetria },
        compraDemo: null,
        resultadoDemo: null
      };

    }


    if (
      bloquearPorRegimen
    ) {

      this.marcarSaltoRegimen(
        analisisRegimenRacha
      );

      telemetria.resultado =
        "NO_OPERAR_RACHA_RIESGO";

      this.guardarTelemetria(
        telemetria
      );

      this.emitirEvento(
        "bot:regime-guard-blocked",
        {
          operacionId,
          mercado: senal.mercado,
          estrategia: senal.estrategia,
          direccion: senal.direccion,
          confianza: senal.confianza,
          analisisPatron,
          analisisMovimientoParidad,
          analisisRegimenRacha,
          motivo: analisisRegimenRacha?.motivo ||
            "Racha perdedora reciente: señal automática omitida."
        }
      );

      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );

      return {
        aceptada: true,
        fase: "EJECUTAR",
        estado: "NO_OPERAR_RACHA_RIESGO",
        bloqueada: true,
        motivo: analisisRegimenRacha?.motivo ||
          "Racha perdedora reciente: no se ejecutó BUY.",
        operacionId,
        mercado: senal.mercado,
        estrategia: senal.estrategia,
        direccion: senal.direccion,
        confianza: senal.confianza,
        analisisPatron,
        analisisMovimientoParidad,
        analisisRegimenRacha,
        telemetria: { ...telemetria },
        compraDemo: null,
        resultadoDemo: null
      };

    }


    if (
      bloquearPorMovimiento
    ) {

      telemetria.resultado =
        "NO_OPERAR_MOVIMIENTO_RIESGO";


      this.guardarTelemetria(
        telemetria
      );


      this.emitirEvento(
        "bot:parity-movement-blocked",
        {
          operacionId,
          mercado: senal.mercado,
          estrategia: senal.estrategia,
          direccion: senal.direccion,
          confianza: senal.confianza,
          analisisPatron,
          analisisMovimientoParidad,
          motivo:
            "Movimiento EVEN/ODD histórico de riesgo. BUY automático bloqueado."
        }
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {
        aceptada: true,
        fase: "EJECUTAR",
        estado: "NO_OPERAR_MOVIMIENTO_RIESGO",
        bloqueada: true,
        motivo:
          "Movimiento EVEN/ODD histórico de riesgo. No se ejecutó BUY.",
        operacionId,
        mercado: senal.mercado,
        estrategia: senal.estrategia,
        direccion: senal.direccion,
        confianza: senal.confianza,
        analisisPatron,
        analisisMovimientoParidad,
        telemetria: {
          ...telemetria
        },
        compraDemo: null,
        resultadoDemo: null
      };

    }


    if (
      bloquearPorPatron
    ) {

      telemetria
        .patronBloqueado =
        true;


      telemetria.resultado =
        "NO_OPERAR_PATRON_RIESGO";


      /*
        Importante:
        NO contamos esto como pérdida
        ni como ganada porque no hubo BUY.
      */

      this.guardarTelemetria(
        telemetria
      );


      this.emitirEvento(
        "bot:pattern-blocked",
        {

          operacionId,

          mercado:
            senal.mercado,

          estrategia:
            senal.estrategia,

          direccion:
            senal.direccion,

          confianza:
            senal.confianza,

          scoreBruto:
            telemetria
              .scoreBruto,

          valorPatron:
            telemetria
              .valorPatron,

          analisisPatron,

          motivo:
            "Patrón histórico de riesgo. BUY automático bloqueado."

        }
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {

        aceptada:
          true,

        fase:
          "EJECUTAR",

        estado:
          "NO_OPERAR_PATRON_RIESGO",

        bloqueada:
          true,

        motivo:
          "Patrón histórico de riesgo. No se ejecutó BUY.",

        operacionId,

        mercado:
          senal.mercado,

        estrategia:
          senal.estrategia,

        direccion:
          senal.direccion,

        confianza:
          senal.confianza,

        scoreBruto:
          telemetria
            .scoreBruto,

        valorPatron:
          telemetria
            .valorPatron,

        analisisPatron,

        analisisMovimientoParidad,

        telemetria:
          {
            ...telemetria
          },

        compraDemo:
          null,

        resultadoDemo:
          null

      };

    }


    if (
      programacion.programmedAt <
      Date.now() -
        100
    ) {

      telemetria.resultado =
        "TARGET_PERDIDO";


      telemetria
        .buyTargetDeviationMs =
        this.redondear(
          Date.now() -
          programacion
            .programmedAt
        );


      this.guardarTelemetria(
        telemetria
      );


      this.limpiarCicloOperacion(
        operacionId,
        telemetria.resultado
      );


      return {

        aceptada:
          false,

        fase:
          "EJECUTAR",

        motivo:
          "El instante programado ya pasó.",

        analisisPatron,

        telemetria

      };

    }


    const restanteMs =
      Math.max(
        0,
        programacion
          .programmedAt -
        Date.now()
      );


    telemetria
      .esperaProgramadaMs =
      this.redondear(
        restanteMs
      );


    telemetria
      .waitStartedEpoch =
      Date.now();


    telemetria
      .calibrationWaitStartedPerf =
      this.ahora();


    if (
      restanteMs >
      0
    ) {

      await this.esperar(
        restanteMs
      );

    }


    telemetria
      .waitEndedEpoch =
      Date.now();


    telemetria
      .calibrationWaitEndedPerf =
      this.ahora();


    const cicloVigente =
      this.validarCicloOperacion(
        operacionId,
        preparada
      );


    if (
      !cicloVigente.ok
    ) {

      telemetria.resultado =
        "CICLO_OBSOLETO_ANTES_BUY";


      return {
        aceptada:
          false,
        fase:
          "EJECUTAR",
        estado:
          "CICLO_OBSOLETO_ANTES_BUY",
        motivo:
          cicloVigente.motivo,
        operacionId,
        telemetria:
          {
            ...telemetria
          }
      };

    }


    return this
      .ejecutarCompraPreparada(
        preparada,
        senal,
        {

          onOperacionUpdate,

          origen:
            "AUTOMATICO"

        }
      );

  }


  /* ========================================
     EJECUTAR AHORA MANUAL
     ======================================== */

  async ejecutarManual(
    operacionId = null,
    {
      onOperacionUpdate =
        null
    } = {}
  ) {

    const estado =
      this.puedeProcesar();


    if (
      !estado.ok
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          estado.motivo

      };

    }


    if (
      !this.esModoManual()
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "El BOT no está en modo MANUAL DIAGNÓSTICO."

      };

    }


    let preparada =
      null;


    if (
      operacionId
    ) {

      preparada =
        this.preparaciones
          .get(
            String(
              operacionId
            )
          ) ??
        null;

    }

    else {

      const pendientes =
        [
          ...this
            .preparaciones
            .values()
        ]
          .filter(
            (
              item
            ) =>
              item
                ?.manualReady ===
                true &&
              item
                ?.ejecutando !==
                true
          )
          .sort(
            (
              a,
              b
            ) =>
              Number(
                b
                  ?.manualReadyAt ??
                b
                  ?.preparedAt ??
                0
              ) -
              Number(
                a
                  ?.manualReadyAt ??
                a
                  ?.preparedAt ??
                0
              )
          );


      preparada =
        pendientes[
          0
        ] ??
        null;

    }


    if (
      !preparada
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "No hay una operación manual lista para ejecutar."

      };

    }


    const cicloManual =
      this.validarCicloOperacion(
        preparada
          ?.operacionId,
        preparada
      );


    if (
      !cicloManual.ok
    ) {

      return {
        aceptada:
          false,
        fase:
          "MANUAL",
        motivo:
          cicloManual.motivo
      };

    }


    if (
      !preparada.manualReady
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "La propuesta todavía no está lista."

      };

    }


    if (
      preparada.ejecutando
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "La operación ya se está ejecutando."

      };

    }


    if (
      preparada.manualConsumida ===
      true
    ) {

      return {

        aceptada:
          false,

        fase:
          "MANUAL",

        motivo:
          "Esta predicción ya fue utilizada. Espere una nueva señal válida."

      };

    }


    preparada.manualConsumida =
      true;


    const senal =
      preparada
        .senalEjecucion ??
      preparada
        .senalPreparacion;


    const telemetria =
      preparada.telemetria;


    const clickEpoch =
      Date.now();


    telemetria
      .modoEjecucion =
      MODOS_EJECUCION.MANUAL;


    telemetria
      .manualClickEpoch =
      clickEpoch;


    telemetria
      .manualClickPerf =
      this.ahora();


    if (
      this.numeroValido(telemetria.targetExecutionAt)
    ) {

      telemetria
        .manualClickToTargetMs =
        this.redondear(
          clickEpoch -
          Number(
            telemetria
              .targetExecutionAt
          )
        );

    }


    if (
      this.numeroValido(telemetria.programmedExecutionAt)
    ) {

      telemetria
        .manualClickToProgrammedMs =
        this.redondear(
          clickEpoch -
          Number(
            telemetria
              .programmedExecutionAt
          )
        );

    }


    /*
      MANUAL:
      el patrón se muestra pero
      NUNCA bloquea el botón.
    */

    this.emitirEvento(
      "bot:manual-click",
      {

        operacionId:
          preparada
            .operacionId,

        mercado:
          senal?.mercado,

        estrategia:
          senal?.estrategia,

        direccion:
          senal?.direccion,

        confianza:
          senal?.confianza,

        targetExecutionAt:
          telemetria
            .targetExecutionAt,

        programmedExecutionAt:
          telemetria
            .programmedExecutionAt,

        clickAt:
          clickEpoch,

        clickToTargetMs:
          telemetria
            .manualClickToTargetMs,

        clickToProgrammedMs:
          telemetria
            .manualClickToProgrammedMs,

        targetDisponible:
          this.numeroValido(telemetria.targetExecutionAt),

        analisisPatron:
          preparada
            .analisisPatron ??
          null

      }
    );


    return this
      .ejecutarCompraPreparada(
        preparada,
        senal,
        {

          onOperacionUpdate,

          origen:
            "MANUAL"

        }
      );

  }


  /* ========================================
     PROCESAR SEÑAL
     ======================================== */

  async procesarSenal(
    senal,
    {
      onOperacionUpdate =
        null,

      senalRecibidaPerf =
        null
    } = {}
  ) {

    void senalRecibidaPerf;


    const estado =
      this.puedeProcesar();


    if (
      !estado.ok
    ) {

      return {

        aceptada:
          false,

        motivo:
          estado.motivo

      };

    }


    if (
      !senal ||
      typeof senal !==
        "object"
    ) {

      return {

        aceptada:
          false,

        motivo:
          "Señal inválida."

      };

    }


    const fase =
      this.obtenerFase(
        senal
      );


    if (
      fase ===
      "PREPARAR"
    ) {

      return this
        .procesarPreparacion(
          senal
        );

    }


    if (
      fase ===
      "EJECUTAR"
    ) {

      return this
        .procesarEjecucion(
          senal,
          {

            onOperacionUpdate

          }
        );

    }


    return {

      aceptada:
        false,

      fase,

      motivo:
        "Señal sin protocolo PREPARAR/EJECUTAR. FIX14.1 requiere las dos fases."

    };

  }


  /* ========================================
     ANALÍTICA EN CACHÉ
     ======================================== */

  construirAnaliticaCompleta() {

    const comparaciones =
      {};


    const calibraciones =
      {};


    const perfilesSenal =
      {};


    const analisisPerfiles =
      {};


    const resumenMercados =
      {};


    for (
      const mercado
      of MERCADOS_CONTROLADOS
    ) {

      const resumen =
        this.obtenerResumenMercado(
          mercado
        );


      resumenMercados[
        mercado
      ] =
        resumen;


      comparaciones[
        mercado
      ] = {

        mercado:
          resumen.mercado,

        familia:
          resumen.familia,

        pruebas:
          resumen.pruebas,

        accuracy:
          resumen.accuracy,

        calibracionActualMs:
          resumen
            .calibracionActualMs,

        muestrasTimingFix12:
          resumen
            .muestrasTimingFix12,

        muestrasTimingDescartadas:
          resumen
            .muestrasTimingDescartadas,

        ganadas:
          resumen
            .comparadorTiming
            .ganadas,

        perdidas:
          resumen
            .comparadorTiming
            .perdidas,

        diferenciaPromedioMs:
          resumen
            .comparadorTiming
            .diferenciaPromedioMs,

        diferenciaMedianaMs:
          resumen
            .comparadorTiming
            .diferenciaMedianaMs,

        diferenciaTargetMedianaMs:
          resumen
            .comparadorTiming
            .diferenciaTargetMedianaMs,

        lectura:
          resumen
            .comparadorTiming
            .lectura,

        perfilSenalFix13:
          resumen
            .perfilSenalFix13,

        analisisPerfilFix13_2:
          resumen
            .analisisPerfilFix13_2

      };


      calibraciones[
        mercado
      ] =
        this.obtenerResumenCalibracion(
          mercado
        );


      perfilesSenal[
        mercado
      ] =
        resumen
          .perfilSenalFix13;


      analisisPerfiles[
        mercado
      ] =
        resumen
          .perfilSenalFix13;

    }


    return {

      resumenStandard:
        this.obtenerResumenFamilia(
          "STANDARD"
        ),

      resumen1S:
        this.obtenerResumenFamilia(
          "1S"
        ),

      resumenMercados,

      comparaciones,

      calibraciones,

      perfilesSenal,

      analisisPerfiles

    };

  }


  obtenerAnaliticaCache() {

    if (
      this.cacheAnalitica
    ) {

      return this.cacheAnalitica;

    }


    this.cacheAnalitica =
      this.construirAnaliticaCompleta();


    return this.cacheAnalitica;

  }


  /* ========================================
     ESTADO RÁPIDO
     ======================================== */

  obtenerEstadoRapido() {

    return {

      activo:
        this.activo,

      pausado:
        this.pausado,

      modo:
        this.modo,

      modoEjecucion:
        this.modoEjecucion,

      manualPendiente:
        this
          .obtenerPreparacionManualPendiente(),

      preparacionesActivas:
        this.preparaciones.size,

      operacionActivaId:
        this.operacionActivaId,

      cicloSecuencia:
        this.cicloSecuencia,

      ultimoMotivoLimpiezaCiclo:
        this.ultimoMotivoLimpiezaCiclo,

      ultimoCicloLimpioAt:
        this.ultimoCicloLimpioAt,

      versionTelemetria:
        TELEMETRY_VERSION,

      timingBase:
        TIMING_BASE_VERSION,

      sincronizacionVisual:
        SYNC_VERSION,

      versionPatrones:
        PATTERN_VERSION,

      protocolo:
        "PREPARAR_EJECUTAR_CICLO_UNICO",

      protocoloManual:
        "PREPARAR_CLICK_TARGET_BUY",

      ultimaSenalProcesada:
        this.ultimaSenalProcesada,

      ultimoContrato:
        this.ultimoContrato,

      ultimaPropuesta:
        this.ultimaPropuesta,

      ultimaPropuestaDeriv:
        this.ultimaPropuestaDeriv,

      ultimaCompraDemo:
        this.ultimaCompraDemo,

      ultimoResultadoDemo:
        this.ultimoResultadoDemo,

      ultimaTelemetria:
        this.ultimaTelemetria,

      ultimoAnalisisPatron:
        this.ultimoAnalisisPatron,

      resumenMemoriaPatrones:
        this
          .obtenerResumenMemoriaPatrones(),


      resumenTimingDireccion:
        this.obtenerResumenTimingDireccion(),

      auditoriaEstrategias:
        this.obtenerAuditoriaEstrategias(),

      calibracionDireccion:
        {...this.calibracionDireccion},

      ultimoAnalisisTimingBuy:
        this.ultimoAnalisisTimingBuy ?? null,

      ultimoAnalisisRegimenRacha:
        this.ultimoAnalisisRegimenRacha ?? null,

      buyTimingDecisionControl:
        {...BUY_TIMING_DECISION_CONTROL},

      regimeGuardControl:
        {...REGIME_GUARD_CONTROL},

      historicalOpportunityControl:
        {...HISTORICAL_OPPORTUNITY_CONTROL},

      ultimoAnalisisOportunidadHistorica:
        this.ultimoAnalisisOportunidadHistorica ?? null,

      ajustesDireccionPermitidosMs:
        [...DIRECTION_CALIBRATION_ALLOWED_MS],

      calibracionActual:
        {
          ...this.calibracion
        },

      ajustesPermitidosMs:
        [
          ...AJUSTES_PERMITIDOS_MS
        ],

      trade:
        derivTrade
          .obtenerEstado(),

      configuracion:
        {
          ...this.configuracion
        }

    };

  }


  /* ========================================
     ESTADO COMPLETO
     ======================================== */

  obtenerEstado() {

    const rapido =
      this.obtenerEstadoRapido();


    const analitica =
      this.obtenerAnaliticaCache();


    return {

      ...rapido,

      modosEjecucion:
        {
          ...MODOS_EJECUCION
        },

      filtroAutomaticoActivo:
        PATTERN_CONTROL
          .blockRiskInAutomatic,

      modoAprendizajeActivo:
        PATTERN_CONTROL
          .learningMode,

      controlPatrones:
        {
          ...PATTERN_CONTROL
        },

      versionesTimingCompatibles:
        [
          ...TIMING_COMPATIBLE_VERSIONS
        ],

      versionesPerfilCompatibles:
        [
          ...SIGNAL_PROFILE_VERSIONS
        ],

      limitesTiming:
        {
          ...TIMING_LIMITS
        },

      controlPerfil:
        {
          ...PROFILE_CONTROL
        },

      mercadosStandard:
        [
          ...MERCADOS_STANDARD
        ],

      mercados1S:
        [
          ...MERCADOS_1S
        ],

      mercadosControlados:
        [
          ...MERCADOS_CONTROLADOS
        ],

      resumenStandard:
        analitica
          .resumenStandard,

      resumen1S:
        analitica
          .resumen1S,

      resumenMercados:
        analitica
          .resumenMercados,

      comparaciones:
        analitica
          .comparaciones,

      calibraciones:
        analitica
          .calibraciones,

      perfilesSenal:
        analitica
          .perfilesSenal,

      analisisPerfiles:
        analitica
          .analisisPerfiles

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const botEngine =
  new BotEngine();


/* ==========================================
   FIN BOT-ENGINE.JS
   FIX14.8 FAVORABLE PRIORITY GATE + LOSS PROTECTION
   ========================================== */
