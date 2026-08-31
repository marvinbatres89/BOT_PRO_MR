/* ==========================================
   BOT V1 MR
   BOT.JS
   FIX14.0 DIRECTION MEMORY + STRATEGY AUDIT

   BASE: FIX13.7

   AGREGA:
   - MEMORIA DE PATRONES EN PANTALLA
   - RESUMEN DE APRENDIZAJE
   - FAVORABLE / RIESGO / SIN EVIDENCIA
   - MUESTRAS / GANADAS / PERDIDAS / ACCURACY
   - PATRÓN ACTUAL
   - DECISIÓN AUTOMÁTICA
   - EVENTO PATTERN-EVALUATED
   - EVENTO PATTERN-UPDATED
   - EVENTO PATTERN-BLOCKED
   - RESET MEMORIA
   - TESTLOG JSON
   - PANEL AUTOMÁTICO SI INDEX NO LO TIENE

   CONSERVA:
   - AUTOMÁTICO
   - MANUAL DIAGNÓSTICO
   - DERIV DEMO
   - PREPARAR / TARGET
   - CALIBRACIÓN
   - 12 MERCADOS
   - COMPARADORES
   - TELEMETRÍA
   - GANADA / PERDIDA
   ========================================== */


import {
  signalBridge
} from "./signal-bridge.js?v=FIX14-0-DIRECTION-MEMORY";


import {
  botEngine
} from "./bot-engine.js?v=FIX14-1-DIRECTION-TIMING";


import {
  derivConnection
} from "./deriv-connection.js";


/* ==========================================
   VERSIONES
   ========================================== */

const BOT_VERSION =
  "FIX14.1-DIRECTION-TIMING";


const BOT_BUILD =
  "DIRECTION-TIMING-MEMORY-STRATEGY-AUDIT";


const MODO_AUTOMATICO =
  "AUTOMATICO";


const MODO_MANUAL =
  "MANUAL_DIAGNOSTICO";


/* ==========================================
   FIX14.0 · UNA SEÑAL = UNA EJECUCIÓN
   ========================================== */

let operacionManualConsumida =
  null;

let operacionManualHabilitada =
  null;


/* ==========================================
   UTILIDADES DOM
   ========================================== */

const $ =
  (id) =>
    document.getElementById(
      id
    );


function primerElemento(
  ...ids
) {

  for (
    const id
    of ids
  ) {

    const elemento =
      document.getElementById(
        id
      );


    if (
      elemento
    ) {

      return elemento;

    }

  }


  return null;

}


/* ==========================================
   FIX14.0
   CREAR PANEL MEMORIA SI NO EXISTE
   ========================================== */

function asegurarPanelMemoria() {

  if (
    document.getElementById(
      "panelMemoriaPatrones"
    )
  ) {

    return;

  }


  const registro =
    document.getElementById(
      "registroBot"
    );


  if (
    !registro
  ) {

    return;

  }


  const tarjetaRegistro =
    registro.closest(
      ".tarjeta"
    );


  if (
    !tarjetaRegistro
  ) {

    return;

  }


  const panel =
    document.createElement(
      "section"
    );


  panel.id =
    "panelMemoriaPatrones";


  panel.className =
    "tarjeta";


  panel.innerHTML = `

    <h2>
      🧠 Memoria de patrones
    </h2>

    <p class="descripcion">
      El BOT compara cada nueva predicción
      con resultados anteriores del mismo patrón.
      En modo AUTOMÁTICO puede evitar operaciones
      clasificadas como RIESGO.
    </p>


    <div
      id="patronEstadoVisual"
      class="ultima-senal"
    >
      SIN EVIDENCIA · ESPERANDO PREDICCIÓN
    </div>


    <div class="datos-grid separacion">

      <div class="dato">
        <small>Clasificación</small>
        <strong id="patronClasificacion">
          SIN EVIDENCIA
        </strong>
      </div>


      <div class="dato">
        <small>Decisión</small>
        <strong id="patronDecision">
          APRENDER
        </strong>
      </div>


      <div class="dato">
        <small>Fuerza</small>
        <strong id="patronFuerza">
          RECOPILANDO
        </strong>
      </div>


      <div class="dato">
        <small>Muestras</small>
        <strong id="patronMuestras">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Ganadas</small>
        <strong id="patronGanadas">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Perdidas</small>
        <strong id="patronPerdidas">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Accuracy</small>
        <strong id="patronAccuracy">
          --
        </strong>
      </div>


      <div class="dato">
        <small>Valor patrón</small>
        <strong id="patronValor">
          --
        </strong>
      </div>


      <div class="dato">
        <small>Score bruto</small>
        <strong id="patronScore">
          --
        </strong>
      </div>


      <div class="dato">
        <small>Timing promedio</small>
        <strong id="patronTiming">
          --
        </strong>
      </div>

    </div>


    <div
      id="patronClave"
      class="ultima-senal separacion"
    >
      Esperando firma de patrón...
    </div>


    <h2 class="separacion">
      📊 Resumen de aprendizaje
    </h2>


    <div class="datos-grid separacion">

      <div class="dato">
        <small>Patrones guardados</small>
        <strong id="memoriaPatronesTotal">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Operaciones aprendidas</small>
        <strong id="memoriaOperaciones">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Favorables</small>
        <strong id="memoriaFavorables">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Riesgo</small>
        <strong id="memoriaRiesgos">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Sin evidencia</small>
        <strong id="memoriaSinEvidencia">
          0
        </strong>
      </div>


      <div class="dato">
        <small>Modo aprendizaje</small>
        <strong id="memoriaAprendizaje">
          ACTIVO
        </strong>
      </div>


      <div class="dato">
        <small>Filtro automático</small>
        <strong id="memoriaFiltro">
          ACTIVO
        </strong>
      </div>


      <div class="dato">
        <small>Mínimo decisión</small>
        <strong id="memoriaMinimo">
          4 muestras
        </strong>
      </div>

    </div>


    <div
      id="memoriaEstado"
      class="ultima-senal separacion"
    >
      RECOPILANDO DATOS
    </div>


    <div class="botones separacion">

      <button
        id="botonDescargarTestLog"
        class="boton conectar"
      >
        DESCARGAR TESTLOG
      </button>


      <button
        id="botonResetMemoria"
        class="boton pausar"
      >
        BORRAR MEMORIA
      </button>

    </div>

  `;


  tarjetaRegistro.parentNode
    .insertBefore(
      panel,
      tarjetaRegistro
    );

}


asegurarPanelMemoria();


/* ==========================================
   ESTADO VISUAL LOCAL
   ========================================== */

let ultimoEstadoManualFinal =
  null;


let ultimoPatronVisual =
  null;


/* ==========================================
   ESTADO MOTOR
   ========================================== */

function obtenerEstadoRapido() {

  if (
    typeof botEngine
      .obtenerEstadoRapido ===
    "function"
  ) {

    return botEngine
      .obtenerEstadoRapido();

  }


  return botEngine
    .obtenerEstado();

}


function obtenerEstadoCompleto() {

  return botEngine
    .obtenerEstado();

}


/* ==========================================
   UI
   ========================================== */

const UI = {

  estadoBot:
    $("estadoBot"),

  mercado:
    $("mercado"),

  estrategia:
    $("estrategia"),

  direccion:
    $("direccion"),

  confianza:
    $("confianza"),

  entrada:
    $("entrada"),

  precio:
    $("precio"),

  botonConectar:
    $("botonConectar"),

  botonPausar:
    $("botonPausar"),

  botonProbar:
    $("botonProbar"),

  ultimaSenal:
    $("ultimaSenal"),

  ultimoContrato:
    $("ultimoContrato"),

  ultimaPropuesta:
    $("ultimaPropuesta"),

  operacionDemo:
    $("operacionDemo"),

  resultadoDemo:
    $("resultadoDemo"),

  registroBot:
    $("registroBot"),


  /* DERIV */

  estadoDeriv:
    $("estadoDeriv"),

  derivAppId:
    $("derivAppId"),

  derivAccountId:
    $("derivAccountId"),

  derivToken:
    $("derivToken"),

  botonConectarDeriv:
    $("botonConectarDeriv"),

  botonDesconectarDeriv:
    $("botonDesconectarDeriv"),

  derivCuenta:
    $("derivCuenta"),

  derivConexion:
    $("derivConexion"),

  cuentaDemoTab:
    $("cuentaDemoTab"),

  cuentaRealTab:
    $("cuentaRealTab"),

  cuentaModoActual:
    $("cuentaModoActual"),

  cuentaSaldo:
    $("cuentaSaldo"),

  cuentaResultadoSesion:
    $("cuentaResultadoSesion"),

  cuentaRealEstado:
    $("cuentaRealEstado"),

  estadoEjecucion:
    $("estadoEjecucion"),

  botonActivarDemo:
    $("botonActivarDemo"),

  botonDesactivarDemo:
    $("botonDesactivarDemo"),


  /* MODO */

  modoEjecucionSelect:
    $("modoEjecucionSelect"),

  modoEjecucionEstado:
    $("modoEjecucionEstado"),

  manualPanel:
    $("manualPanel"),

  manualEstado:
    $("manualEstado"),

  manualOperacion:
    $("manualOperacion"),

  manualMercado:
    $("manualMercado"),

  manualDireccion:
    $("manualDireccion"),

  manualTarget:
    $("manualTarget"),

  manualProgramado:
    $("manualProgramado"),

  manualClickOffset:
    $("manualClickOffset"),

  manualBuyOffset:
    $("manualBuyOffset"),

  botonEjecutarManual:
    $("botonEjecutarManual"),


  /* CALIBRADOR */

  calibradorFamilia:
    $("calibradorFamilia"),

  calibradorMercado:
    $("calibradorMercado"),

  calibradorPunto:
    $("calibradorPunto"),

  calibradorReferencia:
    $("calibradorReferencia"),

  calibradorAjuste:
    $("calibradorAjuste"),

  calibradorEspera:
    $("calibradorEspera"),

  calibradorSignalBuy:
    $("calibradorSignalBuy"),

  calibradorPropuesta:
    $("calibradorPropuesta"),

  calibradorBuy:
    $("calibradorBuy"),

  calibradorResultado:
    $("calibradorResultado"),

  calibracionMercadoSelect:
    $("calibracionMercadoSelect"),

  calibracionAjusteSelect:
    $("calibracionAjusteSelect"),

  botonGuardarCalibracion:
    $("botonGuardarCalibracion"),

  botonResetCalibracion:
    $("botonResetCalibracion"),

  calibracionMercadoActual:
    $("calibracionMercadoActual"),

  calibracionAjusteActual:
    $("calibracionAjusteActual"),

  calibracionTargetDisponible:
    $("calibracionTargetDisponible"),

  calibracionProgramacion:
    $("calibracionProgramacion"),


  /* ======================================
     FIX14.0 MEMORIA
     ====================================== */

  patronEstadoVisual:
    primerElemento(
      "patronEstadoVisual",
      "patronEstado"
    ),

  patronClasificacion:
    primerElemento(
      "patronClasificacion",
      "memoriaPatronClasificacion"
    ),

  patronDecision:
    primerElemento(
      "patronDecision",
      "memoriaPatronDecision"
    ),

  patronFuerza:
    primerElemento(
      "patronFuerza",
      "memoriaPatronFuerza"
    ),

  patronMuestras:
    primerElemento(
      "patronMuestras",
      "memoriaPatronMuestras"
    ),

  patronGanadas:
    primerElemento(
      "patronGanadas",
      "memoriaPatronGanadas"
    ),

  patronPerdidas:
    primerElemento(
      "patronPerdidas",
      "memoriaPatronPerdidas"
    ),

  patronAccuracy:
    primerElemento(
      "patronAccuracy",
      "memoriaPatronAccuracy"
    ),

  patronValor:
    primerElemento(
      "patronValor",
      "memoriaPatronValor"
    ),

  patronScore:
    primerElemento(
      "patronScore",
      "memoriaPatronScore"
    ),

  patronTiming:
    primerElemento(
      "patronTiming",
      "memoriaPatronTiming"
    ),

  patronClave:
    primerElemento(
      "patronClave",
      "memoriaPatronClave"
    ),

  memoriaPatronesTotal:
    primerElemento(
      "memoriaPatronesTotal",
      "memoriaTotalPatrones"
    ),

  memoriaOperaciones:
    primerElemento(
      "memoriaOperaciones",
      "memoriaOperacionesAprendidas"
    ),

  memoriaFavorables:
    primerElemento(
      "memoriaFavorables",
      "memoriaPatronesFavorables"
    ),

  memoriaRiesgos:
    primerElemento(
      "memoriaRiesgos",
      "memoriaPatronesRiesgo"
    ),

  memoriaSinEvidencia:
    primerElemento(
      "memoriaSinEvidencia",
      "memoriaPatronesSinEvidencia"
    ),

  memoriaAprendizaje:
    primerElemento(
      "memoriaAprendizaje",
      "modoAprendizaje"
    ),

  memoriaFiltro:
    primerElemento(
      "memoriaFiltro",
      "filtroPatrones"
    ),

  memoriaMinimo:
    primerElemento(
      "memoriaMinimo",
      "memoriaMinimoMuestras"
    ),

  memoriaEstado:
    primerElemento(
      "memoriaEstado",
      "resumenAprendizajeEstado"
    ),

  botonDescargarTestLog:
    primerElemento(
      "botonDescargarTestLog",
      "descargarTestLog"
    ),

  botonResetMemoria:
    primerElemento(
      "botonResetMemoria",
      "resetMemoriaPatrones"
    ),

  ajusteEvenSelect: $("ajusteEvenSelect"),
  ajusteOddSelect: $("ajusteOddSelect"),
  guardarAjusteDireccion: $("guardarAjusteDireccion"),
  timingEvenResumen: $("timingEvenResumen"),
  timingOddResumen: $("timingOddResumen"),
  timingDireccionEstado: $("timingDireccionEstado"),
  auditEvenOdd: $("auditEvenOdd"),
  auditOverUnder: $("auditOverUnder"),
  auditMatch: $("auditMatch"),
  auditRiseFall: $("auditRiseFall"),
  auditEstrategiasEstado: $("auditEstrategiasEstado")

};


