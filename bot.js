import {
  APP_VERSION,
  ENGINE,
  MARKETS,
  STRATEGIES
} from "./config.js";
import { diagnostics } from "./diagnostics.js";
import { derivAPI } from "./deriv-api.js";
import { marketBuffer } from "./market-buffer.js";
import { latencyMonitor } from "./latency-monitor.js";
import { buildSnapshot, volatility as volatilityLevel } from "./indicators.js";
import { exploreOpportunity } from "./engine1.js";
import { validateOpportunity } from "./engine2.js";
import { buildConsensus } from "./consensus.js";
import { evaluateTiming } from "./timing.js";
import { applyQualityFilter } from "./quality-filter.js";
import { statistics } from "./statistics.js";
import { memoryManager } from "./memory-manager.js";
import { voiceAssistant } from "./voice.js";
import { visualDirection, briefExplanation } from "./prediction.js";
import { executionCalibrator } from "./execution-calibrator.js";
import { i18n } from "./i18n.js";
import { marketRegistry } from "./market-registry.js";
import { testRegistry } from "./test-registry.js";

const $ = (id) => document.getElementById(id);

const UI = {};
[
  "connectionStatus","engineStatus","memoryStatus","latencyStatus",
  "marketSelect","strategySelect","modeSelect",
  "connectButton","disconnectButton","engineButton","predictionButton",
  "controlMessage","marketName","price","tickCount","lastDigit","updateTime",
  "digits","trend","rsi","momentum","volatility",
  "engineStage","engineDetail","engineProgress",
  "signalCard","signalState","signalTitle","signalValue","signalScore",
  "signalBar","signalReasons","countdown",
  "floatingSignal","floatingState","floatingValue","floatingDetail",
  "voiceButton","voiceSelect","voiceRate","voiceRateValue","voiceTest",
  "diagnosticButton","diagnosticPanel","diagnosticContent","copyDiagnostic","clearDiagnostic",
  "activityLog","clearLog",
  "statsTests","statsSuccess","statsFailed","statsAccuracy","resetStats",
  "calibrationStatus","calibrationSummary","executedSecond","manualResult",
  "saveCalibration","resetCalibration","calibrationTable",
  "languageSelect","tickerMarketName","tickerConnection","tickerPrice",
  "tickerLastDigit","tickerDigits","tickerEven","tickerOdd","tickerRises","tickerFalls",
  "radarSample","radarHot","radarCold","volatilityLevel","volatilityFill",
  "refreshMarkets","manualMarketSymbol","manualMarketName","manualMarketOneSecond",
  "addManualMarket","marketRegistryMessage",
  "entryAlertEnabled","entryAlertSecond","entryAlertDelay","entryFlash","appUpdateStatus",
  "markExecutionNow","executionTimingStatus","testWin","testLoss","testPending",
  "testRegistryList","clearTestRegistry","copyTestRegistry"
].forEach((id) => { UI[id] = $(id); });

const state = {
  connected: false,
  engineOn: false,
  predictionActive: false,
  cooldown: false,
  symbol: "1HZ100V",
  strategy: "rise_fall",
  mode: "fast",
  snapshot: null,
  lastOpportunity: null,
  latency: latencyMonitor.current,
  countdownTimer: null,
  cooldownTimer: null,
  lastPredictionResult: null,
  activeTestId: null,
  targetTenAt: null
};

function setText(element, value) {
  if (element) element.textContent = String(value);
}

function log(message, level = "") {
  if (!UI.activityLog) return;

  const line = document.createElement("p");
  line.textContent = `[${new Date().toLocaleTimeString("es-SV")}] ${message}`;
  line.className = level;
  UI.activityLog.prepend(line);

  while (UI.activityLog.children.length > ENGINE.maxLogLines) {
    UI.activityLog.lastElementChild?.remove();
  }
}

function statsKey() {
  return [state.symbol, state.strategy, state.mode].join("|");
}

function renderStats() {
  const value = statistics.get(statsKey());
  const accuracy = value.tests ? (value.success / value.tests) * 100 : null;

  setText(UI.statsTests, value.tests);
  setText(UI.statsSuccess, value.success);
  setText(UI.statsFailed, value.failed);
  setText(UI.statsAccuracy, accuracy === null ? "NO DATA" : `${accuracy.toFixed(1)}%`);
}


function renderTestRegistry() {
  if (!UI.testRegistryList) return;

  const records = testRegistry.all().slice(-10).reverse();
  UI.testRegistryList.innerHTML = "";

  if (!records.length) {
    UI.testRegistryList.innerHTML = '<div class="test-empty">Todavía no hay pruebas registradas.</div>';
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("div");
    row.className = "test-record";

    const resultText =
      record.result === "success" ? "GANADA" :
      record.result === "failed" ? "PERDIDA" :
      record.status === "WAITING_RESULT" ? "FALTA RESULTADO" :
      "PENDIENTE";

    const offsetText = Number.isFinite(Number(record.executionOffsetMs))
      ? `${record.executionOffsetMs >= 0 ? "+" : ""}${Math.round(record.executionOffsetMs)} ms`
      : "sin entrada";

    row.innerHTML = `
      <div><strong>${record.market || "--"} · ${record.strategy || "--"}</strong><span>${record.direction || "--"} · ${record.score ?? "--"}/100</span></div>
      <div><strong>${offsetText}</strong><span>${record.executedSecond ? `seg. ${record.executedSecond}` : "TARGET 10"}</span></div>
      <div class="test-result ${record.result || "pending"}">${resultText}</div>
    `;

    UI.testRegistryList.appendChild(row);
  });
}

