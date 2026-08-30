/* ==========================================
   BOT V1 MR
   EXECUTION-RECORDER.JS
   MODO OBSERVADOR
   ========================================== */

/*
  OBJETIVO:

  - Registrar señales recibidas.
  - Registrar segundo objetivo.
  - Registrar TARGET temporal.
  - Registrar momento de preparación.
  - Registrar momento estimado de ejecución.
  - Registrar propuesta enviada/recibida.
  - Registrar resultado GANADA/PERDIDA.
  - NO compra.
  - NO modifica contratos.
  - NO altera la lógica del BOT.
*/

const STORAGE_KEY =
  "BOT_V1_MR_EXECUTION_RECORDS";

const MAX_RECORDS =
  300;


/* ==========================================
   UTILIDADES
   ========================================== */

function now() {
  return Date.now();
}

function safeNumber(value, fallback = null) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function readRecords() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  }
  catch {
    return [];
  }
}

function writeRecords(records) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        records.slice(
          -MAX_RECORDS
        )
      )
    );

    return true;
  }
  catch {
    return false;
  }
}

function generateId() {
  return [
    "EXEC",
    now(),
    Math.random()
      .toString(36)
      .slice(2, 8)
  ].join("-");
}


/* ==========================================
   CREAR REGISTRO
   ========================================== */

function createRecord(data = {}) {

  const record = {

    id:
      data.id ||
      generateId(),

    operationId:
      data.operationId ||
      data.operacionId ||
      null,

    createdAt:
      now(),

    signalReceivedAt:
      safeNumber(
        data.signalReceivedAt,
        now()
      ),

    market:
      data.market ||
      data.mercado ||
      null,

    strategy:
      data.strategy ||
      data.estrategia ||
      null,

    direction:
      data.direction ||
      data.direccion ||
      null,

    confidence:
      safeNumber(
        data.confidence ??
        data.confianza,
        0
      ),

    targetSecond:
      safeNumber(
        data.targetSecond ??
        data.segundosEntrada,
        null
      ),

    targetExecutionAt:
      safeNumber(
        data.targetExecutionAt,
        null
      ),

    targetVisualAt:
      safeNumber(
        data.targetVisualAt,
        null
      ),

    prepareReceivedAt:
      null,

    targetReceivedAt:
      null,

    proposalRequestedAt:
      null,

    proposalReceivedAt:
      null,

    proposalLatencyMs:
      null,

    executionScheduledAt:
      null,

    executionObservedAt:
      null,

    executionOffsetMs:
      null,

    contractId:
      null,

    result:
      "PENDING",

    profit:
      null,

    notes:
      [],

    metadata:
      data.metadata ||
      {}

  };


  const records =
    readRecords();

  records.push(
    record
  );

  writeRecords(
    records
  );

  return record;
}


/* ==========================================
   ACTUALIZAR REGISTRO
   ========================================== */

function updateRecord(
  id,
  patch = {}
) {

  const records =
    readRecords();

  const index =
    records.findIndex(
      (item) =>
        item.id === id ||
        item.operationId === id
    );

  if (
    index === -1
  ) {
    return null;
  }

  records[index] = {
    ...records[index],
    ...patch
  };

  writeRecords(
    records
  );

  return records[index];
}


/* ==========================================
   BUSCAR REGISTRO
   ========================================== */

function findRecord(id) {

  return (
    readRecords()
      .find(
        (item) =>
          item.id === id ||
          item.operationId === id
      ) ||
    null
  );
}


/* ==========================================
   EVENTOS DE OBSERVACIÓN
   ========================================== */

function recordPrepare(
  id,
  data = {}
) {

  return updateRecord(
    id,
    {
      prepareReceivedAt:
        now(),

      market:
        data.market ||
        data.mercado ||
        undefined,

      strategy:
        data.strategy ||
        data.estrategia ||
        undefined,

      direction:
        data.direction ||
        data.direccion ||
        undefined,

      confidence:
        safeNumber(
          data.confidence ??
          data.confianza,
          undefined
        )
    }
  );
}


function recordTarget(
  id,
  data = {}
) {

  const targetExecutionAt =
    safeNumber(
      data.targetExecutionAt,
      null
    );

  const targetVisualAt =
    safeNumber(
      data.targetVisualAt,
      targetExecutionAt
    );

  return updateRecord(
    id,
    {
      targetReceivedAt:
        now(),

      targetSecond:
        safeNumber(
          data.targetSecond ??
          data.segundosEntrada,
          undefined
        ),

      targetExecutionAt,

      targetVisualAt
    }
  );
}


function recordProposalRequested(
  id
) {

  return updateRecord(
    id,
    {
      proposalRequestedAt:
        now()
    }
  );
}