/* ==========================================
   12 MERCADOS
   ========================================== */

const FILAS_MERCADO = {

  R_10: {
    pruebas: $("r10Pruebas"),
    ganadas: $("r10Ganadas"),
    perdidas: $("r10Perdidas"),
    accuracy: $("r10Accuracy"),
    latencia: $("r10Latencia")
  },

  R_25: {
    pruebas: $("r25Pruebas"),
    ganadas: $("r25Ganadas"),
    perdidas: $("r25Perdidas"),
    accuracy: $("r25Accuracy"),
    latencia: $("r25Latencia")
  },

  R_50: {
    pruebas: $("r50Pruebas"),
    ganadas: $("r50Ganadas"),
    perdidas: $("r50Perdidas"),
    accuracy: $("r50Accuracy"),
    latencia: $("r50Latencia")
  },

  R_75: {
    pruebas: $("r75Pruebas"),
    ganadas: $("r75Ganadas"),
    perdidas: $("r75Perdidas"),
    accuracy: $("r75Accuracy"),
    latencia: $("r75Latencia")
  },

  R_100: {
    pruebas: $("r100Pruebas"),
    ganadas: $("r100Ganadas"),
    perdidas: $("r100Perdidas"),
    accuracy: $("r100Accuracy"),
    latencia: $("r100Latencia")
  },

  "1HZ10V": {
    pruebas: $("hz10Pruebas"),
    ganadas: $("hz10Ganadas"),
    perdidas: $("hz10Perdidas"),
    accuracy: $("hz10Accuracy"),
    latencia: $("hz10Latencia")
  },

  "1HZ15V": {
    pruebas: $("hz15Pruebas"),
    ganadas: $("hz15Ganadas"),
    perdidas: $("hz15Perdidas"),
    accuracy: $("hz15Accuracy"),
    latencia: $("hz15Latencia")
  },

  "1HZ25V": {
    pruebas: $("hz25Pruebas"),
    ganadas: $("hz25Ganadas"),
    perdidas: $("hz25Perdidas"),
    accuracy: $("hz25Accuracy"),
    latencia: $("hz25Latencia")
  },

  "1HZ30V": {
    pruebas: $("hz30Pruebas"),
    ganadas: $("hz30Ganadas"),
    perdidas: $("hz30Perdidas"),
    accuracy: $("hz30Accuracy"),
    latencia: $("hz30Latencia")
  },

  "1HZ50V": {
    pruebas: $("hz50Pruebas"),
    ganadas: $("hz50Ganadas"),
    perdidas: $("hz50Perdidas"),
    accuracy: $("hz50Accuracy"),
    latencia: $("hz50Latencia")
  },

  "1HZ75V": {
    pruebas: $("hz75Pruebas"),
    ganadas: $("hz75Ganadas"),
    perdidas: $("hz75Perdidas"),
    accuracy: $("hz75Accuracy"),
    latencia: $("hz75Latencia")
  },

  "1HZ100V": {
    pruebas: $("hz100Pruebas"),
    ganadas: $("hz100Ganadas"),
    perdidas: $("hz100Perdidas"),
    accuracy: $("hz100Accuracy"),
    latencia: $("hz100Latencia")
  }

};


/* ==========================================
   COMPARADORES
   ========================================== */

const COMPARADORES = {

  R_50: {

    ganadasCantidad:
      $("r50TimingGanadasCantidad"),

    ganadasSignalBuy:
      $("r50TimingGanadasSignalBuy"),

    ganadasMin:
      $("r50TimingGanadasMin"),

    ganadasMax:
      $("r50TimingGanadasMax"),

    ganadasProposal:
      $("r50TimingGanadasProposal"),

    ganadasBuy:
      $("r50TimingGanadasBuy"),

    perdidasCantidad:
      $("r50TimingPerdidasCantidad"),

    perdidasSignalBuy:
      $("r50TimingPerdidasSignalBuy"),

    perdidasMin:
      $("r50TimingPerdidasMin"),

    perdidasMax:
      $("r50TimingPerdidasMax"),

    perdidasProposal:
      $("r50TimingPerdidasProposal"),

    perdidasBuy:
      $("r50TimingPerdidasBuy"),

    diferencia:
      $("r50TimingDiferencia"),

    lectura:
      $("r50TimingLectura")

  },


  "1HZ75V": {

    ganadasCantidad:
      $("hz75TimingGanadasCantidad"),

    ganadasSignalBuy:
      $("hz75TimingGanadasSignalBuy"),

    ganadasMin:
      $("hz75TimingGanadasMin"),

    ganadasMax:
      $("hz75TimingGanadasMax"),

    ganadasProposal:
      $("hz75TimingGanadasProposal"),

    ganadasBuy:
      $("hz75TimingGanadasBuy"),

    perdidasCantidad:
      $("hz75TimingPerdidasCantidad"),

    perdidasSignalBuy:
      $("hz75TimingPerdidasSignalBuy"),

    perdidasMin:
      $("hz75TimingPerdidasMin"),

    perdidasMax:
      $("hz75TimingPerdidasMax"),

    perdidasProposal:
      $("hz75TimingPerdidasProposal"),

    perdidasBuy:
      $("hz75TimingPerdidasBuy"),

    diferencia:
      $("hz75TimingDiferencia"),

    lectura:
      $("hz75TimingLectura")

  }

};


/* ==========================================
   RELOJ
   ========================================== */

function ahoraPreciso() {

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


function obtenerHora() {

  return new Date()
    .toLocaleTimeString(
      "es-SV",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit"
      }
    );

}


/* ==========================================
   FORMATOS
   ========================================== */

function formatoMs(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "--";

  }


  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return `${numero.toFixed(2)} ms`;

}


function formatoOffsetMs(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "--";

  }


  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return `${
    numero >
      0
      ? "+"
      : ""
  }${numero.toFixed(2)} ms`;

}


function formatoSegundosDesdeMs(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "--";

  }


  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  const segundos =
    numero /
    1000;


  return `${
    segundos >
      0
      ? "+"
      : ""
  }${segundos.toFixed(1)} s`;

}


function formatoPorcentaje(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "--";

  }


  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    )
  ) {

    return "--";

  }


  return `${numero.toFixed(1)}%`;

}


/* ==========================================
   REGISTRO
   ========================================== */

function registrarActividad(
  mensaje,
  tipo = "normal"
) {

  if (
    !UI.registroBot
  ) {

    return;

  }


  const linea =
    document.createElement(
      "p"
    );


  linea.textContent =
    `[${obtenerHora()}] ${mensaje}`;


  if (
    tipo ===
    "correcto"
  ) {

    linea.style.color =
      "#79f3c2";

  }


  if (
    tipo ===
    "aviso"
  ) {

    linea.style.color =
      "#ffd37a";

  }


  if (
    tipo ===
    "error"
  ) {

    linea.style.color =
      "#ff9fb4";

  }


  UI.registroBot.prepend(
    linea
  );


  while (
    UI.registroBot
      .children
      .length >
    150
  ) {

    UI.registroBot
      .removeChild(
        UI.registroBot
          .lastElementChild
      );

  }

}


/* ==========================================
   FIX14.0
   RENDER PATRÓN
   ========================================== */

function renderAnalisisPatron(
  analisis
) {

  if (
    !analisis
  ) {

    return;

  }


  ultimoPatronVisual =
    {
      ...analisis
    };


  const clasificacion =
    String(
      analisis.clasificacion ||
      "SIN_EVIDENCIA"
    )
      .toUpperCase();


  const decision =
    String(
      analisis.decision ||
      "APRENDER"
    )
      .toUpperCase();


  const fuerza =
    String(
      analisis.fuerza ||
      "RECOPILANDO"
    )
      .toUpperCase();


  if (
    UI.patronClasificacion
  ) {

    UI.patronClasificacion.textContent =
      clasificacion;

  }


  if (
    UI.patronDecision
  ) {

    UI.patronDecision.textContent =
      decision;

  }


  if (
    UI.patronFuerza
  ) {

    UI.patronFuerza.textContent =
      fuerza;

  }


  if (
    UI.patronMuestras
  ) {

    UI.patronMuestras.textContent =
      String(
        analisis.muestras ??
        analisis.total ??
        0
      );

  }


  if (
    UI.patronGanadas
  ) {

    UI.patronGanadas.textContent =
      String(
        analisis.ganadas ??
        0
      );

  }


  if (
    UI.patronPerdidas
  ) {

    UI.patronPerdidas.textContent =
      String(
        analisis.perdidas ??
        0
      );

  }


  if (
    UI.patronAccuracy
  ) {

    UI.patronAccuracy.textContent =
      formatoPorcentaje(
        analisis.accuracy
      );

  }


  if (
    UI.patronValor
  ) {

    UI.patronValor.textContent =
      analisis.valorPatron ??
      analisis.valorBucket ??
      "--";

  }


  if (
    UI.patronScore
  ) {

    UI.patronScore.textContent =
      analisis.scoreBruto ??
      analisis.scoreBucket ??
      "--";

  }


  if (
    UI.patronTiming
  ) {

    UI.patronTiming.textContent =
      formatoOffsetMs(
        analisis
          .promedioTimingMs
      );

  }


  if (
    UI.patronClave
  ) {

    UI.patronClave.innerHTML = `

      <strong>Firma:</strong>
      ${analisis.key ?? "--"}

      <br><br>

      <strong>Mercado:</strong>
      ${analisis.mercado ?? "--"}

      <br>

      <strong>Estrategia:</strong>
      ${analisis.estrategia ?? "--"}

      <br>

      <strong>Dirección:</strong>
      ${analisis.direccion ?? "--"}

      <br>

      <strong>Confianza agrupada:</strong>
      ${analisis.confianzaBucket ?? "--"}

      <br>

      <strong>Score agrupado:</strong>
      ${analisis.scoreBucket ?? "--"}

      <br>

      <strong>Valor agrupado:</strong>
      ${analisis.valorBucket ?? "--"}

    `;

  }


  if (
    UI.patronEstadoVisual
  ) {

    let texto =
      `${clasificacion} · ${decision}`;


    if (
      clasificacion ===
      "FAVORABLE"
    ) {

      texto =
        `🟢 FAVORABLE · ${decision}`;

    }


    if (
      clasificacion ===
      "RIESGO"
    ) {

      texto =
        `🔴 RIESGO · ${
          analisis.bloquear
            ? "NO OPERAR AUTOMÁTICO"
            : decision
        }`;

    }


    if (
      clasificacion ===
      "SIN_EVIDENCIA"
    ) {

      texto =
        "🟡 SIN EVIDENCIA · APRENDIENDO";

    }


    if (
      clasificacion ===
      "NEUTRO"
    ) {

      texto =
        "🟠 NEUTRO · CONTINUAR APRENDIZAJE";

    }


    UI.patronEstadoVisual
      .textContent =
      texto;

  }

}