function setTestButtons(record = null) {
  const canMark = Boolean(record && record.status === "WAITING_EXECUTION" && Number.isFinite(Number(record.targetTenAt)));
  const canResult = Boolean(record && record.status === "WAITING_RESULT");

  if (UI.markExecutionNow) UI.markExecutionNow.disabled = !canMark;
  if (UI.testWin) UI.testWin.disabled = !canResult;
  if (UI.testLoss) UI.testLoss.disabled = !canResult;

  if (!record) {
    setText(UI.testPending, "Sin prueba activa.");
    setText(UI.executionTimingStatus, "Esperando una señal confirmada.");
    return;
  }

  if (record.status === "WAITING_TARGET") {
    setText(UI.testPending, "Señal registrada. Esperando TARGET 10.");
    setText(UI.executionTimingStatus, "Todavía no marque la entrada.");
  } else if (record.status === "WAITING_EXECUTION") {
    setText(UI.testPending, "TARGET 10 activo.");
    setText(UI.executionTimingStatus, "Toque MARCAR ENTRADA exactamente cuando ejecute en el bot manual.");
  } else if (record.status === "WAITING_RESULT") {
    const offset = Math.round(Number(record.executionOffsetMs) || 0);
    setText(UI.testPending, `Entrada registrada: ${offset >= 0 ? "+" : ""}${offset} ms respecto al 10.`);
    setText(UI.executionTimingStatus, `Segundo ${record.executedSecond} · ${Math.round(Number(record.withinSecondMs) || 0)} ms dentro del segundo.`);
  } else {
    setText(UI.testPending, record.result === "success" ? "Prueba cerrada: GANADA." : "Prueba cerrada: PERDIDA.");
    setText(UI.executionTimingStatus, "Lista para la siguiente predicción.");
  }
}

function createPredictionTest(result) {
  const metadata = result?.metadata || {};
  const record = testRegistry.create({
    market: state.symbol,
    strategy: state.strategy,
    mode: state.mode,
    direction: result.direction,
    score: Number(result.score || 0),
    priceAtSignal: marketBuffer.prices.at(-1) ?? null,
    digitAtSignal: marketBuffer.digits.at(-1) ?? null,
    shortDiff: metadata.shortDiff ?? null,
    mediumDiff: metadata.mediumDiff ?? null,
    longDiff: metadata.longDiff ?? null,
    difference: metadata.difference ?? null,
    agreement: metadata.agreement ?? null,
    matchDigit: metadata.digit ?? null
  });

  state.activeTestId = record.id;
  state.targetTenAt = null;
  setTestButtons(record);
  renderTestRegistry();

  diagnostics.info("V12 TESTLOG · señal registrada para prueba.", {
    id: record.id,
    market: record.market,
    strategy: record.strategy,
    direction: record.direction,
    score: record.score
  });

  return record;
}

function minimumTicks() {
  if (state.strategy === "match") return ENGINE.minMatchTicks;
  if (state.strategy === "boom" || state.strategy === "crash") return ENGINE.minSpikeTicks;
  return state.mode === "deep" ? ENGINE.minDeepTicks : ENGINE.minFastTicks;
}

function marketSupportsStrategy(symbol = state.symbol, strategy = state.strategy) {
  const market = marketRegistry.all()[symbol];
  return Boolean(market?.strategies?.includes(strategy));
}

function canPredict() {
  return (
    state.connected &&
    state.engineOn &&
    !state.predictionActive &&
    !state.cooldown &&
    marketBuffer.prices.length >= minimumTicks() &&
    state.latency.operable &&
    marketSupportsStrategy()
  );
}

function renderControls() {
  setText(UI.engineStatus, state.engineOn ? "ON" : "OFF");
  UI.engineButton.textContent = state.engineOn ? i18n.t("stopEngine") : i18n.t("startEngine");
  UI.connectButton.textContent = i18n.t("connect");
  UI.disconnectButton.textContent = i18n.t("disconnect");
  UI.predictionButton.disabled = !canPredict();
  UI.predictionButton.textContent = state.cooldown ? i18n.t("waitButton") : i18n.t("prediction");

  const locked = state.predictionActive || state.cooldown;
  [UI.marketSelect, UI.strategySelect, UI.modeSelect]
    .forEach((element) => { element.disabled = locked; });
}

function renderConnection(status, label) {
  state.connected = status === "live";
  setText(UI.connectionStatus, label);
  UI.connectButton.disabled = status === "connecting" || status === "live";
  UI.disconnectButton.disabled = status !== "live";
  UI.engineButton.disabled = status !== "live";

  if (!state.connected && state.engineOn) stopEngine(false);
  renderControls();
}

function renderLatency() {
  const value = state.latency;
  setText(
    UI.latencyStatus,
    value.latencyMs === null
      ? "NO DATA"
      : `${value.status} · ${Math.round(value.latencyMs)} ms`
  );

  UI.latencyStatus.className = `status-pill ${
    value.operable ? "live" : value.status === "NO OPERAR" ? "danger-pill" : ""
  }`;
}

function renderDigits() {
  UI.digits.innerHTML = "";

  marketBuffer.digits.slice(-20).forEach((digit, index, array) => {
    const item = document.createElement("span");
    item.className = `digit${index === array.length - 1 ? " current" : ""}`;
    item.textContent = digit;
    UI.digits.appendChild(item);
  });
}

function renderIndicators(snapshot) {
  setText(UI.trend, i18n.translateState(snapshot.trend.direction));
  setText(UI.rsi, snapshot.rsi === null ? "--" : snapshot.rsi.toFixed(1));
  setText(UI.momentum, i18n.translateState(snapshot.momentum.direction));
  setText(UI.volatility, i18n.translateState(snapshot.volatility.level));
}


function renderLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = i18n.t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-option]").forEach((option) => {
    option.textContent = i18n.t(option.dataset.i18nOption);
  });

  if (UI.languageSelect) UI.languageSelect.value = i18n.language;

  UI.modeSelect?.dispatchEvent(new Event("optionsupdated"));
  renderControls();
  if (state.snapshot) renderIndicators(state.snapshot);
}

