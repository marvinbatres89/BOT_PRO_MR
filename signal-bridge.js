import { executionRecorder } from "./execution-recorder.js";
/* ==========================================
   BOT V1 MR
   SIGNAL BRIDGE
   FIX11 - PUENTE REFORZADO

   TRADING ANALYZER -> BOT

   RECEPCIÓN:
   1. BroadcastChannel
   2. evento localStorage
   3. comprobación periódica localStorage

   CONSERVA:
   - protección contra duplicados
   - protección contra señales antiguas
   - validación
   - marca de alta precisión

   AGREGA:
   - targetExecutionAt
   - metadata FIX11
   - respaldo para pestañas Android
   - diagnóstico de origen
   ========================================== */


const BOT_CHANNEL_NAME =
  "trading-analyzer-bot-v1-mr";


const STORAGE_SIGNAL_KEY =
  "TA_BOT_SIGNAL_V1";


/*
  Una señal de trading no debe
  recuperarse indefinidamente.

  Dejamos 20 segundos para dar
  margen adicional en Android.
*/

const MAX_ANTIGUEDAD_SENAL =
  20000;


/*
  Respaldo localStorage.

  Si Chrome suspende temporalmente
  BroadcastChannel o el evento storage,
  comprobamos la última señal guardada.
*/

const INTERVALO_RESPALDO_MS =
  250;



class SignalBridge {

  constructor() {

    this.ultimaSenal =
      null;


    this.conectado =
      false;


    this.listeners =
      new Set();


    this.channel =
      null;


    this.ultimoIdRecibido =
      null;


    this.temporizadorRespaldo =
      null;


    this.iniciarReceptorReal();

  }


  /* ========================================
     RELOJ DE ALTA PRECISIÓN
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


  /* ========================================
     OBTENER TARGET FIX11
     ======================================== */

  obtenerTargetExecutionAt(
    datos
  ) {

    const directo =
      Number(
        datos
          ?.targetExecutionAt
      );


    if (
      Number.isFinite(
        directo
      ) &&
      directo >
        0
    ) {

      return directo;

    }


    const metadata =
      Number(
        datos
          ?.metadata
          ?.targetExecutionAt
      );


    if (
      Number.isFinite(
        metadata
      ) &&
      metadata >
        0
    ) {

      return metadata;

    }


    return null;

  }


  /* ========================================
     ID DE SEÑAL
     ======================================== */

  obtenerId(
    datos
  ) {

    if (
      datos?.id ===
        undefined ||
      datos?.id ===
        null
    ) {

      return null;

    }


    return String(
      datos.id
    );

  }


  /* ========================================
     INICIAR RECEPTORES
     ======================================== */

  iniciarReceptorReal() {

    this.iniciarBroadcastChannel();

    this.iniciarStorageListener();

  }


  /* ========================================
     BROADCAST CHANNEL
     ======================================== */

  iniciarBroadcastChannel() {

    if (
      !(
        "BroadcastChannel" in
        window
      )
    ) {

      console.warn(
        "BroadcastChannel no disponible."
      );


      return;

    }


    try {

      this.channel =
        new BroadcastChannel(
          BOT_CHANNEL_NAME
        );


      this.channel.onmessage =
        (
          evento
        ) => {

          const recibidoPerf =
            this.ahora();


          console.log(
            "FIX11 · señal detectada por BroadcastChannel",
            evento.data
          );


          this.recibirSenalExterna(
            evento.data,
            "BroadcastChannel",
            recibidoPerf
          );

        };


      this.channel.onmessageerror =
        (
          evento
        ) => {

          console.error(
            "Error leyendo BroadcastChannel:",
            evento
          );

        };


    } catch (
      error
    ) {

      console.error(
        "No se pudo iniciar BroadcastChannel:",
        error
      );

    }

  }


  /* ========================================
     EVENTO STORAGE
     ======================================== */

  iniciarStorageListener() {

    window.addEventListener(
      "storage",
      (
        evento
      ) => {

        if (
          evento.key !==
            STORAGE_SIGNAL_KEY ||
          !evento.newValue
        ) {

          return;

        }


        const recibidoPerf =
          this.ahora();


        try {

          const datos =
            JSON.parse(
              evento.newValue
            );


          console.log(
            "FIX11 · señal detectada por evento storage",
            datos
          );


          this.recibirSenalExterna(
            datos,
            "localStorage-event",
            recibidoPerf
          );


        } catch (
          error
        ) {

          console.error(
            "Error leyendo señal de localStorage:",
            error
          );

        }

      }
    );

  }