/* ==========================================
   FIX14.0
   RENDER RESUMEN MEMORIA
   ========================================== */

function renderResumenMemoria(
  resumen
) {

  if (
    !resumen
  ) {

    return;

  }


  if (
    UI.memoriaPatronesTotal
  ) {

    UI.memoriaPatronesTotal.textContent =
      String(
        resumen.patrones ??
        0
      );

  }


  if (
    UI.memoriaOperaciones
  ) {

    UI.memoriaOperaciones.textContent =
      String(
        resumen.operaciones ??
        0
      );

  }


  if (
    UI.memoriaFavorables
  ) {

    UI.memoriaFavorables.textContent =
      String(
        resumen.favorables ??
        0
      );

  }


  if (
    UI.memoriaRiesgos
  ) {

    UI.memoriaRiesgos.textContent =
      String(
        resumen.riesgos ??
        0
      );

  }


  if (
    UI.memoriaSinEvidencia
  ) {

    UI.memoriaSinEvidencia.textContent =
      String(
        resumen.sinEvidencia ??
        0
      );

  }


  if (
    UI.memoriaAprendizaje
  ) {

    UI.memoriaAprendizaje.textContent =
      resumen.learningMode
        ? "ACTIVO"
        : "OFF";

  }


  if (
    UI.memoriaFiltro
  ) {

    UI.memoriaFiltro.textContent =
      resumen.filtroAutomatico
        ? "ACTIVO"
        : "OFF";

  }


  if (
    UI.memoriaMinimo
  ) {

    UI.memoriaMinimo.textContent =
      `${
        resumen.minimumDecisionSamples ??
        4
      } muestras`;

  }


  if (
    UI.memoriaEstado
  ) {

    const operaciones =
      Number(
        resumen.operaciones ??
        0
      );


    const patrones =
      Number(
        resumen.patrones ??
        0
      );


    if (
      operaciones ===
      0
    ) {

      UI.memoriaEstado.textContent =
        "RECOPILANDO · TODAVÍA NO HAY OPERACIONES APRENDIDAS";

    }

    else {

      UI.memoriaEstado.textContent =
        `MEMORIA ACTIVA · ${operaciones} operaciones · ${patrones} patrones`;

    }

  }

}


function renderTimingDireccion(
  resumen
) {

  if (
    !resumen
  ) {

    return;

  }


  const pintar = (
    elemento,
    datos
  ) => {

    if (
      !elemento
    ) {

      return;

    }


    if (
      !datos ||
      Number(
        datos.total ||
        0
      ) ===
      0
    ) {

      elemento.textContent =
        "SIN EVIDENCIA";


      return;

    }


    const mejorTimingMs =
      Number.isFinite(
        Number(
          datos.mejorTimingMs
        )
      )
        ? Number(
            datos.mejorTimingMs
          )
        : null;


    const mejorAccuracy =
      Number.isFinite(
        Number(
          datos.mejorAccuracy
        )
      )
        ? Number(
            datos.mejorAccuracy
          )
        : null;


    const mejorMuestras =
      Number(
        datos.mejorMuestras ||
        0
      );


    const evidencia =
      datos.suficienteEvidencia ===
      true;


    let mejorTexto =
      "";


    if (
      mejorTimingMs !==
      null
    ) {

      mejorTexto =
        ` · mejor ${
          mejorTimingMs >
            0
            ? "+"
            : ""
        }${mejorTimingMs} ms`;


      if (
        mejorAccuracy !==
        null
      ) {

        mejorTexto +=
          ` (${mejorAccuracy}% / ${mejorMuestras})`;

      }

    }


    const estadoEvidencia =
      evidencia
        ? "EVIDENCIA"
        : "APRENDIENDO";


    elemento.textContent =
      `${
        datos.ganadas ??
        0
      }G/${
        datos.perdidas ??
        0
      }P · ${
        datos.accuracy ??
        "--"
      }% · ${estadoEvidencia}${mejorTexto}`;

  };


  pintar(
    UI.timingEvenResumen,
    resumen.EVEN
  );


  pintar(
    UI.timingOddResumen,
    resumen.ODD
  );


  if (
    UI.ajusteEvenSelect &&
    resumen.configuracion?.EVEN !==
      undefined
  ) {

    UI.ajusteEvenSelect.value =
      String(
        resumen.configuracion.EVEN
      );

  }


  if (
    UI.ajusteOddSelect &&
    resumen.configuracion?.ODD !==
      undefined
  ) {

    UI.ajusteOddSelect.value =
      String(
        resumen.configuracion.ODD
      );

  }


  if (
    UI.timingDireccionEstado
  ) {

    const even =
      Number(
        resumen.configuracion?.EVEN ??
        0
      );


    const odd =
      Number(
        resumen.configuracion?.ODD ??
        0
      );


    UI.timingDireccionEstado.textContent =
      `AUTOMÁTICO DEMO · EVEN ${
        even >
          0
          ? "+"
          : ""
      }${even} ms · ODD ${
        odd >
          0
          ? "+"
          : ""
      }${odd} ms · TIMING VS TARGET ORIGINAL`;

  }

}

function renderAuditoriaEstrategias(auditoria) {
  if (!auditoria) return;
  const txt = (d) => `${d?.recibidas ?? 0} señales · ${d?.finalizadas ?? 0} fin · ${d?.accuracy ?? "--"}%`;
  if (UI.auditEvenOdd) UI.auditEvenOdd.textContent = txt(auditoria.even_odd);
  if (UI.auditOverUnder) UI.auditOverUnder.textContent = txt(auditoria.over_under);
  if (UI.auditMatch) UI.auditMatch.textContent = txt(auditoria.match);
  if (UI.auditRiseFall) UI.auditRiseFall.textContent = txt(auditoria.rise_fall);
  if (UI.auditEstrategiasEstado) {
    const sin = Object.entries(auditoria).filter(([,d]) => Number(d?.recibidas||0) === 0).map(([k])=>k.toUpperCase());
    UI.auditEstrategiasEstado.textContent = sin.length ? `⚠️ Sin señales registradas: ${sin.join(", ")}` : "✅ Todas las estrategias tienen actividad registrada.";
  }
}

/* ==========================================
   REFRESCAR MEMORIA DESDE ENGINE
   ========================================== */

function actualizarMemoriaDesdeEngine() {

  const estado =
    obtenerEstadoRapido();


  renderTimingDireccion(estado?.resumenTimingDireccion);
  renderAuditoriaEstrategias(estado?.auditoriaEstrategias);


  if (
    estado
      ?.resumenMemoriaPatrones
  ) {

    renderResumenMemoria(
      estado
        .resumenMemoriaPatrones
    );

  }


  if (
    estado
      ?.ultimoAnalisisPatron
  ) {

    renderAnalisisPatron(
      estado
        .ultimoAnalisisPatron
    );

  }

}


/* ==========================================
   EVENTO PATRÓN EVALUADO
   ========================================== */

window.addEventListener(
  "bot:pattern-evaluated",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    renderAnalisisPatron(
      datos
    );


    registrarActividad(
      `🧠 PATRÓN · ${
        datos.clasificacion ||
        "SIN_EVIDENCIA"
      } · ${
        datos.muestras ??
        0
      } muestras · ${
        datos.ganadas ??
        0
      }G/${
        datos.perdidas ??
        0
      }P · ${
        formatoPorcentaje(
          datos.accuracy
        )
      }.`,
      datos.clasificacion ===
        "FAVORABLE"
        ? "correcto"
        : datos.clasificacion ===
            "RIESGO"
          ? "error"
          : "aviso"
    );

  }
);


/* ==========================================
   EVENTO PATRÓN ACTUALIZADO
   ========================================== */

window.addEventListener(
  "bot:pattern-updated",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    /*
      El evento actualizado no siempre trae
      toda la firma. Combinamos con el último.
    */

    renderAnalisisPatron({

      ...(
        ultimoPatronVisual ||
        {}
      ),

      ...datos,

      muestras:
        datos.total ??
        datos.muestras ??
        ultimoPatronVisual
          ?.muestras ??
        0

    });


    actualizarMemoriaDesdeEngine();


    registrarActividad(
      `🧠 MEMORIA ACTUALIZADA · ${
        datos.mercado ||
        "--"
      } · ${
        datos.clasificacion ||
        "--"
      } · ${
        datos.total ??
        0
      } muestras · ${
        datos.ganadas ??
        0
      }G/${
        datos.perdidas ??
        0
      }P · ${
        formatoPorcentaje(
          datos.accuracy
        )
      }.`,
      datos.clasificacion ===
        "FAVORABLE"
        ? "correcto"
        : datos.clasificacion ===
            "RIESGO"
          ? "error"
          : "aviso"
    );

  }
);


/* ==========================================
   EVENTO OPERACIÓN BLOQUEADA
   ========================================== */

window.addEventListener(
  "bot:pattern-blocked",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.analisisPatron
    ) {

      renderAnalisisPatron(
        datos.analisisPatron
      );

    }


    if (
      UI.operacionDemo
    ) {

      UI.operacionDemo.innerHTML = `

        <strong>
          🛑 NO OPERAR
        </strong>

        <br><br>

        <strong>Motivo:</strong>
        Patrón histórico de riesgo.
        <br><br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Estrategia:</strong>
        ${datos.estrategia ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>Confianza:</strong>
        ${datos.confianza ?? "--"}%
        <br>

        <strong>Score bruto:</strong>
        ${datos.scoreBruto ?? "--"}
        <br>

        <strong>Valor patrón:</strong>
        ${datos.valorPatron ?? "--"}
        <br><br>

        ✅ El BOT protegió la operación.
        No se envió BUY.

      `;

    }


    registrarActividad(
      `🛑 NO OPERAR · PATRÓN RIESGO · ${
        datos.mercado ||
        "--"
      } · BUY bloqueado.`,
      "error"
    );


    actualizarMemoriaDesdeEngine();

  }
);


window.addEventListener("bot:direction-timing-updated", () => {
  actualizarMemoriaDesdeEngine();
});

if (UI.guardarAjusteDireccion) {
  UI.guardarAjusteDireccion.addEventListener("click", () => {
    const even = Number(UI.ajusteEvenSelect?.value ?? -300);
    const odd = Number(UI.ajusteOddSelect?.value ?? 300);
    const r1 = botEngine.establecerAjusteDireccion("EVEN", even);
    const r2 = botEngine.establecerAjusteDireccion("ODD", odd);
    if (r1?.ok && r2?.ok) {
      registrarActividad(`🎯 CALIBRACIÓN DIRECCIÓN · EVEN ${even} ms · ODD ${odd} ms · SOLO AUTOMÁTICO DEMO.`, "correcto");
      actualizarMemoriaDesdeEngine();
    } else {
      registrarActividad("No se pudo guardar calibración EVEN/ODD.", "error");
    }
  });
}

