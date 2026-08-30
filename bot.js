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
        t