  /* ========================================
     RESPALDO POR SONDEO

     ÚTIL CUANDO UNA PESTAÑA ESTÁ
     EN SEGUNDO PLANO EN ANDROID.
     ======================================== */

  iniciarRespaldoLocalStorage() {

    this.detenerRespaldoLocalStorage();


    this.temporizadorRespaldo =
      setInterval(
        () => {

          if (
            !this.conectado
          ) {

            return;

          }


          try {

            const guardada =
              localStorage.getItem(
                STORAGE_SIGNAL_KEY
              );


            if (
              !guardada
            ) {

              return;

            }


            const datos =
              JSON.parse(
                guardada
              );


            const id =
              this.obtenerId(
                datos
              );


            if (
              id &&
              id ===
                String(
                  this.ultimoIdRecibido
                )
            ) {

              return;

            }


            if (
              !this.esSenalReciente(
                datos
              )
            ) {

              return;

            }


            const recibidoPerf =
              this.ahora();


            console.log(
              "FIX11 · señal recuperada por respaldo localStorage",
              datos
            );


            this.recibirSenalExterna(
              datos,
              "localStorage-poll",
              recibidoPerf
            );


          } catch (
            error
          ) {

            console.warn(
              "Error comprobando respaldo localStorage:",
              error
            );

          }

        },
        INTERVALO_RESPALDO_MS
      );

  }


  detenerRespaldoLocalStorage() {

    clearInterval(
      this.temporizadorRespaldo
    );


    this.temporizadorRespaldo =
      null;

  }


  /* ========================================
     CONECTAR BOT
     ======================================== */

  conectar() {

    this.conectado =
      true;


    this.iniciarRespaldoLocalStorage();


    /*
      Al conectar, comprobar inmediatamente
      si existe una señal reciente.
    */

    try {

      const guardada =
        localStorage.getItem(
          STORAGE_SIGNAL_KEY
        );


      if (
        guardada
      ) {

        const datos =
          JSON.parse(
            guardada
          );


        if (
          this.esSenalReciente(
            datos
          )
        ) {

          setTimeout(
            () => {

              if (
                !this.conectado
              ) {

                return;

              }


              const recibidoPerf =
                this.ahora();


              this.recibirSenalExterna(
                datos,
                "localStorage-recuperada",
                recibidoPerf
              );

            },
            100
          );

        }

      }


    } catch (
      error
    ) {

      console.error(
        "No se pudo recuperar la última señal:",
        error
      );

    }


    window.dispatchEvent(
      new CustomEvent(
        "bot:estado",
        {
          detail: {

            conectado:
              true,

            mensaje:
              "BOT V1 MR FIX11 escuchando Trading Analyzer"

          }
        }
      )
    );


    console.log(
      "FIX11 · puente conectado",
      {
        canal:
          BOT_CHANNEL_NAME,

        storage:
          STORAGE_SIGNAL_KEY
      }
    );


    return true;

  }


  /* ========================================
     DESCONECTAR BOT
     ======================================== */

  desconectar() {

    this.conectado =
      false;


    this.detenerRespaldoLocalStorage();


    window.dispatchEvent(
      new CustomEvent(
        "bot:estado",
        {
          detail: {

            conectado:
              false,

            mensaje:
              "BOT desconectado"

          }
        }
      )
    );


    return true;

  }


  /* ========================================
     VALIDAR ANTIGÜEDAD
     ======================================== */

  esSenalReciente(
    datos
  ) {

    if (
      datos?.timestamp ===
        undefined ||
      datos?.timestamp ===
        null
    ) {

      return true;

    }


    const timestamp =
      Number(
        datos.timestamp
      );


    if (
      !Number.isFinite(
        timestamp
      ) ||
      timestamp <=
        0
    ) {

      return false;

    }


    const antiguedad =
      Date.now() -
      timestamp;


    return (
      antiguedad >=
        0 &&
      antiguedad <=
        MAX_ANTIGUEDAD_SENAL
    );

  }


  /* ========================================
     VALIDAR SEÑAL
     ======================================== */

  validarSenal(
    senal
  ) {

    if (
      !senal ||
      typeof senal !==
        "object"
    ) {

      return false;

    }


    if (
      !senal.mercado
    ) {

      return false;

    }


    if (
      !senal.estrategia
    ) {

      return false;

    }


    if (
      !senal.direccion
    ) {

      return false;

    }


    const confianza =
      Number(
        senal.confianza
      );


    if (
      !Number.isFinite(
        confianza
      )
    ) {

      return false;

    }


    if (
      confianza <
        0 ||
      confianza >
        100
    ) {

      return false;

    }


    /*
      targetExecutionAt es opcional
      para mantener compatibilidad
      con señales antiguas.

      Si existe, debe ser válido.
    */

    if (
      senal.targetExecutionAt !==
        null &&
      senal.targetExecutionAt !==
        undefined
    ) {

      const target =
        Number(
          senal.targetExecutionAt
        );


      if (
        !Number.isFinite(
          target
        ) ||
        target <=
          0
      ) {

        return false;

      }

    }


    return true;

  }