/* ==========================================
   RESET MEMORIA
   ========================================== */

window.addEventListener(
  "bot:pattern-memory-reset",
  () => {

    ultimoPatronVisual =
      null;


    renderResumenMemoria({

      patrones:
        0,

      operaciones:
        0,

      favorables:
        0,

      riesgos:
        0,

      sinEvidencia:
        0,

      minimumDecisionSamples:
        4,

      learningMode:
        true,

      filtroAutomatico:
        true

    });


    if (
      UI.patronClasificacion
    ) {

      UI.patronClasificacion.textContent =
        "SIN EVIDENCIA";

    }


    if (
      UI.patronDecision
    ) {

      UI.patronDecision.textContent =
        "APRENDER";

    }


    if (
      UI.patronFuerza
    ) {

      UI.patronFuerza.textContent =
        "RECOPILANDO";

    }


    if (
      UI.patronMuestras
    ) {

      UI.patronMuestras.textContent =
        "0";

    }


    if (
      UI.patronGanadas
    ) {

      UI.patronGanadas.textContent =
        "0";

    }


    if (
      UI.patronPerdidas
    ) {

      UI.patronPerdidas.textContent =
        "0";

    }


    if (
      UI.patronAccuracy
    ) {

      UI.patronAccuracy.textContent =
        "--";

    }


    if (
      UI.patronEstadoVisual
    ) {

      UI.patronEstadoVisual.textContent =
        "SIN EVIDENCIA · ESPERANDO PREDICCIÓN";

    }


    registrarActividad(
      "Memoria de patrones restablecida.",
      "aviso"
    );

  }
);


/* ==========================================
   BOTÓN BORRAR MEMORIA
   ========================================== */

UI.botonResetMemoria
  ?.addEventListener(
    "click",
    () => {

      const confirmar =
        window.confirm(
          "¿Desea borrar completamente la memoria de patrones aprendida?"
        );


      if (
        !confirmar
      ) {

        return;

      }


      if (
        typeof botEngine
          .restablecerMemoriaPatrones !==
        "function"
      ) {

        registrarActividad(
          "El motor no tiene disponible restablecerMemoriaPatrones().",
          "error"
        );


        return;

      }


      const resultado =
        botEngine
          .restablecerMemoriaPatrones();


      registrarActividad(
        resultado?.mensaje ||
        "Memoria restablecida.",
        resultado?.ok
          ? "aviso"
          : "error"
      );


      actualizarMemoriaDesdeEngine();

    }
  );


/* ==========================================
   DESCARGAR TESTLOG
   ========================================== */

UI.botonDescargarTestLog
  ?.addEventListener(
    "click",
    () => {

      try {

        if (
          typeof botEngine
            .obtenerTestLog !==
          "function"
        ) {

          registrarActividad(
            "El motor no tiene obtenerTestLog().",
            "error"
          );


          return;

        }


        const datos =
          botEngine
            .obtenerTestLog();


        const contenido =
          JSON.stringify(
            datos,
            null,
            2
          );


        const blob =
          new Blob(
            [
              contenido
            ],
            {
              type:
                "application/json;charset=utf-8"
            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const enlace =
          document.createElement(
            "a"
          );


        const fecha =
          new Date()
            .toISOString()
            .replace(
              /[:.]/g,
              "-"
            );


        enlace.href =
          url;


        enlace.download =
          `V14_0_TESTLOG_${fecha}.json`;


        document.body
          .appendChild(
            enlace
          );


        enlace.click();


        enlace.remove();


        setTimeout(
          () => {

            URL.revokeObjectURL(
              url
            );

          },
          1000
        );


        registrarActividad(
          "TESTLOG FIX14.0 generado correctamente.",
          "correcto"
        );

      }

      catch (
        error
      ) {

        registrarActividad(
          `Error TESTLOG · ${
            error?.message ||
            String(
              error
            )
          }`,
          "error"
        );

      }

    }
  );


/* ==========================================
   MODO EJECUCIÓN
   ========================================== */

function obtenerModoActual() {

  return (
    obtenerEstadoRapido()
      ?.modoEjecucion ||
    MODO_AUTOMATICO
  );

}


function renderModoEjecucion() {

  const estado =
    obtenerEstadoRapido();


  const modo =
    estado?.modoEjecucion ||
    MODO_AUTOMATICO;


  if (
    UI.modoEjecucionSelect
  ) {

    UI.modoEjecucionSelect.value =
      modo;

  }


  if (
    UI.modoEjecucionEstado
  ) {

    UI.modoEjecucionEstado.textContent =
      modo ===
        MODO_MANUAL
        ? "MANUAL DIAGNÓSTICO"
        : "AUTOMÁTICO";

  }


  if (
    UI.manualPanel
  ) {

    UI.manualPanel.hidden =
      modo !==
      MODO_MANUAL;

  }


  const pendiente =
    estado?.manualPendiente ||
    null;


  if (
    UI.botonEjecutarManual
  ) {

    const operacionId =
      pendiente?.operacionId ||
      null;

    const nuevaSenalValida =
      Boolean(
        modo ===
          MODO_MANUAL &&
        pendiente &&
        operacionId &&
        operacionId !==
          operacionManualConsumida
      );

    UI.botonEjecutarManual.disabled =
      !nuevaSenalValida;

    if (
      nuevaSenalValida
    ) {

      operacionManualHabilitada =
        operacionId;

      UI.botonEjecutarManual.textContent =
        "⚡ EJECUTAR AHORA";

    }

    else if (
      operacionId &&
      operacionId ===
        operacionManualConsumida
    ) {

      UI.botonEjecutarManual.textContent =
        "SEÑAL YA EJECUTADA";

    }

    else {

      operacionManualHabilitada =
        null;

      UI.botonEjecutarManual.textContent =
        "ESPERANDO SEÑAL VÁLIDA";

    }

  }


  if (
    !pendiente
  ) {

    if (
      UI.manualOperacion
    ) {

      UI.manualOperacion.textContent =
        "--";

    }


    if (
      UI.manualMercado
    ) {

      UI.manualMercado.textContent =
        "--";

    }


    if (
      UI.manualDireccion
    ) {

      UI.manualDireccion.textContent =
        "--";

    }


    if (
      UI.manualTarget
    ) {

      UI.manualTarget.textContent =
        "--";

    }


    if (
      UI.manualProgramado
    ) {

      UI.manualProgramado.textContent =
        "--";

    }


    if (
      UI.manualEstado
    ) {

      if (
        ultimoEstadoManualFinal
      ) {

        UI.manualEstado.textContent =
          ultimoEstadoManualFinal;

      }

      else {

        UI.manualEstado.textContent =
          modo ===
            MODO_MANUAL
            ? "ESPERANDO PREDICCIÓN"
            : "MODO AUTOMÁTICO";

      }

    }


    return;

  }


  ultimoEstadoManualFinal =
    null;


  if (
    UI.manualEstado
  ) {

    UI.manualEstado.textContent =
      pendiente.targetDisponible
        ? "LISTO PARA EJECUTAR"
        : "LISTO · ESPERANDO TARGET";

  }


  if (
    UI.manualOperacion
  ) {

    UI.manualOperacion.textContent =
      pendiente.operacionId ||
      "--";

  }


  if (
    UI.manualMercado
  ) {

    UI.manualMercado.textContent =
      pendiente.mercado ||
      "--";

  }


  if (
    UI.manualDireccion
  ) {

    UI.manualDireccion.textContent =
      pendiente.direccion ||
      "--";

  }


  if (
    UI.manualTarget
  ) {

    UI.manualTarget.textContent =
      pendiente.targetExecutionAt ??
      "ESPERANDO";

  }


  if (
    UI.manualProgramado
  ) {

    UI.manualProgramado.textContent =
      pendiente.programmedExecutionAt ??
      "ESPERANDO";

  }


  if (
    pendiente.patron
  ) {

    renderAnalisisPatron(
      pendiente.patron
    );

  }

}


/* ==========================================
   CAMBIAR MODO
   ========================================== */

UI.modoEjecucionSelect
  ?.addEventListener(
    "change",
    () => {

      const modo =
        UI.modoEjecucionSelect
          ?.value ||
        MODO_AUTOMATICO;


      ultimoEstadoManualFinal =
        null;


      const resultado =
        botEngine
          .establecerModoEjecucion(
            modo
          );


      registrarActividad(
        resultado?.mensaje ||
        "No se pudo cambiar el modo.",
        resultado?.ok
          ? "correcto"
          : "error"
      );


      renderModoEjecucion();

    }
  );


window.addEventListener(
  "bot:execution-mode",
  (
    evento
  ) => {

    const modo =
      evento.detail?.modo ||
      MODO_AUTOMATICO;


    ultimoEstadoManualFinal =
      null;


    registrarActividad(
      modo ===
        MODO_MANUAL
        ? "MODO → MANUAL DIAGNÓSTICO."
        : "MODO → AUTOMÁTICO.",
      "correcto"
    );


    renderModoEjecucion();

  }
);


/* ==========================================
   MANUAL REEMPLAZADO
   ========================================== */

window.addEventListener(
  "bot:manual-replaced",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `Manual anterior reemplazado · ${
        datos.operacionId ||
        "--"
      } → ${
        datos.nuevaOperacionId ||
        "--"
      }.`,
      "aviso"
    );

  }
);


/* ==========================================
   PREPARACIÓN
   ========================================== */