function populateMarketSelector() {
  const previous = state.symbol;
  const markets = marketRegistry.all();

  UI.marketSelect.innerHTML = "";

  const compatible = Object.entries(markets)
    .filter(([, market]) =>
      market.enabled !== false &&
      Array.isArray(market.strategies) &&
      market.strategies.includes(state.strategy)
    )
    .sort((a, b) => {
      const rank = ([symbol, market]) => {
        const name = String(market.name || "");
        const match = name.match(/(?:Volatility\s+|Boom\s+|Crash\s+)(\d+)/i);
        const n = Number(match?.[1] || 999);
        if (/^R_\d+$/.test(symbol)) return [0, n, name];
        if (/^1HZ\d+V$/.test(symbol) || /\(1s\)/i.test(name)) return [1, n, name];
        if (/boom/i.test(name)) return [2, n, name];
        if (/crash/i.test(name)) return [3, n, name];
        return [4, n, name];
      };
      const ra = rank(a), rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2]);
    });

  compatible.forEach(([symbol, market]) => {
    const option = document.createElement("option");
    option.value = symbol;
    option.textContent = market.name;
    option.dataset.marketFamily =
      /boom/i.test(market.name) ? "boom" :
      /crash/i.test(market.name) ? "crash" :
      (/^1HZ/.test(symbol) || /\(1s\)/i.test(market.name)) ? "1s" :
      /^R_/.test(symbol) ? "standard" : "other";
    UI.marketSelect.appendChild(option);
  });

  if (compatible.some(([symbol]) => symbol === previous)) {
    UI.marketSelect.value = previous;
  } else if (UI.marketSelect.options.length) {
    state.symbol = UI.marketSelect.options[0].value;
    UI.marketSelect.value = state.symbol;
  }

  UI.marketSelect.disabled = !UI.marketSelect.options.length;
  UI.marketSelect.dispatchEvent(new Event("optionsupdated"));
  return previous !== state.symbol;
}

function renderTicker() {
  setText(UI.tickerMarketName, marketRegistry.all()[state.symbol]?.name || state.symbol);
  setText(UI.tickerConnection, state.connected ? `● ${i18n.t("connected")}` : "● OFFLINE");
  setText(UI.tickerPrice, UI.price?.textContent || "--");
  setText(UI.tickerLastDigit, UI.lastDigit?.textContent || "--");

  const digits = marketBuffer.digits.slice(-20);
  UI.tickerDigits.innerHTML = "";

  digits.forEach((digit, index) => {
    const node = document.createElement("span");
    node.className = `ticker-digit ${digit % 2 === 0 ? "even" : "odd"}${index === digits.length - 1 ? " current" : ""}`;
    node.textContent = digit;
    UI.tickerDigits.appendChild(node);
  });

  const even = digits.filter((digit) => digit % 2 === 0).length;
  setText(UI.tickerEven, even);
  setText(UI.tickerOdd, digits.length - even);

  const prices = marketBuffer.prices.slice(-21);
  let rises = 0;
  let falls = 0;

  for (let index = 1; index < prices.length; index += 1) {
    if (prices[index] > prices[index - 1]) rises += 1;
    if (prices[index] < prices[index - 1]) falls += 1;
  }

  setText(UI.tickerRises, rises);
  setText(UI.tickerFalls, falls);
}