  /* ========================================
     DUPLICADOS
     ======================================== */

  esDuplicada(
    datos
  ) {

    const id =
      this.obtenerId(
        datos
      );


    if (
      !id
    ) {

      return false;

    }


    return (
      id ===
      String(
        this.ultimoIdRecibido
      )
    );

  }


  /* ========================================
     RECIBIR SEÑAL EXTERNA
     ======================================== */

  recibirSenalExterna(
    datos,
    origen = "desconocido",
    recibidoPerf = null
  ) {

    if (
      !this.conectado
    ) {

      console.log(
        `Señal detectada por ${origen}, pero BOT desconectado.`
      );


      return false;

    }


    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      console.warn(
        "Señal ignorada: formato inválido."
      );


      return false;

    }


    if (
      !this.esSenalReciente(
        datos
      )
    ) {

      console.warn(
        "Señal antigua ignorada.",
        {
          origen,
          id:
            datos?.id,
          timestamp:
            datos?.timestamp
        }
      );


      return false;

    }


    if (
      this.esDuplicada(
        datos
      )
    ) {

      /*
        Es normal recibir la misma señal
        por BroadcastChannel y localStorage.
      */

      return false;

    }


    const resultado =
      this.recibirSenal(
        datos,
        recibidoPerf
      );


    if (
      resultado
    ) {

      const id =
        this.obtenerId(
          datos
        );


      if (
        id
      ) {

        this.ultimoIdRecibido =
          id;

      }


      window.dispatchEvent(
        new CustomEvent(
          "bot:signal-source",
          {
            detail: {

              origen,

              recibidoPerf,

              id:
                datos?.id ??
                null,

              targetExecutionAt:
                this.obtenerTargetExecutionAt(
                  datos
                )

            }
          }
        )
      );


      console.log(
        "FIX11 · señal aceptada por el puente",
        {
          origen,

          id:
            datos?.id,

          mercado:
            datos?.mercado,

          targetExecutionAt:
            this.obtenerTargetExecutionAt(
              datos
            )
        }
      );

    }