window.addEventListener(
  "bot:prepared",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.analisisPatron
    ) {

      renderAnalisisPatron(
        datos.analisisPatron
      );

    }


    if (
      UI.operacionDemo
    ) {

      UI.operacionDemo.innerHTML = `

        <strong>
          🟡 PROPUESTA PREPARADA
        </strong>

        <br><br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>Proposal ID:</strong>
        ${datos.proposalId ?? "--"}
        <br>

        <strong>Operación:</strong>
        ${datos.operacionId ?? "--"}
        <br>

        <strong>Modo:</strong>
        ${datos.modoEjecucion ?? "--"}

      `;


      if (
        datos.analisisPatron
      ) {

        UI.operacionDemo.innerHTML += `

          <br><br>

          <strong>Patrón:</strong>
          ${datos.analisisPatron.clasificacion ?? "SIN_EVIDENCIA"}
          <br>

          <strong>Muestras:</strong>
          ${datos.analisisPatron.muestras ?? 0}
          <br>

          <strong>Accuracy:</strong>
          ${formatoPorcentaje(
            datos.analisisPatron.accuracy
          )}

        `;

      }

    }


    registrarActividad(
      `🟡 PREPARADA · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   MANUAL LISTO
   ========================================== */

window.addEventListener(
  "bot:manual-ready",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    ultimoEstadoManualFinal =
      null;


    if (
      datos.analisisPatron
    ) {

      renderAnalisisPatron(
        datos.analisisPatron
      );

    }


    if (
      UI.manualEstado
    ) {

      UI.manualEstado.textContent =
        datos.targetDisponible
          ? "LISTO PARA EJECUTAR"
          : "LISTO · ESPERANDO TARGET";

    }


    if (
      UI.manualOperacion
    ) {

      UI.manualOperacion.textContent =
        datos.operacionId ||
        "--";

    }


    if (
      UI.manualMercado
    ) {

      UI.manualMercado.textContent =
        datos.mercado ||
        "--";

    }


    if (
      UI.manualDireccion
    ) {

      UI.manualDireccion.textContent =
        datos.direccion ||
        "--";

    }


    if (
      UI.manualTarget
    ) {

      UI.manualTarget.textContent =
        datos.targetExecutionAt ??
        "ESPERANDO";

    }


    if (
      UI.manualProgramado
    ) {

      UI.manualProgramado.textContent =
        datos.programmedExecutionAt ??
        "ESPERANDO";

    }


    if (
      UI.botonEjecutarManual
    ) {

      UI.botonEjecutarManual.disabled =
        false;

    }


    registrarActividad(
      `🟠 MANUAL LISTO · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      } · patrón ${
        datos.analisisPatron
          ?.clasificacion ||
        "SIN_EVIDENCIA"
      }.`,
      "aviso"
    );


    renderModoEjecucion();

  }
);


/* ==========================================
   CLIC MANUAL
   ========================================== */

window.addEventListener(
  "bot:manual-click",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.analisisPatron
    ) {

      renderAnalisisPatron(
        datos.analisisPatron
      );

    }


    if (
      UI.manualEstado
    ) {

      UI.manualEstado.textContent =
        "EJECUTANDO BUY";

    }


    if (
      UI.manualClickOffset
    ) {

      UI.manualClickOffset.textContent =
        datos.targetDisponible
          ? formatoOffsetMs(
              datos.clickToTargetMs
            )
          : "SIN TARGET";

    }


    if (
      UI.botonEjecutarManual
    ) {

      UI.botonEjecutarManual.disabled =
        true;

    }


    registrarActividad(
      `🖐️ CLIC MANUAL · ${
        datos.mercado ||
        "--"
      } · ${
        datos.targetDisponible
          ? formatoOffsetMs(
              datos.clickToTargetMs
            )
          : "SIN TARGET"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   BUY ENVIADO
   ========================================== */

window.addEventListener(
  "bot:buy-requested",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.analisisPatron
    ) {

      renderAnalisisPatron(
        datos.analisisPatron
      );

    }


    const desviacion =
      datos.buyTargetDeviationMs;


    if (
      UI.operacionDemo
    ) {

      UI.operacionDemo.innerHTML = `

        <strong>
          ⚡ BUY ENVIADO
        </strong>

        <br><br>

        <strong>Modo:</strong>
        ${datos.modoEjecucion ?? "--"}
        <br>

        <strong>Mercado:</strong>
        ${datos.mercado ?? "--"}
        <br>

        <strong>Dirección:</strong>
        ${datos.direccion ?? "--"}
        <br>

        <strong>TARGET:</strong>
        ${datos.targetExecutionAt ?? "SIN TARGET"}
        <br>

        <strong>Programado:</strong>
        ${datos.programmedExecutionAt ?? "--"}
        <br>

        <strong>Calibración:</strong>
        ${formatoMs(
          datos.calibracionMs
        )}
        <br>

        <strong>BUY enviado:</strong>
        ${datos.buyRequestedAt ?? "--"}
        <br>

        <strong>Desviación:</strong>
        ${formatoOffsetMs(
          desviacion
        )}
        <br>

        <strong>Clic → BUY:</strong>
        ${formatoMs(
          datos.manualClickToBuyMs
        )}

      `;

    }


    if (
      UI.manualBuyOffset
    ) {

      UI.manualBuyOffset.textContent =
        formatoOffsetMs(
          desviacion
        );

    }


    registrarActividad(
      `⚡ BUY ENVIADO · ${
        datos.mercado ||
        "--"
      } · ${
        datos.direccion ||
        "--"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   BUY CONFIRMADO
   ========================================== */

window.addEventListener(
  "bot:buy-confirmed",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const compra =
      datos.compra ||
      {};


    if (
      datos.ok
    ) {

      registrarActividad(
        `✅ BUY CONFIRMADO · ${
          datos.mercado ||
          "--"
        } · Contract ${
          compra.contractId ||
          "--"
        }.`,
        "correcto"
      );

    }

    else {

      registrarActividad(
        `❌ BUY RECHAZADO · ${
          datos.error ||
          "Sin detalle"
        }.`,
        "error"
      );

    }

  }
);


/* ==========================================
   RESULTADO
   ========================================== */

window.addEventListener(
  "bot:result",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    registrarActividad(
      `RESULTADO · ${
        datos.resultado ||
        "--"
      } · ${
        datos.mercado ||
        "--"
      } · PROFIT ${
        datos.profit ??
        "--"
      }.`,
      datos.resultado ===
        "GANADA"
        ? "correcto"
        : datos.resultado ===
            "PERDIDA"
          ? "error"
          : "aviso"
    );


    if (
      datos.resultadoDemo
    ) {

      pintarResultadoFinal(
        datos.resultadoDemo
      );

    }


    if (
      datos.modoEjecucion ===
      MODO_MANUAL
    ) {

      ultimoEstadoManualFinal =
        datos.resultado ||
        "--";


      if (
        UI.manualEstado
      ) {

        UI.manualEstado.textContent =
          ultimoEstadoManualFinal;

      }

    }


    /*
      pattern-updated puede llegar
      inmediatamente después.
      También hacemos una actualización
      diferida de seguridad.
    */

    setTimeout(
      actualizarMemoriaDesdeEngine,
      150
    );

  }
);


/* ==========================================
   FUENTE SEÑAL
   ========================================== */

window.addEventListener(
  "bot:signal-source",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    const fase =
      String(
        datos.fase ||
        datos.metadata?.fase ||
        "?"
      )
        .toUpperCase();


    registrarActividad(
      `PUENTE ${BOT_VERSION} · FASE ${fase} · ${
        datos.mercado ||
        "--"
      }.`,
      "correcto"
    );

  }
);


/* ==========================================
   CALIBRACIÓN
   ========================================== */

function obtenerMercadoSeleccionado() {

  return (
    UI.calibracionMercadoSelect
      ?.value ||
    "R_10"
  );

}


function actualizarPanelCalibracion() {

  const estado =
    obtenerEstadoRapido();


  const mercado =
    obtenerMercadoSeleccionado();


  const ajuste =
    Number(
      estado
        ?.calibracionActual
        ?.[mercado] ??
      0
    );


  if (
    UI.calibracionMercadoActual
  ) {

    UI.calibracionMercadoActual.textContent =
      mercado;

  }


  if (
    UI.calibracionAjusteActual
  ) {

    UI.calibracionAjusteActual.textContent =
      formatoSegundosDesdeMs(
        ajuste
      );

  }


  if (
    UI.calibracionAjusteSelect
  ) {

    UI.calibracionAjusteSelect.value =
      String(
        ajuste
      );

  }

}


UI.calibracionMercadoSelect
  ?.addEventListener(
    "change",
    actualizarPanelCalibracion
  );


UI.botonGuardarCalibracion
  ?.addEventListener(
    "click",
    () => {

      const mercado =
        obtenerMercadoSeleccionado();


      const ajuste =
        Number(
          UI.calibracionAjusteSelect
            ?.value ??
          0
        );


      const resultado =
        botEngine
          .establecerAjusteMercado(
            mercado,
            ajuste
          );


      registrarActividad(
        resultado?.mensaje ||
        "No se pudo guardar calibración.",
        resultado?.ok
          ? "correcto"
          : "error"
      );


      actualizarPanelCalibracion();

    }
  );


UI.botonResetCalibracion
  ?.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .restablecerCalibracion();


      registrarActividad(
        resultado?.mensaje ||
        "Calibración restablecida.",
        "aviso"
      );


      actualizarPanelCalibracion();

    }
  );


/* ==========================================
   MOSTRAR SEÑAL
   ========================================== */

function mostrarSenal(
  senal
) {

  if (
    UI.mercado
  ) {

    UI.mercado.textContent =
      senal.mercado ||
      "--";

  }


  if (
    UI.estrategia
  ) {

    UI.estrategia.textContent =
      senal.estrategia ||
      "--";

  }


  if (
    UI.direccion
  ) {

    UI.direccion.textContent =
      senal.direccion ||
      "--";

  }


  if (
    UI.confianza
  ) {

    UI.confianza.textContent =
      Number.isFinite(
        Number(
          senal.confianza
        )
      )
        ? `${Number(
            senal.confianza
          )}%`
        : "--";

  }


  if (
    UI.entrada
  ) {

    UI.entrada.textContent =
      senal.segundosEntrada !=
        null
        ? `${senal.segundosEntrada} s`
        : "--";

  }


  if (
    UI.precio
  ) {

    UI.precio.textContent =
      senal.precio !=
        null
        ? String(
            senal.precio
          )
        : "--";

  }


  const fase =
    String(
      senal.fase ||
      senal.metadata?.fase ||
      "--"
    )
      .toUpperCase();


  const target =
    senal.targetExecutionAt ??
    senal.targetVisualAt ??
    senal.metadata
      ?.targetExecutionAt ??
    null;


  const rawScore =
    senal.rawScore ??
    senal.scoreBruto ??
    senal.metadata
      ?.rawScore ??
    "--";


  if (
    UI.ultimaSenal
  ) {

    UI.ultimaSenal.innerHTML = `

      <strong>Fase:</strong>
      ${fase}
      <br><br>

      <strong>Mercado:</strong>
      ${senal.mercado ?? "--"}
      <br>

      <strong>Estrategia:</strong>
      ${senal.estrategia ?? "--"}
      <br>

      <strong>Dirección:</strong>
      ${senal.direccion ?? "--"}
      <br>

      <strong>Confianza:</strong>
      ${senal.confianza ?? "--"}%
      <br>

      <strong>Score bruto:</strong>
      ${rawScore}
      <br>

      <strong>Tendencia:</strong>
      ${senal.tendencia ?? "--"}
      <br>

      <strong>RSI:</strong>
      ${senal.rsi ?? "--"}
      <br>

      <strong>Momentum:</strong>
      ${senal.momentum ?? "--"}
      <br>

      <strong>Volatilidad:</strong>
      ${senal.volatilidad ?? "--"}
      <br>

      <strong>Último dígito:</strong>
      ${senal.ultimoDigito ?? "--"}
      <br>

      <strong>Punto:</strong>
      ${senal.segundosEntrada ?? "--"}
      <br>

      <strong>TARGET:</strong>
      ${target ?? "ESPERANDO"}

    `;

  }

}


/* ==========================================
   TARGET
   ========================================== */

function mostrarEstadoTarget(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  if (
    UI.calibracionTargetDisponible
  ) {

    UI.calibracionTargetDisponible.textContent =
      telemetria
        .programacionDisponible
        ? "SÍ"
        : "NO";

  }


  if (
    UI.calibracionProgramacion
  ) {

    if (
      telemetria
        .programacionDisponible
    ) {

      UI.calibracionProgramacion.textContent =
        telemetria.modoEjecucion ===
          MODO_MANUAL
          ? "REFERENCIA MANUAL"
          : telemetria.puedeAnticipar
            ? "PROGRAMADA"
            : "TARGET ALCANZADO";

    }

    else {

      UI.calibracionProgramacion.textContent =
        "ESPERANDO TARGET";

    }

  }

}


/* ==========================================
   CONTRATO
   ========================================== */

function mostrarContrato(
  contrato
) {

  if (
    !UI.ultimoContrato ||
    !contrato
  ) {

    return;

  }


  UI.ultimoContrato.innerHTML = `

    <strong>Mercado:</strong>
    ${contrato.symbol ?? "--"}
    <br><br>

    <strong>Contrato:</strong>
    ${contrato.contractType ?? "--"}
    <br>

    <strong>Dirección:</strong>
    ${contrato.direction ?? "--"}
    <br>

    <strong>Barrera:</strong>
    ${contrato.barrier ?? "--"}
    <br>

    <strong>Confianza:</strong>
    ${contrato.confidence ?? "--"}%
    <br>

    <strong>Punto:</strong>
    ${contrato.executionSecond ?? "--"}

  `;

}


/* ==========================================
   PROPUESTA
   ========================================== */

function mostrarPropuestaDeriv(
  propuesta,
  contrato
) {

  if (
    !UI.ultimaPropuesta
  ) {

    return;

  }


  if (
    !propuesta?.ok
  ) {

    UI.ultimaPropuesta.innerHTML = `

      <strong>Estado:</strong>
      SIN COTIZACIÓN
      <br><br>

      <strong>Motivo:</strong>
      ${
        propuesta?.error ||
        propuesta?.message ||
        "No se recibió cotización."
      }

    `;


    return;

  }


  UI.ultimaPropuesta.innerHTML = `

    <strong>Estado:</strong>
    PROPUESTA PREPARADA
    <br><br>

    <strong>Mercado:</strong>
    ${contrato?.symbol ?? "--"}
    <br>

    <strong>Contrato:</strong>
    ${contrato?.contractType ?? "--"}
    <br>

    <strong>ID propuesta:</strong>
    ${propuesta.id ?? "--"}
    <br>

    <strong>Precio:</strong>
    ${propuesta.askPrice ?? "--"}
    <br>

    <strong>Pago potencial:</strong>
    ${propuesta.payout ?? "--"}
    <br>

    <strong>Spot:</strong>
    ${propuesta.spot ?? "--"}

  `;

}


/* ==========================================
   COMPRA
   ========================================== */

function mostrarCompraDemo(
  compra
) {

  if (
    !UI.operacionDemo
  ) {

    return;

  }


  if (
    !compra?.ok
  ) {

    UI.operacionDemo.innerHTML = `

      <strong>
        Compra DEMO no ejecutada
      </strong>

      <br><br>

      ${
        compra?.error ||
        "Ejecución DEMO desactivada."
      }

    `;


    return;

  }


  const dato =
    compra.compra ||
    {};


  UI.operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO ABIERTA
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${dato.contractId ?? "--"}
    <br>

    <strong>Transaction ID:</strong>
    ${dato.transactionId ?? "--"}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice ?? "--"} USD
    <br>

    <strong>Pago máximo:</strong>
    ${dato.payout ?? "--"}

  `;

}


/* ==========================================
   SEGUIMIENTO
   ========================================== */

function mostrarActualizacionContrato(
  contrato
) {

  if (
    !UI.operacionDemo ||
    !contrato
  ) {

    return;

  }


  UI.operacionDemo.innerHTML = `

    <strong>
      OPERACIÓN DEMO EN SEGUIMIENTO
    </strong>

    <br><br>

    <strong>Contract ID:</strong>
    ${contrato.contract_id ?? "--"}
    <br>

    <strong>Estado:</strong>
    ${String(
      contrato.status ??
      "OPEN"
    ).toUpperCase()}
    <br>

    <strong>Compra:</strong>
    ${contrato.buy_price ?? "--"}
    <br>

    <strong>Profit actual:</strong>
    ${contrato.profit ?? "--"}

  `;

}


/* ==========================================
   RESULTADO FINAL
   ========================================== */

function pintarResultadoFinal(
  dato
) {

  if (
    !UI.resultadoDemo ||
    !dato
  ) {

    return;

  }


  const profit =
    Number(
      dato.profit ??
      0
    );


  const ganada =
    profit >
    0;


  UI.resultadoDemo
    .classList
    .remove(
      "ganada",
      "perdida"
    );


  UI.resultadoDemo
    .classList
    .add(
      ganada
        ? "ganada"
        : "perdida"
    );


  UI.resultadoDemo.innerHTML = `

    <div
      class="${
        ganada
          ? "resultado-ganado"
          : "resultado-perdido"
      }"
    >
      ${
        ganada
          ? "GANADA"
          : "PERDIDA"
      }
    </div>

    <br>

    <strong>Contract ID:</strong>
    ${dato.contractId ?? "--"}
    <br>

    <strong>Profit:</strong>
    ${profit}
    <br>

    <strong>Compra:</strong>
    ${dato.buyPrice ?? "--"}
    <br>

    <strong>Cierre:</strong>
    ${dato.sellPrice ?? "--"}
    <br>

    <strong>Estado:</strong>
    ${dato.status ?? "--"}
    <br>

    <strong>Fuente:</strong>
    ${dato.source ?? "--"}

  `;

}


function mostrarResultadoDemo(
  resultado
) {

  if (
    !resultado
  ) {

    return;

  }


  if (
    resultado.ok ===
      true &&
    resultado.resultado
  ) {

    pintarResultadoFinal(
      resultado.resultado
    );


    return;

  }


  if (
    resultado.contractId ||
    resultado.profit !==
      undefined
  ) {

    pintarResultadoFinal(
      resultado
    );

  }

}


function recuperarResultadoEngine() {

  const ultimo =
    obtenerEstadoRapido()
      ?.ultimoResultadoDemo;


  if (
    ultimo &&
    (
      ultimo.contractId ||
      ultimo.profit !==
        undefined
    )
  ) {

    pintarResultadoFinal(
      ultimo
    );

  }

}


/* ==========================================
   TELEMETRÍA
   ========================================== */

function mostrarTelemetria(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  if (
    UI.calibradorFamilia
  ) {

    UI.calibradorFamilia.textContent =
      telemetria.familiaMercado ??
      "--";

  }


  if (
    UI.calibradorMercado
  ) {

    UI.calibradorMercado.textContent =
      telemetria.mercado ??
      "--";

  }


  if (
    UI.calibradorPunto
  ) {

    UI.calibradorPunto.textContent =
      telemetria.puntoEntrada ??
      "--";

  }


  if (
    UI.calibradorReferencia
  ) {

    UI.calibradorReferencia.textContent =
      telemetria.retrasoReferenciaSeg !=
        null
        ? `${telemetria.retrasoReferenciaSeg} s`
        : "--";

  }


  if (
    UI.calibradorAjuste
  ) {

    UI.calibradorAjuste.textContent =
      formatoSegundosDesdeMs(
        telemetria.calibracionMs
      );

  }


  if (
    UI.calibradorEspera
  ) {

    UI.calibradorEspera.textContent =
      formatoMs(
        telemetria.esperaProgramadaMs
      );

  }


  if (
    UI.calibradorSignalBuy
  ) {

    UI.calibradorSignalBuy.textContent =
      telemetria.modoEjecucion ===
        MODO_MANUAL
        ? `CLIC ${
            formatoOffsetMs(
              telemetria
                .manualClickToTargetMs
            )
          }`
        : formatoMs(
            telemetria
              .signalToBuyMs
          );

  }


  if (
    UI.calibradorPropuesta
  ) {

    UI.calibradorPropuesta.textContent =
      `REQ ${
        formatoOffsetMs(
          telemetria
            .targetToPullRequestMs
        )
      } · RESP ${
        formatoOffsetMs(
          telemetria
            .targetToPullReceivedMs
        )
      } · LAT ${
        formatoMs(
          telemetria
            .proposalLatencyMs
        )
      }`;

  }


  if (
    UI.calibradorBuy
  ) {

    UI.calibradorBuy.textContent =
      formatoMs(
        telemetria.buyLatencyMs
      );

  }


  if (
    UI.calibradorResultado
  ) {

    UI.calibradorResultado.textContent =
      telemetria.resultado ??
      "--";

  }


  if (
    UI.manualClickOffset
  ) {

    UI.manualClickOffset.textContent =
      formatoOffsetMs(
        telemetria
          .manualClickToTargetMs
      );

  }


  if (
    UI.manualBuyOffset
  ) {

    UI.manualBuyOffset.textContent =
      formatoOffsetMs(
        telemetria
          .manualBuyToTargetMs
      );

  }


  mostrarEstadoTarget(
    telemetria
  );

}


/* ==========================================
   DIAGNÓSTICO
   ========================================== */

function registrarDiagnosticoTiming(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  registrarActividad(
    `TELEMETRÍA ${
      telemetria.version ||
      "?"
    } · ${
      telemetria.mercado ||
      "--"
    } · TIMING ${
      telemetria.timingClasificacion ||
      "PENDIENTE"
    }.`,
    telemetria.timingValido
      ? "correcto"
      : "aviso"
  );

}


/* ==========================================
   PERFIL
   ========================================== */

function registrarPerfilOperacion(
  telemetria
) {

  if (
    !telemetria
  ) {

    return;

  }


  registrarActividad(
    `PERFIL · Conf ${
      telemetria.confianza ??
      "--"
    } · Bruto ${
      telemetria.scoreBruto ??
      "--"
    } · Valor ${
      telemetria.valorPatron ??
      "--"
    } · RSI ${
      telemetria.rsi ??
      "--"
    }.`
  );

}


/* ==========================================
   TABLA MERCADOS
   ========================================== */

function renderFilaMercado(
  mercado,
  resumen
) {

  const fila =
    FILAS_MERCADO[
      mercado
    ];


  if (
    !fila ||
    !resumen
  ) {

    return;

  }


  fila.pruebas &&
    (
      fila.pruebas.textContent =
        resumen.pruebas ??
        0
    );


  fila.ganadas &&
    (
      fila.ganadas.textContent =
        resumen.ganadas ??
        0
    );


  fila.perdidas &&
    (
      fila.perdidas.textContent =
        resumen.perdidas ??
        0
    );


  fila.accuracy &&
    (
      fila.accuracy.textContent =
        formatoPorcentaje(
          resumen.accuracy
        )
    );


  fila.latencia &&
    (
      fila.latencia.textContent =
        formatoMs(
          resumen.promedioSignalToBuyMs
        )
    );

}


/* ==========================================
   COMPARADORES
   ========================================== */

function renderComparador(
  mercado,
  comparacion
) {

  const ui =
    COMPARADORES[
      mercado
    ];


  if (
    !ui ||
    !comparacion
  ) {

    return;

  }


  const ganadas =
    comparacion.ganadas ||
    {};


  const perdidas =
    comparacion.perdidas ||
    {};


  ui.ganadasCantidad &&
    (
      ui.ganadasCantidad.textContent =
        ganadas.cantidad ??
        0
    );


  ui.ganadasSignalBuy &&
    (
      ui.ganadasSignalBuy.textContent =
        formatoMs(
          ganadas.promedioSignalToBuyMs
        )
    );


  ui.ganadasMin &&
    (
      ui.ganadasMin.textContent =
        formatoMs(
          ganadas.minimoSignalToBuyMs
        )
    );


  ui.ganadasMax &&
    (
      ui.ganadasMax.textContent =
        formatoMs(
          ganadas.maximoSignalToBuyMs
        )
    );


  ui.ganadasProposal &&
    (
      ui.ganadasProposal.textContent =
        `PULL ${
          formatoOffsetMs(
            ganadas
              .promedioTargetToPullRequestMs
          )
        }`
    );


  ui.ganadasBuy &&
    (
      ui.ganadasBuy.textContent =
        formatoMs(
          ganadas.promedioBuyMs
        )
    );


  ui.perdidasCantidad &&
    (
      ui.perdidasCantidad.textContent =
        perdidas.cantidad ??
        0
    );


  ui.perdidasSignalBuy &&
    (
      ui.perdidasSignalBuy.textContent =
        formatoMs(
          perdidas.promedioSignalToBuyMs
        )
    );


  ui.perdidasMin &&
    (
      ui.perdidasMin.textContent =
        formatoMs(
          perdidas.minimoSignalToBuyMs
        )
    );


  ui.perdidasMax &&
    (
      ui.perdidasMax.textContent =
        formatoMs(
          perdidas.maximoSignalToBuyMs
        )
    );


  ui.perdidasProposal &&
    (
      ui.perdidasProposal.textContent =
        `PULL ${
          formatoOffsetMs(
            perdidas
              .promedioTargetToPullRequestMs
          )
        }`
    );


  ui.perdidasBuy &&
    (
      ui.perdidasBuy.textContent =
        formatoMs(
          perdidas.promedioBuyMs
        )
    );


  ui.diferencia &&
    (
      ui.diferencia.textContent =
        formatoMs(
          comparacion
            .diferenciaMedianaMs
        )
    );


  ui.lectura &&
    (
      ui.lectura.textContent =
        comparacion.lectura ||
        "ESPERANDO MUESTRAS"
    );

}


/* ==========================================
   ESTADÍSTICAS COMPLETAS
   ========================================== */

function actualizarEstadisticasCompletas() {

  const estado =
    obtenerEstadoCompleto();


  const resumenes =
    estado?.resumenMercados ||
    {};


  Object.keys(
    FILAS_MERCADO
  )
    .forEach(
      (
        mercado
      ) => {

        renderFilaMercado(
          mercado,
          resumenes[
            mercado
          ]
        );

      }
    );


  const comparaciones =
    estado?.comparaciones ||
    {};


  renderComparador(
    "R_50",
    comparaciones[
      "R_50"
    ]
  );


  renderComparador(
    "1HZ75V",
    comparaciones[
      "1HZ75V"
    ]
  );


  actualizarMemoriaDesdeEngine();

}


/* ==========================================
   FIX14.0 · CUENTA DEMO / REAL SEGURA
   ========================================== */

function renderCuentaSegura() {

  const conexion =
    derivConnection
      .obtenerEstado();

  if (UI.cuentaModoActual) {
    UI.cuentaModoActual.textContent =
      "DEMO";
  }

  if (UI.cuentaRealEstado) {
    UI.cuentaRealEstado.textContent =
      "BLOQUEADA";
  }

  if (UI.cuentaSaldo) {
    const saldo =
      conexion?.balance ??
      conexion?.saldo ??
      null;

    UI.cuentaSaldo.textContent =
      Number.isFinite(Number(saldo))
        ? `${Number(saldo).toFixed(2)} ${conexion?.currency || "USD"}`
        : "--";
  }

  if (UI.cuentaDemoTab) {
    UI.cuentaDemoTab.disabled =
      false;
  }

  if (UI.cuentaRealTab) {
    UI.cuentaRealTab.disabled =
      true;
    UI.cuentaRealTab.title =
      "La ejecución REAL permanece bloqueada durante calibración.";
  }

}


/* ==========================================
   EJECUCIÓN DEMO
   ========================================== */

function renderEjecucionDemo() {

  const estado =
    obtenerEstadoRapido();


  const trade =
    estado?.trade ||
    {};


  const conectado =
    Boolean(
      derivConnection
        .obtenerEstado()
        ?.connected
    );


  const activa =
    Boolean(
      trade.ejecucionActiva
    );


  if (
    UI.estadoEjecucion
  ) {

    UI.estadoEjecucion.textContent =
      activa
        ? "EJECUCIÓN DEMO ON"
        : "EJECUCIÓN DEMO OFF";

  }


  if (
    UI.botonActivarDemo
  ) {

    UI.botonActivarDemo.disabled =
      activa ||
      !conectado;

  }


  if (
    UI.botonDesactivarDemo
  ) {

    UI.botonDesactivarDemo.disabled =
      !activa;

  }


  renderModoEjecucion();
  renderCuentaSegura();

}


/* ==========================================
   EJECUTAR MANUAL
   ========================================== */

UI.botonEjecutarManual
  ?.addEventListener(
    "click",
    async () => {

      if (
        obtenerModoActual() !==
        MODO_MANUAL
      ) {

        registrarActividad(
          "EJECUTAR AHORA solo funciona en MANUAL DIAGNÓSTICO.",
          "aviso"
        );


        return;

      }


      const operacionIdActual =
        obtenerEstadoRapido()
          ?.manualPendiente
          ?.operacionId ||
        operacionManualHabilitada;


      if (
        !operacionIdActual ||
        operacionIdActual ===
          operacionManualConsumida
      ) {

        renderModoEjecucion();

        return;

      }


      /*
        Se consume antes del BUY para impedir
        doble clic o doble ejecución de la misma
        predicción. Solo una nueva operacionId
        podrá volver a habilitar el botón.
      */
      operacionManualConsumida =
        operacionIdActual;

      operacionManualHabilitada =
        null;

      UI.botonEjecutarManual.disabled =
        true;

      UI.botonEjecutarManual.textContent =
        "EJECUTANDO…";


      registrarActividad(
        `⚡ EJECUTAR AHORA · señal ${operacionIdActual}.`,
        "correcto"
      );


      try {

        const resultado =
          await botEngine
            .ejecutarManual(
              operacionIdActual,
              {
                onOperacionUpdate:
                  mostrarActualizacionContrato
              }
            );


        if (
          !resultado?.aceptada
        ) {

          registrarActividad(
            resultado?.motivo ||
            "No se pudo ejecutar manualmente.",
            "aviso"
          );


          renderModoEjecucion();


          return;

        }


        if (
          resultado.compraDemo
        ) {

          mostrarCompraDemo(
            resultado.compraDemo
          );

        }


        if (
          resultado.resultadoDemo
        ) {

          mostrarResultadoDemo(
            resultado.resultadoDemo
          );

        }


        if (
          resultado.analisisPatron
        ) {

          renderAnalisisPatron(
            resultado.analisisPatron
          );

        }


        if (
          resultado.patronActualizado
        ) {

          renderAnalisisPatron({

            ...(
              resultado
                .analisisPatron ||
              {}
            ),

            ...resultado
              .patronActualizado,

            muestras:
              resultado
                .patronActualizado
                .total

          });

        }


        mostrarTelemetria(
          resultado.telemetria
        );


        registrarDiagnosticoTiming(
          resultado.telemetria
        );


        registrarPerfilOperacion(
          resultado.telemetria
        );


        actualizarEstadisticasCompletas();


        actualizarPanelCalibracion();


        recuperarResultadoEngine();


        actualizarMemoriaDesdeEngine();


        renderModoEjecucion();

      }

      catch (
        error
      ) {

        registrarActividad(
          `Error MANUAL · ${
            error?.message ||
            String(
              error
            )
          }`,
          "error"
        );


        renderModoEjecucion();

      }

    }
  );


/* ==========================================
   RECIBIR SEÑAL
   ========================================== */

signalBridge.onSenal(
  async (
    senal
  ) => {

    const fase =
      String(
        senal?.fase ||
        senal?.metadata?.fase ||
        "?"
      )
        .toUpperCase();


    mostrarSenal(
      senal
    );


    registrarActividad(
      `SEÑAL RECIBIDA · FASE ${fase} · ${
        senal.mercado ||
        "--"
      } · ${
        senal.direccion ||
        "--"
      }.`,
      "correcto"
    );


    const marcaPuente =
      Number(
        senal?.bridgeReceivedPerf
      );


    const senalRecibidaPerf =
      Number.isFinite(
        marcaPuente
      )
        ? marcaPuente
        : ahoraPreciso();


    try {

      const resultado =
        await botEngine
          .procesarSenal(
            senal,
            {
              onOperacionUpdate:
                mostrarActualizacionContrato,

              senalRecibidaPerf
            }
          );


      if (
        !resultado?.aceptada
      ) {

        registrarActividad(
          `FASE ${fase} NO PROCESADA · ${
            resultado?.motivo ||
            "Sin motivo"
          }`,
          "aviso"
        );


        return;

      }


      if (
        resultado.analisisPatron
      ) {

        renderAnalisisPatron(
          resultado.analisisPatron
        );

      }


      /* ====================================
         PREPARAR
         ==================================== */

      if (
        resultado.fase ===
        "PREPARAR"
      ) {

        registrarActividad(
          `PREPARAR COMPLETADO · ${
            resultado.mercado ||
            senal.mercado ||
            "--"
          } · patrón ${
            resultado
              .analisisPatron
              ?.clasificacion ||
            "SIN_EVIDENCIA"
          }.`,
          "correcto"
        );


        if (
          resultado.contrato
        ) {

          mostrarContrato(
            resultado.contrato
          );

        }


        if (
          resultado.propuestaDeriv
        ) {

          mostrarPropuestaDeriv(
            resultado.propuestaDeriv,
            resultado.contrato
          );

        }


        if (
          resultado.telemetria
        ) {

          mostrarTelemetria(
            resultado.telemetria
          );

        }


        actualizarMemoriaDesdeEngine();


        renderModoEjecucion();


        return;

      }


      /* ====================================
         EJECUTAR
         ==================================== */

      if (
        resultado.fase ===
        "EJECUTAR"
      ) {

        if (
          resultado.estado ===
          "MANUAL_ESPERANDO_CLICK"
        ) {

          registrarActividad(
            `MANUAL · TARGET recibido · ${
              senal.mercado ||
              "--"
            } · patrón ${
              resultado
                .analisisPatron
                ?.clasificacion ||
              "SIN_EVIDENCIA"
            }.`,
            "aviso"
          );


          mostrarTelemetria(
            resultado.telemetria
          );


          actualizarMemoriaDesdeEngine();


          renderModoEjecucion();


          return;

        }


        if (
          resultado.estado ===
          "NO_OPERAR_PATRON_RIESGO"
        ) {

          registrarActividad(
            `🛑 AUTOMÁTICO BLOQUEADO · ${
              senal.mercado ||
              "--"
            } · patrón histórico RIESGO.`,
            "error"
          );


          actualizarMemoriaDesdeEngine();


          return;

        }


        registrarActividad(
          `EJECUTAR FINALIZADO · ${
            senal.mercado ||
            "--"
          } · ${
            resultado.estado ||
            "--"
          }.`,
          "correcto"
        );


        if (
          resultado.contrato
        ) {

          mostrarContrato(
            resultado.contrato
          );

        }


        if (
          resultado.propuestaDeriv
        ) {

          mostrarPropuestaDeriv(
            resultado.propuestaDeriv,
            resultado.contrato
          );

        }


        if (
          resultado.compraDemo
        ) {

          mostrarCompraDemo(
            resultado.compraDemo
          );

        }


        if (
          resultado.resultadoDemo
        ) {

          mostrarResultadoDemo(
            resultado.resultadoDemo
          );

        }


        if (
          resultado.patronActualizado
        ) {

          renderAnalisisPatron({

            ...(
              resultado
                .analisisPatron ||
              {}
            ),

            ...resultado
              .patronActualizado,

            muestras:
              resultado
                .patronActualizado
                .total

          });

        }


        recuperarResultadoEngine();


        mostrarTelemetria(
          resultado.telemetria
        );


        registrarDiagnosticoTiming(
          resultado.telemetria
        );


        registrarPerfilOperacion(
          resultado.telemetria
        );


        actualizarEstadisticasCompletas();


        actualizarPanelCalibracion();


        actualizarMemoriaDesdeEngine();


        renderModoEjecucion();

      }

    }

    catch (
      error
    ) {

      registrarActividad(
        `Error ${BOT_VERSION} · fase ${fase} · ${
          error?.message ||
          String(
            error
          )
        }`,
        "error"
      );

    }

  }
);


/* ==========================================
   ESTADO PUENTE
   ========================================== */

window.addEventListener(
  "bot:estado",
  (
    evento
  ) => {

    const datos =
      evento.detail ||
      {};


    if (
      datos.conectado
    ) {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT SYNC";


        UI.estadoBot
          .classList
          .remove(
            "apagado"
          );


        UI.estadoBot
          .classList
          .add(
            "encendido"
          );

      }


      if (
        UI.botonConectar
      ) {

        UI.botonConectar.disabled =
          true;

      }


      if (
        UI.botonPausar
      ) {

        UI.botonPausar.disabled =
          false;

      }


      registrarActividad(
        `Puente ${BOT_VERSION} conectado.`,
        "correcto"
      );

    }

    else {

      if (
        UI.estadoBot
      ) {

        UI.estadoBot.textContent =
          "BOT OFF";

      }


      if (
        UI.botonConectar
      ) {

        UI.botonConectar.disabled =
          false;

      }


      if (
        UI.botonPausar
      ) {

        UI.botonPausar.disabled =
          true;

      }

    }

  }
);