function recordProposalReceived(
  id,
  data = {}
) {

  const receivedAt =
    safeNumber(
      data.receivedAt,
      now()
    );

  const record =
    findRecord(
      id
    );

  const requestedAt =
    record
      ?.proposalRequestedAt ??
    null;

  return updateRecord(
    id,
    {
      proposalReceivedAt:
        receivedAt,

      proposalLatencyMs:
        Number.isFinite(
          requestedAt
        )
          ? receivedAt -
            requestedAt
          : null
    }
  );
}


/* ==========================================
   EJECUCIÓN OBSERVADA
   ========================================== */

function scheduleObservedExecution(
  id,
  executionAt
) {

  const target =
    safeNumber(
      executionAt,
      null
    );

  if (
    !Number.isFinite(
      target
    )
  ) {
    return null;
  }

  return updateRecord(
    id,
    {
      executionScheduledAt:
        target
    }
  );
}


function recordObservedExecution(
  id,
  executionAt = now()
) {

  const observedAt =
    safeNumber(
      executionAt,
      now()
    );

  const record =
    findRecord(
      id
    );

  const target =
    record
      ?.targetExecutionAt ??
    record
      ?.targetVisualAt ??
    null;

  return updateRecord(
    id,
    {
      executionObservedAt:
        observedAt,

      executionOffsetMs:
        Number.isFinite(
          target
        )
          ? observedAt -
            target
          : null
    }
  );
}


/* ==========================================
   RESULTADO
   ========================================== */

function recordResult(
  id,
  result,
  data = {}
) {

  const normalized =
    String(
      result ||
      ""
    )
      .trim()
      .toUpperCase();

  const finalResult =
    [
      "WIN",
      "GANADA",
      "SUCCESS"
    ].includes(
      normalized
    )
      ? "WIN"
      : [
          "LOSS",
          "PERDIDA",
          "FAILED"
        ].includes(
          normalized
        )
        ? "LOSS"
        : "PENDING";

  return updateRecord(
    id,
    {
      result:
        finalResult,

      profit:
        safeNumber(
          data.profit,
          null
        ),

      contractId:
        data.contractId ||
        null,

      closedAt:
        now()
    }
  );
}


/* ==========================================
   NOTAS
   ========================================== */

function addNote(
  id,
  note
) {

  const record =
    findRecord(
      id
    );

  if (
    !record
  ) {
    return null;
  }

  const notes =
    Array.isArray(
      record.notes
    )
      ? [
          ...record.notes
        ]
      : [];

  notes.push(
    {
      time:
        now(),

      text:
        String(
          note ||
          ""
        )
    }
  );

  return updateRecord(
    id,
    {
      notes
    }
  );
}


/* ==========================================
   CONSULTA
   ========================================== */

function all() {
  return readRecords();
}

function latest(
  limit = 20
) {

  return readRecords()
    .slice(
      -Math.max(
        1,
        Number(
          limit
        ) ||
        20
      )
    )
    .reverse();
}

function clear() {

  try {
    localStorage.removeItem(
      STORAGE_KEY
    );

    return true;
  }
  catch {
    return false;
  }
}


/* ==========================================
   RESUMEN DE CALIBRACIÓN
   ========================================== */

function summary() {

  const records =
    readRecords();

  const completed =
    records.filter(
      (item) =>
        item.result === "WIN" ||
        item.result === "LOSS"
    );

  const wins =
    completed.filter(
      (item) =>
        item.result === "WIN"
    ).length;

  const losses =
    completed.filter(
      (item) =>
        item.result === "LOSS"
    ).length;

  const offsets =
    completed
      .map(
        (item) =>
          item.executionOffsetMs
      )
      .filter(
        Number.isFinite
      );

  const averageOffsetMs =
    offsets.length
      ? offsets.reduce(
          (
            total,
            value
          ) =>
            total +
            value,
          0
        ) /
        offsets.length
      : null;

  return {

    total:
      records.length,

    completed:
      completed.length,

    wins,

    losses,

    accuracy:
      completed.length
        ? (
            wins /
            completed.length
          ) *
          100
        : null,

    averageOffsetMs

  };
}


/* ==========================================
   EXPORTACIÓN
   ========================================== */

export const executionRecorder = {

  createRecord,

  updateRecord,

  findRecord,

  recordPrepare,

  recordTarget,

  recordProposalRequested,

  recordProposalReceived,

  scheduleObservedExecution,

  recordObservedExecution,

  recordResult,

  addNote,

  all,

  latest,

  summary,

  clear

};


/* ==========================================
   FIN
   EXECUTION-RECORDER.JS
   MODO OBSERVADOR
   ========================================== */