    return resultado;

  }


  /* ========================================
     NORMALIZAR Y ENTREGAR SEÑAL
     ======================================== */

  recibirSenal(
    datos,
    recibidoPerf = null
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return false;

    }


    const marcaPuente =
      Number.isFinite(
        Number(
          recibidoPerf
        )
      )
        ? Number(
            recibidoPerf
          )
        : this.ahora();


    const targetExecutionAt =
      this.obtenerTargetExecutionAt(
        datos
      );


    const metadata =
      datos.metadata &&
      typeof datos.metadata ===
        "object"
        ? {
            ...datos.metadata
          }
        : {};


    /*
      Mantener target tanto arriba
      como dentro de metadata.
    */

    if (
      targetExecutionAt !==
        null
    ) {

      metadata.targetExecutionAt =
        targetExecutionAt;

    }


    const senal = {

      id:
        datos.id ??
        `${Date.now()}-${Math.random()}`,

      mercado:
        String(
          datos.mercado ||
          ""
        )
          .trim()
          .toUpperCase(),

      estrategia:
        datos.estrategia,

      direccion:
        datos.direccion,

      // SYNC 1:1: si el Analyzer envía visibleScore, ese valor manda.
      // No recalculamos ni sustituimos la confianza visible.
      confianza:
        Number(
          datos.visibleScore ??
          datos.confianza
        ),

      visibleScore:
        Number.isFinite(Number(datos.visibleScore))
          ? Number(datos.visibleScore)
          : Number(datos.confianza),

      rawScore:
        Number.isFinite(Number(datos.rawScore))
          ? Number(datos.rawScore)
          : null,

      qualityScore:
        Number.isFinite(Number(datos.qualityScore))
          ? Number(datos.qualityScore)
          : null,

      precio:
        datos.precio !==
          null &&
        datos.precio !==
          undefined
          ? Number(
              datos.precio
            )
          : null,

      ultimoDigito:
        datos.ultimoDigito !==
          null &&
        datos.ultimoDigito !==
          undefined
          ? Number(
              datos.ultimoDigito
            )
          : null,

      tendencia:
        datos.tendencia ??
        null,

      rsi:
        datos.rsi !==
          null &&
        datos.rsi !==
          undefined
          ? Number(
              datos.rsi
            )
          : null,

      momentum:
        datos.momentum ??
        null,

      volatilidad:
        datos.volatilidad ??
        null,

      segundosEntrada:
        datos.segundosEntrada !==
          null &&
        datos.segundosEntrada !==
          undefined
          ? Number(
              datos.segundosEntrada
            )
          : null,

      modo:
        datos.modo ??
        null,

      origen:
        datos.origen ??
        null,


      /* ====================================
         FIX11
         ==================================== */

      targetExecutionAt:
        targetExecutionAt,

      metadata:
        metadata,


      timestamp:
        datos.timestamp ??
        Date.now(),


      /*
        Marca de entrada al puente.
      */

      bridgeReceivedPerf:
        marcaPuente

    };


    if (
      !this.validarSenal(
        senal
      )
    ) {

      console.error(
        "FIX11 · señal rechazada",
        senal
      );


      window.dispatchEvent(
        new CustomEvent(
          "bot:error",
          {
            detail: {

              mensaje:
                "Señal rechazada: datos inválidos."

            }
          }
        )
      );


      return false;

    }


    this.ultimaSenal =
      senal;
        /* ========================================
       EXECUTION RECORDER
       MODO OBSERVADOR

       Registra la señal aceptada por el puente.
       NO compra.
       NO modifica contratos.
       NO altera la entrega normal al bot.js.
       ======================================== */

    try {

      const registroEjecucion =
        executionRecorder.createRecord({
          operationId:
            senal.id,

          signalReceivedAt:
            Date.now(),

          market:
            senal.mercado,

          strategy:
            senal.estrategia,

          direction:
            senal.direccion,

          confidence:
            senal.confianza,

          targetSecond:
            senal.segundosEntrada,

          targetExecutionAt:
            senal.targetExecutionAt,

          targetVisualAt:
            senal.metadata?.targetVisualAt ??
            senal.targetExecutionAt,

          metadata: {
            ...(senal.metadata || {}),

            signalId:
              senal.id,

            bridgeReceivedPerf:
              senal.bridgeReceivedPerf,

            source:
              senal.origen,

            recorderMode:
              "OBSERVER"
          }
        });


      console.log(
        "EXECUTION RECORDER · señal registrada",
        registroEjecucion
      );


    } catch (
      error
    ) {

      /*
        El registrador es únicamente observador.
        Si falla, NO debe bloquear la señal
        ni afectar el funcionamiento del BOT.
      */

      console.warn(
        "EXECUTION RECORDER · no se pudo registrar la señal:",
        error
      );

    }

    /*
      Entregar al bot.js
    */

    for (
      const callback
      of this.listeners
    ) {

      try {

        callback(
          senal
        );


      } catch (
        error
      ) {

        console.error(
          "Error entregando señal al BOT:",
          error
        );

      }

    }


    /*
      Evento adicional para diagnóstico.
    */

    window.dispatchEvent(
      new CustomEvent(
        "trading-analyzer:signal",
        {
          detail:
            senal
        }
      )
    );


    return true;

  }


  /* ========================================
     ESCUCHAR SEÑALES
     ======================================== */

  onSenal(
    callback
  ) {

    if (
      typeof callback ===
        "function"
    ) {

      this.listeners.add(
        callback
      );

    }


    return () => {

      this.listeners.delete(
        callback
      );

    };

  }


  /* ========================================
     ÚLTIMA SEÑAL
     ======================================== */

  obtenerUltimaSenal() {

    return this.ultimaSenal;

  }


  /* ========================================
     ESTADO
     ======================================== */

  estaConectado() {

    return this.conectado;

  }


  obtenerEstado() {

    return {

      conectado:
        this.conectado,

      canalDisponible:
        Boolean(
          this.channel
        ),

      canal:
        BOT_CHANNEL_NAME,

      storageKey:
        STORAGE_SIGNAL_KEY,

      ultimaSenal:
        this.ultimaSenal,

      ultimoIdRecibido:
        this.ultimoIdRecibido,

      respaldoActivo:
        Boolean(
          this.temporizadorRespaldo
        )

    };

  }


  /* ========================================
     CERRAR
     ======================================== */

  destruir() {

    this.detenerRespaldoLocalStorage();


    try {

      this.channel
        ?.close();

    } catch {}


    this.channel =
      null;


    this.conectado =
      false;

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const signalBridge =
  new SignalBridge();