/* ==========================================
   CONECTAR BOT
   ========================================== */

UI.botonConectar
  ?.addEventListener(
    "click",
    () => {

      signalBridge
        .conectar();


      const resultado =
        botEngine
          .iniciar();


      registrarActividad(
        resultado?.mensaje ||
        "Bot iniciado.",
        "correcto"
      );


      const estadoMotor =
        obtenerEstadoRapido();


      registrarActividad(
        `MOTOR ${
          estadoMotor
            ?.versionTelemetria ||
          "?"
        } · ${BOT_BUILD}`,
        estadoMotor
            ?.versionTelemetria ===
          "FIX14.0"
          ? "correcto"
          : "aviso"
      );


      registrarActividad(
        `MEMORIA → ${
          estadoMotor
            ?.versionPatrones ||
          "NO DETECTADA"
        }.`,
        estadoMotor
            ?.versionPatrones
          ? "correcto"
          : "aviso"
      );


      registrarActividad(
        `PROTOCOLO → ${
          estadoMotor
            ?.protocolo ||
          "NO DETECTADO"
        }.`,
        "correcto"
      );


      registrarActividad(
        `MODO → ${
          estadoMotor
            ?.modoEjecucion ||
          "NO DETECTADO"
        }.`,
        "correcto"
      );


      actualizarMemoriaDesdeEngine();


      renderModoEjecucion();

    }
  );