function renderMarketRadar() {
  if (!UI.radarHot || !UI.radarCold) return;

  const digits = marketBuffer.digits.slice(-100);
  const frequency = Array(10).fill(0);

  digits.forEach((digit) => {
    if (Number.isInteger(digit) && digit >= 0 && digit <= 9) {
      frequency[digit] += 1;
    }
  });

  setText(UI.radarSample, `${digits.length} muestras`);

  const ranked = frequency
    .map((count, digit) => ({ digit, count, percent: digits.length ? (count / digits.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  const hot = ranked.slice(0, 3);
  const cold = ranked.slice(-3).reverse();

  const renderList = (container, items, tone) => {
    container.innerHTML = "";
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "radar-row";
      row.innerHTML = `
        <span class="radar-digit ${tone}">${item.digit}</span>
        <span class="radar-track"><span class="radar-fill ${tone}" style="width:${Math.min(100, item.percent * 4)}%"></span></span>
        <span class="radar-percent">${item.percent.toFixed(1)}%</span>
      `;
      container.appendChild(row);
    });
  };

  renderList(UI.radarHot, hot, "hot");
  renderList(UI.radarCold, cold, "cold");

  const vol = volatilityLevel(marketBuffer.prices);
  const volLabels = { LOW: "BAJA", MEDIUM: "MEDIA", HIGH: "ALTA", "VERY HIGH": "MUY ALTA" };
  setText(UI.volatilityLevel, volLabels[vol.level] || vol.level);
  if (UI.volatilityFill) {
    UI.volatilityFill.style.width = `${Math.min(100, vol.percent * 900)}%`;
    UI.volatilityFill.className = `volatility-fill level-${vol.level.replace(/\s+/g, "-").toLowerCase()}`;
  }
}

function processTick(tick) {
  if (tick.symbol !== state.symbol) return;

  const rendered = marketBuffer.push(tick);
  state.latency = latencyMonitor.update(tick);

  setText(UI.price, rendered.formatted);
  setText(UI.tickCount, marketBuffer.ticks);
  setText(UI.lastDigit, rendered.digit ?? "--");
  setText(UI.updateTime, new Date(tick.epoch * 1000).toLocaleTimeString("es-SV"));
  setText(UI.memoryStatus, marketBuffer.prices.length);

  renderDigits();
  renderLatency();
  renderTicker();
  renderMarketRadar();

  if (state.engineOn) {
    state.snapshot = buildSnapshot({
      prices: marketBuffer.prices,
      digits: marketBuffer.digits,
      mode: state.mode
    });
    state.lastOpportunity = exploreOpportunity(state.strategy, state.snapshot);
    renderIndicators(state.snapshot);
  }

  renderControls();
}

function startEngine() {
  if (!state.connected) return;

  state.engineOn = true;
  state.snapshot = null;
  state.lastOpportunity = null;

  setText(UI.controlMessage, "Motor encendido. Análisis continuo activo en segundo plano.");
  setText(UI.engineStage, "ANÁLISIS CONTINUO");
  setText(UI.engineDetail, "Los motores preparan oportunidades; no se mostrará ninguna hasta pulsar PREDICTION.");
  UI.engineProgress.style.width = "25%";

  voiceAssistant.speak(
    `Motor encendido. ${(marketRegistry.all()[state.symbol]?.name || state.symbol)}. Estrategia ${STRATEGIES[state.strategy].voice}.`
  );

  diagnostics.ok("Motor encendido.", {
    symbol: state.symbol,
    strategy: state.strategy
  });
  log("Análisis continuo activado.", "ok");
  renderControls();
}

function stopEngine(announce = true) {
  state.engineOn = false;
  state.predictionActive = false;
  state.cooldown = false;
  clearInterval(state.countdownTimer);
  clearTimeout(state.cooldownTimer);

  memoryManager.clean("stop-engine");
  marketBuffer.reset();
  latencyMonitor.reset();
  state.latency = latencyMonitor.current;

  setText(UI.controlMessage, "Motor apagado y memoria temporal liberada.");
  setText(UI.engineStage, "MOTOR APAGADO");
  setText(UI.engineDetail, "Encienda el motor para comenzar un análisis limpio.");
  UI.engineProgress.style.width = "0%";
  setText(UI.price, "--");
  setText(UI.tickCount, 0);
  setText(UI.lastDigit, "--");
  setText(UI.memoryStatus, 0);
  UI.digits.innerHTML = "";
  renderLatency();

  if (announce) voiceAssistant.speak("Motor apagado. Memoria temporal liberada.");
  renderControls();
}

function showFloating(type, stateText, value, detail) {
  UI.floatingSignal.className = `signal-toast ${type} visible`;
  setText(UI.floatingState, stateText);
  setText(UI.floatingValue, value);
  setText(UI.floatingDetail, detail);
}

function hideFloating() {
  UI.floatingSignal.classList.remove("visible");
}

function showReasons(result) {
  UI.signalReasons.innerHTML = "";

  [...(result.reasons || []), ...(result.warnings || []).map((x) => `⚠ ${x}`)]
    .slice(0, 5)
    .forEach((reason) => {
      const item = document.createElement("li");
      item.textContent = reason;
      UI.signalReasons.appendChild(item);
    });
}

function finishPrediction(message) {
  clearInterval(state.countdownTimer);
  state.predictionActive = false;
  state.cooldown = true;

  setText(UI.engineStage, "PREDICCIÓN FINALIZADA");
  setText(UI.engineDetail, "No se generará otra señal automáticamente.");
  UI.engineProgress.style.width = "0%";
  setText(UI.controlMessage, `${message} Puede cambiar mercado o solicitar otra predicción.`);
  hideFloating();

  voiceAssistant.speak("Predicción finalizada. Genera una nueva señal.", { replace: true, rate: 1.05 });
  diagnostics.info("Predicción finalizada.", { message });
  renderControls();

  clearTimeout(state.cooldownTimer);
  state.cooldownTimer = setTimeout(() => {
    state.cooldown = false;
    setText(UI.engineStage, "ANÁLISIS CONTINUO");
    setText(UI.engineDetail, "Pulse PREDICTION para solicitar otra decisión.");
    renderControls();
  }, ENGINE.cooldownMs);
}



async function requestPrediction() {
  if (!canPredict()) return;

  state.predictionActive = true;
  renderControls();

  setText(UI.engineStage, "PREDICIENDO MERCADO");
  setText(UI.engineDetail, `${(marketRegistry.all()[state.symbol]?.name || state.symbol)} · ${STRATEGIES[state.strategy].name}`);
  UI.engineProgress.style.width = "55%";
  setText(UI.signalState, "ANALYZING");
  setText(UI.signalTitle, "Validación rápida");
  setText(UI.signalValue, "--");
  setText(UI.countdown, "--");

  voiceAssistant.speak(`Prediciendo ${(marketRegistry.all()[state.symbol]?.name || state.symbol)}.`);
  diagnostics.info("Predicción solicitada.", {
    symbol: state.symbol,
    strategy: state.strategy,
    mode: state.mode
  });

  const validationDelay =
    state.strategy === "match"
      ? Math.min(900, ENGINE.quickValidationMs)
      : state.strategy === "rise_fall"
        ? ENGINE.riseFallValidationMs
        : (state.strategy === "boom" || state.strategy === "crash")
          ? ENGINE.spikeValidationMs
          : ENGINE.quickValidationMs;
  // Lectura preliminar: solo referencia inicial para la UI, NUNCA entra en el score.
  const preliminary = exploreOpportunity(state.strategy, state.snapshot);

  await new Promise((resolve) => setTimeout(resolve, validationDelay));

  // Primera lectura fresca (independiente de la preliminar).
  const freshSnapshotA = buildSnapshot({
    prices: marketBuffer.prices,
    digits: marketBuffer.digits,
    mode: state.mode
  });
  const freshA = exploreOpportunity(state.strategy, freshSnapshotA);

  // Segunda lectura fresca, tras una pausa corta adicional: confirmación real
  // con datos nuevos, no un doble conteo de la misma lectura.
  await new Promise((resolve) => setTimeout(resolve, ENGINE.secondConfirmationMs));

  const freshSnapshotB = buildSnapshot({
    prices: marketBuffer.prices,
    digits: marketBuffer.digits,
    mode: state.mode
  });
  const freshB = exploreOpportunity(state.strategy, freshSnapshotB);

  // La "primera" señal para efectos de consenso/dirección es freshA (ya con
  // datos posteriores al click), y freshB la confirma de forma independiente.
  const first = freshA;
  const validation = validateOpportunity(freshA, freshB, freshSnapshotB);
  const consensus = buildConsensus(first, validation);
  const timing = evaluateTiming({
    strategy: state.strategy,
    snapshot: freshSnapshotB,
    latency: state.latency
  });
  const quality = applyQualityFilter({
    strategy: state.strategy,
    opportunity: first,
    consensus,
    timing
  });

  const result = {
    ...consensus,
    strategy: state.strategy,
    direction: consensus.direction,
    score: quality.score,
    reasons: consensus.reasons,
    warnings: consensus.warnings,
    metadata: consensus.metadata
  };

  setText(UI.signalScore, `${quality.score}/100`);
  UI.signalBar.style.width = `${quality.score}%`;
  showReasons(result);

  if (first.direction === "NO_OPERAR") {
    UI.signalCard.className = "card signal-card no-operate";
    setText(UI.signalState, "NO OPERAR");

    if (state.strategy === "match") {
      setText(UI.signalTitle, "Matches descartado");
      setText(UI.signalValue, "MATCHES 0");
      showFloating("no-operate", "NO OPERAR", "MATCHES 0", "El número 0 está excluido.");
      voiceAssistant.speak("Coincidencia cero. No operar.");
      setTimeout(() => finishPrediction("El candidato fue 0 y se descartó."), 2200);
      return;
    }

    const noOperateReason =
      (first.reasons && first.reasons[0]) ||
      "Sin desviación estadística significativa: patrón indistinguible de ruido.";
    setText(UI.signalTitle, "Sin entrada");
    setText(UI.signalValue, "SIN ENTRADA");
    showFloating("no-operate", "NO OPERAR", "SIN ENTRADA", noOperateReason);
    voiceAssistant.speak("Sin entrada. No operar.");
    setTimeout(() => finishPrediction(noOperateReason), 2200);
    return;
  }

  if (!quality.approved) {
    UI.signalCard.className = "card signal-card wait";
    setText(UI.signalState, "ESPERAR");
    setText(UI.signalTitle, "Sin entrada suficientemente clara");
    setText(UI.signalValue, "ESPERAR");
    showFloating("prepare", "ESPERAR", "SIN ENTRADA", quality.reason);
    voiceAssistant.speak("No hay una entrada suficientemente clara. Espere y vuelva a solicitar una predicción.");
    setTimeout(() => finishPrediction(quality.reason), 2600);
    return;
  }

  const value = visualDirection(result);
  const explanation = briefExplanation(result);

  UI.signalCard.className = "card signal-card confirmed";
  setText(UI.signalState, "READY");
  setText(UI.signalTitle, "Predicción confirmada");
  setText(UI.signalValue, value);
  showFloating("confirmed", "EJECUTAR", value, explanation || "Filtros superados.");


  setText(UI.engineStage, "VENTANA DE EJECUCIÓN");
  setText(UI.engineDetail, "Elija manualmente el segundo dentro del conteo.");
  UI.engineProgress.style.width = "100%";

  await beginPredictionSequence(result);
}

function renderDiagnostics(entries) {
  if (!entries.length) {
    UI.diagnosticContent.textContent = "Sin eventos.";
    return;
  }

  UI.diagnosticContent.innerHTML = "";

  entries.slice().reverse().forEach((entry) => {
    const line = document.createElement("div");
    line.className = `diagnostic-line ${entry.level}`;
    const extra = entry.data ? `\n${JSON.stringify(entry.data, null, 2)}` : "";
    line.textContent = `[${entry.time}] ${entry.message}${extra}`;
    UI.diagnosticContent.appendChild(line);
  });
}


function calibrationContext() {
  return { symbol: state.symbol, strategy: state.strategy, mode: state.mode };
}

function renderCalibration() {
  const recommendation = executionCalibrator.recommendation(calibrationContext());
  setText(UI.calibrationStatus, recommendation.status);

  setText(
    UI.calibrationSummary,
    recommendation.second
      ? `${recommendation.status}: segundo ${recommendation.second} · ${recommendation.accuracy.toFixed(1)}% en ${recommendation.tests} pruebas.`
      : "Registre al menos 20 resultados por segundo antes de mostrar una recomendación."
  );

  UI.calibrationTable.innerHTML = "";
  recommendation.rows.forEach((row) => {
    const line = document.createElement("div");
    line.className = "calibration-row";
    line.innerHTML = `
      <strong>Seg. ${row.second}</strong>
      <span>${row.tests} pruebas</span>
      <span>${row.success} +</span>
      <span>${row.failed} -</span>
    `;
    UI.calibrationTable.appendChild(line);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCountdown(seconds) {
  clearInterval(state.countdownTimer);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    let lastShown = null;

    const update = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, seconds - Math.floor(elapsed));

      if (remaining !== lastShown) {
        lastShown = remaining;
        setText(UI.countdown, remaining);
        voiceAssistant.speakCountdownNumber(remaining);
      }

      if (elapsed >= seconds) {
        clearInterval(state.countdownTimer);
        setText(UI.countdown, 0);
        resolve();
      }
    };

    update();
    state.countdownTimer = setInterval(update, 80);
  });
}

function flashEntryNow() {
  if (!UI.entryAlertEnabled?.checked || !UI.entryFlash) return;
  UI.entryFlash.hidden = false;
  UI.entryFlash.classList.remove("pulse");
  void UI.entryFlash.offsetWidth;
  UI.entryFlash.classList.add("pulse");
  setTimeout(() => { UI.entryFlash.hidden = true; }, 650);
}

async function beginPredictionSequence(result) {
  const explanation = briefExplanation(result);
  state.lastPredictionResult = result;
  const testRecord = createPredictionTest(result);

  setText(UI.engineStage, "PREDICCIÓN CONFIRMADA");
  setText(UI.engineDetail, "Escuche la señal y ejecute dentro del conteo.");
  UI.engineProgress.style.width = "88%";
  showFloating("confirmed", "EJECUTAR", visualDirection(result), explanation || "Filtros superados.");

  await voiceAssistant.announcePredictionAndExecution(result, explanation);

  /* ==========================================
     V12.0.3 -> BOT V1 MR
     SINCRONIZACIÓN POR RELOJ ABSOLUTO
     ========================================== */

  const entrySecond = Math.max(
    1,
    Math.min(
      ENGINE.executionSeconds,
      Number(UI.entryAlertSecond?.value || result?.segundosEntrada || result?.targetSecond || 10)
    )
  );
  const visualDelayMs = Math.max(-500, Math.min(500, Number(UI.entryAlertDelay?.value || 0)));

  // PREPARAR se envía antes de que comience el segundo 10.
  // De este modo el BOT puede solicitar/guardar la propuesta sin mover
  // el instante real de ejecución.
  const prepareLeadMs = 1200;
  const executeMessageGapMs = 700;
  const countdownStartAt = Date.now() + prepareLeadMs;
  // TARGET real permanece intacto. El ajuste solo mueve la alerta visual AHORA.
  const targetExecutionAt =
    countdownStartAt +
    Math.max(0, (ENGINE.executionSeconds - entrySecond) * 1000);
  const targetVisualAt = targetExecutionAt + visualDelayMs;

  // Programa AHORA por reloj absoluto; permite valores negativos (ANTES).
  if (UI.entryAlertEnabled?.checked) {
    setTimeout(flashEntryNow, Math.max(0, targetVisualAt - Date.now()));
  }

  try {
    const BOT_CHANNEL_NAME = "trading-analyzer-bot-v1-mr";
    const STORAGE_SIGNAL_KEY = "TA_BOT_SIGNAL_V1";
    const operacionId = `TA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const enviarAlBot = (mensaje) => {
      localStorage.setItem(STORAGE_SIGNAL_KEY, JSON.stringify(mensaje));

      if ("BroadcastChannel" in window) {
        const canalBot = new BroadcastChannel(BOT_CHANNEL_NAME);
        canalBot.postMessage(mensaje);
        canalBot.close();
      }
    };

    const datosBase = {
      operacionId,
      mercado: state.symbol,
      estrategia: state.strategy,
      direccion: result.direction,
      // SYNC 1:1 DE CONFIANZA
      // La confianza que viaja al BOT debe ser exactamente la misma
      // que el Analyzer presenta como porcentaje visible del motor.
      // result.score puede incluir ajustes posteriores de consenso/timing
      // y por eso podía mostrar 87% en el BOT mientras el Analyzer
      // mostraba visible: 80%.
      confianza: Number(
        result.metadata?.visibleScore ??
        result.visibleScore ??
        result.score ??
        result.confidence ??
        0
      ),
      visibleScore: Number(
        result.metadata?.visibleScore ??
        result.visibleScore ??
        result.score ??
        0
      ),
      rawScore: Number(
        result.metadata?.rawScore ??
        result.rawScore ??
        result.score ??
        0
      ),
      qualityScore: Number(result.score ?? 0),
      precio: state.snapshot?.price ?? null,
      ultimoDigito: state.snapshot?.lastDigit ?? null,
      tendencia: state.snapshot?.trend ?? null,
      rsi: state.snapshot?.rsi ?? null,
      momentum: state.snapshot?.momentum ?? null,
      volatilidad: state.snapshot?.volatility ?? null,
      segundosEntrada: entrySecond,
      modo: state.mode,
      origen: "TRADING_ANALYZER_PRO_MR_V12"
    };

    const ahoraPreparar = Date.now();
    const preparar = {
      ...datosBase,
      id: `${operacionId}-PREPARE`,
      fase: "PREPARAR",
      protocolo: "SYNC12.0.2",
      targetExecutionAt,
      targetVisualAt,
      timestamp: ahoraPreparar,
      metadata: {
        operacionId,
        fase: "PREPARAR",
        protocolo: "SYNC12.0.2",
        prepararCotizacion: true,
        ejecutar: false,
        countdownStartAt,
        targetExecutionAt,
        targetVisualAt,
        entrySecond,
        visualDelayMs
      }
    };

    enviarAlBot(preparar);
    console.log("V12 -> BOT · PREPARAR enviado", preparar);

    // Conservamos la separación entre PREPARAR y EJECUTAR, pero la fase
    // EJECUTAR ya no recalcula ni desplaza el objetivo: usa la misma hora
    // absoluta que utiliza la herramienta.
    await sleep(executeMessageGapMs);

    const ahoraEjecutar = Date.now();
    const ejecutar = {
      ...datosBase,
      id: `${operacionId}-TARGET`,
      fase: "EJECUTAR",
      protocolo: "SYNC12.0.2",
      targetExecutionAt,
      targetVisualAt,
      timestamp: ahoraEjecutar,
      metadata: {
        operacionId,
        fase: "EJECUTAR",
        protocolo: "SYNC12.0.2",
        targetExecutionAt,
        targetVisualAt,
        countdownStartAt,
        prepararCotizacion: false,
        ejecutar: true,
        referenciaEntrada: `SEGUNDO_${entrySecond}`,
        entrySecond,
        visualDelayMs
      }
    };

    enviarAlBot(ejecutar);
    console.log("V12 -> BOT · EJECUTAR enviado", ejecutar);
  } catch (error) {
    console.error("V12 -> BOT · error protocolo PREPARAR/EJECUTAR", error);
  }

  // Esperamos únicamente hasta el reloj acordado para iniciar el 10.
  // No usamos una espera fija adicional, evitando acumular desfases.
  await sleep(Math.max(0, countdownStartAt - Date.now()));

  state.targetTenAt = countdownStartAt;
  const targeted = testRegistry.setTarget(testRecord.id, state.targetTenAt);
  setTestButtons(targeted);
  renderTestRegistry();

  diagnostics.ok("V12.0.3 CONFIDENCE-SYNC · TARGET registrado.", {
    id: testRecord.id,
    targetTenAt: state.targetTenAt,
    entrySecond,
    visualDelayMs,
    targetVisualAt
  });

  setText(UI.engineStage, "VENTANA DE EJECUCIÓN");
  setText(UI.engineDetail, "Herramienta y BOT sincronizados por hora absoluta.");
  UI.engineProgress.style.width = "100%";
  await runCountdown(ENGINE.executionSeconds);
  await sleep(650);
  finishPrediction("La ventana de ejecución terminó.");
}


const ENTRY_SETTINGS_KEY = "trading-entry-alert-v11-3-4";

function loadEntrySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(ENTRY_SETTINGS_KEY) || "{}");
    if (UI.entryAlertEnabled) UI.entryAlertEnabled.checked = saved.enabled ?? true;
    if (UI.entryAlertSecond) UI.entryAlertSecond.value = String(saved.second ?? 10);
    if (UI.entryAlertDelay) UI.entryAlertDelay.value = String(saved.delayMs ?? 0);
  } catch {}
}

function saveEntrySettings() {
  try {
    localStorage.setItem(
      ENTRY_SETTINGS_KEY,
      JSON.stringify({
        enabled: Boolean(UI.entryAlertEnabled?.checked),
        second: Number(UI.entryAlertSecond?.value || 10),
        delayMs: Number(UI.entryAlertDelay?.value || 0)
      })
    );
  } catch {}
}

async function init() {
  await voiceAssistant.init();

  voiceAssistant.voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = `${voice.name}|${voice.lang}`;
    option.textContent = `${voice.name} · ${voice.lang}`;
    UI.voiceSelect.appendChild(option);
  });

  diagnostics.subscribe(renderDiagnostics);
  diagnostics.ok(`Trading Analyst Pro MR V${APP_VERSION} iniciado.`);

  loadEntrySettings();
  populateMarketSelector();
  renderLanguage();
  renderTicker();
  renderStats();
  renderTestRegistry();
  setTestButtons(state.activeTestId ? testRegistry.get(state.activeTestId) : null);
  renderCalibration();
  renderControls();
  renderLatency();
  setText(UI.marketName, (marketRegistry.all()[state.symbol]?.name || state.symbol));
  log(`Trading Analyst Pro MR V${APP_VERSION} listo.`, "ok");
}

UI.connectButton.addEventListener("click", () => derivAPI.connect(state.symbol));
UI.disconnectButton.addEventListener("click", () => {
  stopEngine(false);
  derivAPI.disconnect();
});
UI.engineButton.addEventListener("click", () => {
  state.engineOn ? stopEngine() : startEngine();
});
UI.predictionButton.addEventListener("click", requestPrediction);

UI.marketSelect.addEventListener("change", () => {
  const wasEngineOn = state.engineOn;
  state.symbol = UI.marketSelect.value;

  memoryManager.clean("market-change");
  marketBuffer.reset();
  latencyMonitor.reset();
  state.latency = latencyMonitor.current;
  state.snapshot = null;
  state.lastOpportunity = null;

  setText(UI.marketName, (marketRegistry.all()[state.symbol]?.name || state.symbol));
  setText(UI.price, "--");
  setText(UI.tickCount, 0);
  setText(UI.lastDigit, "--");
  setText(UI.memoryStatus, 0);
  UI.digits.innerHTML = "";

  if (state.connected) derivAPI.changeSymbol(state.symbol);

  if (wasEngineOn) {
    state.engineOn = true;
    setText(UI.engineStage, "SINCRONIZANDO NUEVO MERCADO");
    setText(UI.engineDetail, "Recopilando datos limpios sin apagar el motor.");
    voiceAssistant.speak(`Cambiando a ${(marketRegistry.all()[state.symbol]?.name || state.symbol)}.`);
  }

  populateMarketSelector();
  renderLanguage();
  renderTicker();
  renderStats();
  renderTestRegistry();
  setTestButtons(state.activeTestId ? testRegistry.get(state.activeTestId) : null);
  renderCalibration();
  renderControls();
});

UI.strategySelect.addEventListener("change", () => {
  state.strategy = UI.strategySelect.value;
  state.snapshot = null;
  state.lastOpportunity = null;

  const previous = state.symbol;
  const changedMarket = populateMarketSelector();

  if (!UI.marketSelect.options.length) {
    setText(
      UI.controlMessage,
      state.connected
        ? `No se detectó todavía un mercado compatible con ${STRATEGIES[state.strategy].name}. Actualizando desde Deriv...`
        : `Conecte la herramienta para cargar mercados compatibles con ${STRATEGIES[state.strategy].name}.`
    );
    if (state.connected) derivAPI.requestActiveSymbols();
  } else if (changedMarket && state.connected && state.symbol !== previous) {
    memoryManager.clean("strategy-market-change");
    marketBuffer.reset();
    latencyMonitor.reset();
    state.latency = latencyMonitor.current;
    derivAPI.changeSymbol(state.symbol);
    setText(UI.marketName, (marketRegistry.all()[state.symbol]?.name || state.symbol));
  }

  setText(UI.engineStage, state.engineOn ? "ESTRATEGIA ACTUALIZADA" : "EN ESPERA");
  setText(
    UI.engineDetail,
    state.engineOn
      ? `Analizando ${STRATEGIES[state.strategy].name} sin apagar el motor.`
      : "Encienda el motor para comenzar."
  );
  voiceAssistant.speak(`Estrategia ${STRATEGIES[state.strategy].voice}.`);
  renderLanguage();
  renderTicker();
  renderStats();
  renderTestRegistry();
  setTestButtons(state.activeTestId ? testRegistry.get(state.activeTestId) : null);
  renderCalibration();
  renderControls();
});

UI.modeSelect.addEventListener("change", () => {
  state.mode = UI.modeSelect.value;
  state.snapshot = null;
  state.lastOpportunity = null;
  renderCalibration();
  renderControls();
});

UI.voiceButton.addEventListener("click", () => {
  setText(UI.voiceButton, voiceAssistant.toggle() ? "🔊" : "🔇");
});

UI.voiceSelect.addEventListener("change", () => {
  voiceAssistant.voice =
    voiceAssistant.voices.find(
      (voice) => `${voice.name}|${voice.lang}` === UI.voiceSelect.value
    ) || voiceAssistant.voice;
});

UI.voiceRate.addEventListener("input", () => {
  voiceAssistant.rate = Number(UI.voiceRate.value);
  setText(UI.voiceRateValue, `${voiceAssistant.rate.toFixed(2)}x`);
});

UI.voiceTest.addEventListener("click", () => {
  voiceAssistant.speak("Asistente de voz funcionando. Matches se pronuncia coincidencia.");
});

UI.diagnosticButton.addEventListener("click", () => {
  const open = UI.diagnosticPanel.hidden;
  UI.diagnosticPanel.hidden = !open;
  UI.diagnosticButton.textContent = open ? "🛠 CERRAR" : "🛠 ABRIR";
});

UI.copyDiagnostic.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(diagnostics.exportText() || "Sin eventos.");
    log("Diagnóstico copiado.", "ok");
  } catch (error) {
    diagnostics.error("No se pudo copiar el diagnóstico.", { message: error.message });
  }
});

UI.clearDiagnostic.addEventListener("click", () => diagnostics.clear());
UI.clearLog.addEventListener("click", () => { UI.activityLog.innerHTML = ""; });
UI.resetStats.addEventListener("click", () => {
  statistics.reset(statsKey());
  renderStats();
});


UI.saveCalibration.addEventListener("click", () => {
  const second = Number(UI.executedSecond.value);
  const result = UI.manualResult.value;

  if (!second || !["success", "failed"].includes(result)) {
    log("Seleccione segundo y resultado antes de guardar.", "warn");
    return;
  }

  executionCalibrator.record(calibrationContext(), second, result === "success");
  statistics.record(statsKey(), result === "success");
  populateMarketSelector();
  renderLanguage();
  renderTicker();
  renderStats();
  renderTestRegistry();
  setTestButtons(state.activeTestId ? testRegistry.get(state.activeTestId) : null);
  renderCalibration();

  UI.executedSecond.value = "";
  UI.manualResult.value = "";
  log(`Resultado guardado para el segundo ${second}.`, "ok");
});

UI.resetCalibration.addEventListener("click", () => {
  executionCalibrator.reset(calibrationContext());
  renderCalibration();
  log("Calibración reiniciada para esta configuración.", "warn");
});


UI.entryAlertEnabled?.addEventListener("change", saveEntrySettings);
UI.entryAlertSecond?.addEventListener("change", saveEntrySettings);
UI.entryAlertDelay?.addEventListener("change", saveEntrySettings);



/* ==========================================
   V12 TESTLOG · REGISTRO MANUAL + TIMING
   ========================================== */

UI.markExecutionNow?.addEventListener("click", () => {
  if (!state.activeTestId) return;

  const record = testRegistry.markExecution(state.activeTestId, Date.now());
  if (!record) {
    setText(UI.executionTimingStatus, "No se pudo registrar: TARGET 10 todavía no está disponible.");
    return;
  }

  setTestButtons(record);
  renderTestRegistry();

  diagnostics.ok("V12 TESTLOG · entrada manual marcada.", {
    id: record.id,
    executionOffsetMs: record.executionOffsetMs,
    executedSecond: record.executedSecond,
    withinSecondMs: record.withinSecondMs
  });

  log(`Entrada marcada ${record.executionOffsetMs >= 0 ? "+" : ""}${Math.round(record.executionOffsetMs)} ms respecto al 10.`, "ok");
});

function closeActiveTest(result) {
  if (!state.activeTestId) return;
  const before = testRegistry.get(state.activeTestId);
  if (!before || before.status !== "WAITING_RESULT") return;

  const record = testRegistry.setResult(state.activeTestId, result);
  if (!record) return;

  const success = result === "success";
  statistics.record(statsKey(), success);

  if (Number.isFinite(Number(record.executedSecond))) {
    executionCalibrator.record(
      { symbol: record.market, strategy: record.strategy, mode: record.mode },
      Number(record.executedSecond),
      success
    );
  }

  renderStats();
  renderCalibration();
  renderTestRegistry();
  setTestButtons(record);

  diagnostics.info("V12 TESTLOG · resultado manual cerrado.", {
    id: record.id,
    result,
    executionOffsetMs: record.executionOffsetMs,
    executedSecond: record.executedSecond
  });
}

UI.testWin?.addEventListener("click", () => closeActiveTest("success"));
UI.testLoss?.addEventListener("click", () => closeActiveTest("failed"));

UI.clearTestRegistry?.addEventListener("click", () => {
  testRegistry.clear();
  state.activeTestId = null;
  state.targetTenAt = null;
  renderTestRegistry();
  setTestButtons(null);
  log("Registro de pruebas V12 reiniciado.", "warn");
});

UI.copyTestRegistry?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(testRegistry.exportText());
    log("Registro de pruebas V12 copiado.", "ok");
  } catch (error) {
    diagnostics.error("No se pudo copiar el registro de pruebas.", { message: error.message });
  }
});

UI.languageSelect.addEventListener("change", () => {
  i18n.setLanguage(UI.languageSelect.value);
  renderLanguage();
  renderTicker();
  UI.marketSelect.dispatchEvent(new Event("optionsupdated"));
  UI.strategySelect.dispatchEvent(new Event("optionsupdated"));
  UI.modeSelect.dispatchEvent(new Event("optionsupdated"));
});

window.addEventListener("languagechange", () => {
  renderLanguage();
  renderTicker();
});

UI.refreshMarkets.addEventListener("click", () => {
  derivAPI.requestActiveSymbols();
  setText(UI.marketRegistryMessage, "Solicitando mercados activos a Deriv...");
});

UI.addManualMarket.addEventListener("click", () => {
  try {
    marketRegistry.addManual({
      symbol: UI.manualMarketSymbol.value,
      name: UI.manualMarketName.value,
      oneSecond: UI.manualMarketOneSecond.checked
    });

    populateMarketSelector();
    setText(UI.marketRegistryMessage, "Mercado agregado correctamente.");
    UI.manualMarketSymbol.value = "";
    UI.manualMarketName.value = "";
    UI.manualMarketOneSecond.checked = false;
  } catch (error) {
    setText(UI.marketRegistryMessage, error.message);
  }
});

derivAPI.on("activeSymbols", ({ items }) => {
  marketRegistry.ingestActiveSymbols(items);
  const previous = state.symbol;
  const changedMarket = populateMarketSelector();

  if (changedMarket && state.connected && state.symbol !== previous) {
    memoryManager.clean("active-symbols-market-change");
    marketBuffer.reset();
    latencyMonitor.reset();
    state.latency = latencyMonitor.current;
    derivAPI.changeSymbol(state.symbol);
    setText(UI.marketName, (marketRegistry.all()[state.symbol]?.name || state.symbol));
  }

  setText(
    UI.marketRegistryMessage,
    `${items.length} símbolos recibidos; se mostraron los mercados compatibles con la estrategia.`
  );
  renderTicker();
  renderControls();
});

derivAPI.on("state", ({ state: status, label }) => renderConnection(status, label));
derivAPI.on("tick", processTick);
derivAPI.on("error", ({ message }) => log(message, "error"));
derivAPI.on("log", ({ message, level }) => log(message, level));

memoryManager.register(() => {
  clearInterval(state.countdownTimer);
  clearTimeout(state.cooldownTimer);
  state.predictionActive = false;
  state.cooldown = false;
  hideFloating();
});

window.addEventListener("beforeunload", () => {
  derivAPI.disconnect();
  memoryManager.clean("before-unload");
});

init().catch((error) => {
  diagnostics.error("Error durante init().", {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
});