/* ==========================================
   PAUSAR
   ========================================== */

UI.botonPausar
  ?.addEventListener(
    "click",
    () => {

      const estado =
        obtenerEstadoRapido();


      if (
        !estado?.pausado
      ) {

        botEngine
          .pausar();


        UI.botonPausar.textContent =
          "REANUDAR";

      }

      else {

        botEngine
          .reanudar();


        UI.botonPausar.textContent =
          "PAUSAR";

      }

    }
  );


/* ==========================================
   ACTIVAR DEMO
   ========================================== */

UI.botonActivarDemo
  ?.addEventListener(
    "click",
    () => {

      const resultado =
        botEngine
          .activarEjecucionDemo();


      registrarActividad(
        resultado?.mensaje ||
        "Ejecución DEMO.",
        resultado?.ok
          ? "correcto"
          : "aviso"
      );


      renderEjecucionDemo();

    }
  );


/* ==========================================
   DESACTIVAR DEMO
   ========================================== */

UI.botonDesactivarDemo
  ?.addEventListener(
    "click",
    () => {

      botEngine
        .desactivarEjecucionDemo();


      renderEjecucionDemo();


      registrarActividad(
        "Ejecución DEMO desactivada.",
        "aviso"
      );

    }
  );


/* ==========================================
   PRUEBA INTERNA FIX14.0
   ========================================== */

UI.botonProbar
  ?.addEventListener(
    "click",
    async () => {

      const operacionId =
        `TEST-${Date.now()}`;


      signalBridge
        .recibirSenal({

          id:
            `${operacionId}-PREPARE`,

          operacionId,

          fase:
            "PREPARAR",

          protocolo:
            "FIX14.0",

          mercado:
            "R_50",

          estrategia:
            "even_odd",

          direccion:
            "EVEN",

          confianza:
            98,

          rawScore:
            84.4,

          valorPatron:
            30,

          predictionValue:
            30,

          precio:
            12345.67,

          ultimoDigito:
            8,

          tendencia:
            "ALCISTA",

          rsi:
            61,

          momentum:
            "ALCISTA",

          volatilidad:
            "MEDIA",

          segundosEntrada:
            10,

          timestamp:
            Date.now(),

          metadata: {

            operacionId,

            fase:
              "PREPARAR",

            protocolo:
              "FIX14.0",

            rawScore:
              84.4,

            valorPatron:
              30,

            predictionValue:
              30,

            prepararCotizacion:
              true,

            ejecutar:
              false

          }

        });


      await new Promise(
        (
          resolve
        ) =>
          setTimeout(
            resolve,
            2500
          )
      );


      const targetExecutionAt =
        Date.now() +
        1000;


      signalBridge
        .recibirSenal({

          id:
            `${operacionId}-TARGET`,

          operacionId,

          fase:
            "EJECUTAR",

          protocolo:
            "FIX14.0",

          mercado:
            "R_50",

          estrategia:
            "even_odd",

          direccion:
            "EVEN",

          confianza:
            98,

          rawScore:
            84.4,

          valorPatron:
            30,

          predictionValue:
            30,

          precio:
            12345.67,

          ultimoDigito:
            8,

          tendencia:
            "ALCISTA",

          rsi:
            61,

          momentum:
            "ALCISTA",

          volatilidad:
            "MEDIA",

          segundosEntrada:
            10,

          targetExecutionAt,

          targetVisualAt:
            targetExecutionAt,

          timestamp:
            Date.now(),

          metadata: {

            operacionId,

            fase:
              "EJECUTAR",

            protocolo:
              "FIX14.0",

            rawScore:
              84.4,

            valorPatron:
              30,

            predictionValue:
              30,

            targetExecutionAt,

            targetVisualAt:
              targetExecutionAt,

            ejecutar:
              true

          }

        });

    }
  );


/* ==========================================
   CUENTA DERIV
   ========================================== */

derivConnection.on(
  "account",
  (
    {
      accountId
    }
  ) => {

    if (
      UI.derivAccountId
    ) {

      UI.derivAccountId.value =
        accountId ||
        "";

    }


    if (
      UI.derivCuenta
    ) {

      UI.derivCuenta.textContent =
        accountId ||
        "--";

    }

  }
);


/* ==========================================
   ESTADO DERIV
   ========================================== */

derivConnection.on(
  "state",
  (
    {
      estado,
      mensaje
    }
  ) => {

    if (
      UI.estadoDeriv
    ) {

      UI.estadoDeriv.textContent =
        mensaje ||
        estado ||
        "--";

    }


    if (
      estado ===
      "connected"
    ) {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          "DEMO CONECTADO";

      }


      UI.botonConectarDeriv &&
        (
          UI.botonConectarDeriv.disabled =
            true
        );


      UI.botonDesconectarDeriv &&
        (
          UI.botonDesconectarDeriv.disabled =
            false
        );


      UI.derivAppId &&
        (
          UI.derivAppId.disabled =
            true
        );


      UI.derivToken &&
        (
          UI.derivToken.disabled =
            true
        );


      renderEjecucionDemo();


      registrarActividad(
        "Deriv DEMO conectado.",
        "correcto"
      );

    }

    else {

      if (
        UI.derivConexion
      ) {

        UI.derivConexion.textContent =
          estado ===
            "connecting"
            ? "CONECTANDO"
            : "OFF";

      }


      if (
        estado !==
        "connecting"
      ) {

        UI.botonConectarDeriv &&
          (
            UI.botonConectarDeriv.disabled =
              false
          );


        UI.botonDesconectarDeriv &&
          (
            UI.botonDesconectarDeriv.disabled =
              true
          );


        UI.derivAppId &&
          (
            UI.derivAppId.disabled =
              false
          );


        UI.derivToken &&
          (
            UI.derivToken.disabled =
              false
          );


        botEngine
          .desactivarEjecucionDemo();


        renderEjecucionDemo();

      }

    }

  }
);


/* ==========================================
   CONECTAR DERIV
   ========================================== */

UI.botonConectarDeriv
  ?.addEventListener(
    "click",
    async () => {

      const appId =
        UI.derivAppId
          ?.value
          ?.trim() ||
        "";


      const token =
        UI.derivToken
          ?.value
          ?.trim() ||
        "";


      if (
        !appId
      ) {

        registrarActividad(
          "Falta Deriv App ID.",
          "aviso"
        );


        return;

      }


      if (
        !token
      ) {

        registrarActividad(
          "Falta Token PAT.",
          "aviso"
        );


        return;

      }


      try {

        const resultado =
          await derivConnection
            .conectarDemo({
              token,
              appId
            });


        if (
          !resultado?.ok
        ) {

          registrarActividad(
            resultado?.mensaje ||
            "No se pudo conectar.",
            "error"
          );

        }

      }

      catch (
        error
      ) {

        registrarActividad(
          error?.message ||
          "Error de conexión.",
          "error"
        );

      }

    }
  );


/* ==========================================
   DESCONECTAR DERIV
   ========================================== */

UI.botonDesconectarDeriv
  ?.addEventListener(
    "click",
    () => {

      botEngine
        .desactivarEjecucionDemo();


      derivConnection
        .desconectar();


      if (
        UI.derivToken
      ) {

        UI.derivToken.value =
          "";

      }


      renderEjecucionDemo();

    }
  );


/* ==========================================
   ERRORES
   ========================================== */

derivConnection.on(
  "error",
  (
    {
      mensaje
    }
  ) => {

    registrarActividad(
      `DERIV ERROR → ${
        mensaje ||
        "Error desconocido"
      }`,
      "error"
    );

  }
);


window.addEventListener(
  "bot:error",
  (
    evento
  ) => {

    registrarActividad(
      evento.detail?.mensaje ||
      "Error de sincronización.",
      "error"
    );

  }
);


/* ==========================================
   CIERRE
   ========================================== */

window.addEventListener(
  "beforeunload",
  () => {

    botEngine
      .desactivarEjecucionDemo();


    if (
      signalBridge.destruir
    ) {

      signalBridge
        .destruir();

    }

    else if (
      signalBridge.desconectar
    ) {

      signalBridge
        .desconectar();

    }


    derivConnection
      .desconectar();

  }
);


/* ==========================================
   INICIO
   ========================================== */

if (
  UI.derivAccountId
) {

  UI.derivAccountId.value =
    "Se detectará automáticamente";

}


renderCuentaSegura();

renderEjecucionDemo();


actualizarPanelCalibracion();


renderModoEjecucion();


recuperarResultadoEngine();


actualizarEstadisticasCompletas();


actualizarMemoriaDesdeEngine();


const estadoInicialMotor =
  obtenerEstadoRapido();


registrarActividad(
  `BOT V1 MR ${BOT_VERSION} ${BOT_BUILD} preparado.`,
  "correcto"
);


registrarActividad(
  `Motor → ${
    estadoInicialMotor
      ?.versionTelemetria ||
    "NO DETECTADO"
  }.`,
  estadoInicialMotor
      ?.versionTelemetria ===
    "FIX14.0"
    ? "correcto"
    : "aviso"
);


registrarActividad(
  `Memoria → ${
    estadoInicialMotor
      ?.versionPatrones ||
    "NO DETECTADA"
  }.`,
  estadoInicialMotor
      ?.versionPatrones
    ? "correcto"
    : "aviso"
);


registrarActividad(
  `Protocolo → ${
    estadoInicialMotor
      ?.protocolo ||
    "NO DETECTADO"
  }.`,
  "correcto"
);


registrarActividad(
  `Modo inicial → ${
    estadoInicialMotor
      ?.modoEjecucion ||
    "NO DETECTADO"
  }.`,
  "correcto"
);


registrarActividad(
  "FIX14.1 DIRECTION TIMING + MEMORY + STRATEGY AUDIT activa.",
  "correcto"
);


registrarActividad(
  "Patrones FAVORABLE / RIESGO / SIN EVIDENCIA conectados."
);


registrarActividad(
  "Resumen de aprendizaje conectado."
);


registrarActividad(
  "MANUAL muestra antecedentes pero nunca bloquea el botón."
);


registrarActividad(
  "AUTOMÁTICO puede bloquear patrones históricos de RIESGO."
);


registrarActividad(
  "TESTLOG disponible desde el panel de memoria."
);


registrarActividad(
  "Esperando señal PREPARAR desde Trading Analyzer."
);


/* ==========================================
   FIN BOT.JS
   FIX14.1 DIRECTION TIMING + MEMORY + STRATEGY AUDIT
   ========================================== */
