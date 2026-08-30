/* ==========================================
   BOT V1 MR
   DERIV TRADE FIX6
   SOLO CUENTA DEMO

   FLUJO PRINCIPAL:

   BUY
   -> CONTRACT ID
   -> PORTFOLIO
   -> PROFIT TABLE
   -> GANADA / PERDIDA
   -> PROFIT FINAL

   RESPALDOS:
   -> proposal_open_contract
   -> transaction

   IMPORTANTE:
   - SOLO DEMO
   - 1 OPERACIÓN A LA VEZ
   - SIN MARTINGALA
   ========================================== */

import {
  derivConnection
} from "./deriv-connection.js";


class DerivTrade {

  constructor() {

    this.reqId =
      7000;

    this.pendientes =
      new Map();

    this.seguimientos =
      new Map();

    this.ejecucionActiva =
      false;

    this.operacionActiva =
      null;

    this.ultimoResultado =
      null;

    this.transactionSubscriptionId =
      null;

    this.transactionStreamSolicitado =
      false;


    derivConnection.on(
      "message",
      (datos) => {

        this.procesarMensaje(
          datos
        );

      }
    );


    derivConnection.on(
      "state",
      ({
        estado
      }) => {

        if (
          estado !==
            "connected"
        ) {

          this.transactionSubscriptionId =
            null;

          this.transactionStreamSolicitado =
            false;


          this.interrumpirSeguimientos(
            "Conexión Deriv cerrada."
          );

        }

      }
    );

  }


  /* ========================================
     REQ ID
     ======================================== */

  siguienteReqId() {

    this.reqId +=
      1;

    return this.reqId;

  }


  /* ========================================
     ACTIVAR EJECUCIÓN DEMO
     ======================================== */

  activar() {

    const estado =
      derivConnection
        .obtenerEstado();


    if (
      !estado.connected
    ) {

      return {
        ok:
          false,

        mensaje:
          "Conecte Deriv DEMO antes de activar la ejecución."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok:
          false,

        mensaje:
          "La cuenta no está verificada como DEMO."
      };

    }


    this.ejecucionActiva =
      true;


    /*
      Dejamos preparado el stream
      de transacciones como respaldo.
    */

    this.asegurarTransactionStream();


    return {
      ok:
        true,

      mensaje:
        "Ejecución DEMO activada."
    };

  }


  /* ========================================
     DESACTIVAR
     ======================================== */

  desactivar() {

    this.ejecucionActiva =
      false;


    return {
      ok:
        true,

      mensaje:
        "Ejecución DEMO desactivada."
    };

  }


  /* ========================================
     VALIDAR COMPRA
     ======================================== */

  puedeComprar() {

    const estado =
      derivConnection
        .obtenerEstado();


    if (
      !this.ejecucionActiva
    ) {

      return {
        ok:
          false,

        motivo:
          "Ejecución DEMO desactivada."
      };

    }


    if (
      !estado.connected
    ) {

      return {
        ok:
          false,

        motivo:
          "Deriv DEMO no está conectado."
      };

    }


    if (
      !estado.demoVerified
    ) {

      return {
        ok:
          false,

        motivo:
          "Cuenta no verificada como DEMO."
      };

    }


    if (
      this.operacionActiva
    ) {

      return {
        ok:
          false,

        motivo:
          "Ya existe una operación DEMO activa."
      };

    }


    return {
      ok:
        true
    };

  }


  /* ========================================
     PROCESAR MENSAJES WEBSOCKET
     ======================================== */

  procesarMensaje(
    datos
  ) {

    if (
      !datos ||
      typeof datos !==
        "object"
    ) {

      return;

    }


    const reqId =
      datos.req_id;


    /* --------------------------------------
       RESPUESTA A SOLICITUD
       -------------------------------------- */

    if (
      reqId &&
      this.pendientes.has(
        reqId
      )
    ) {

      const pendiente =
        this.pendientes.get(
          reqId
        );


      this.pendientes.delete(
        reqId
      );


      clearTimeout(
        pendiente.timeout
      );


      if (
        datos.error
      ) {

        pendiente.resolve({

          ok:
            false,

          error:
            datos.error.message ||
            datos.error.code ||
            "Deriv rechazó la solicitud.",

          code:
            datos.error.code ??
            null

        });

      } else {

        pendiente.resolve({

          ok:
            true,

          datos

        });

      }

    }


    /* --------------------------------------
       RESPALDO TRANSACTION
       -------------------------------------- */

    if (
      datos.transaction
    ) {

      if (
        datos.subscription?.id &&
        !this.transactionSubscriptionId
      ) {

        this.transactionSubscriptionId =
          datos.subscription.id;

        this.transactionStreamSolicitado =
          true;

      }


      this.procesarTransaccion(
        datos.transaction
      );

    }


    /* --------------------------------------
       RESPALDO PROPOSAL OPEN CONTRACT
       -------------------------------------- */

    const contrato =
      datos.proposal_open_contract;


    if (
      !contrato
    ) {

      return;

    }


    const contractId =
      String(
        contrato.contract_id ??
        ""
      );


    if (
      !contractId ||
      !this.seguimientos.has(
        contractId
      )
    ) {

      return;

    }


    const seguimiento =
      this.seguimientos.get(
        contractId
      );


    seguimiento.ultimoContrato =
      contrato;


    this.notificarActualizacion(
      seguimiento,
      contrato
    );


    if (
      this.estaCerrado(
        contrato
      )
    ) {

      this.finalizarDesdeContrato(
        contractId,
        contrato
      );

    }

  }


  /* ========================================
     PROCESAR TRANSACTION
     ======================================== */

  procesarTransaccion(
    transaccion
  ) {

    const contractId =
      String(
        transaccion?.contract_id ??
        ""
      );


    if (
      !contractId ||
      !this.seguimientos.has(
        contractId
      )
    ) {

      return;

    }


    const action =
      String(
        transaccion?.action ??
        transaccion?.transaction_type ??
        transaccion?.type ??
        ""
      )
        .trim()
        .toLowerCase();


    const esCierre =
      [
        "sell",
        "sold",
        "payout",
        "settlement",
        "contract_sold"
      ].includes(
        action
      ) ||
      (
        transaccion?.sell_price !==
          undefined &&
        transaccion?.sell_price !==
          null
      );


    if (
      !esCierre
    ) {

      return;

    }


    this.finalizarDesdeTransaccion(
      contractId,
      transaccion
    );

  }


  /* ========================================
     ACTUALIZACIÓN VISUAL
     ======================================== */

  notificarActualizacion(
    seguimiento,
    contrato
  ) {

    if (
      typeof seguimiento?.onUpdate ===
        "function"
    ) {

      try {

        seguimiento.onUpdate(
          contrato
        );

      } catch {}

    }

  }


  /* ========================================
     DETECTAR CONTRATO CERRADO
     ======================================== */

  estaCerrado(
    contrato
  ) {

    const status =
      String(
        contrato?.status ??
        ""
      )
        .trim()
        .toLowerCase();


    return (

      Number(
        contrato?.is_sold ??
        0
      ) === 1 ||

      contrato?.is_sold ===
        true ||

      Number(
        contrato?.is_expired ??
        0
      ) === 1 ||

      contrato?.is_expired ===
        true ||

      [
        "won",
        "lost",
        "sold",
        "expired",
        "cancelled",
        "canceled"
      ].includes(
        status
      )

    );

  }


  /* ========================================
     SOLICITUD GENÉRICA
     ======================================== */

  solicitar(
    payload,
    timeoutMs = 10000
  ) {

    const reqId =
      this.siguienteReqId();


    const solicitud = {

      ...payload,

      req_id:
        reqId

    };


    return new Promise(
      (resolve) => {

        const timeout =
          setTimeout(
            () => {

              this.pendientes.delete(
                reqId
              );


              resolve({

                ok:
                  false,

                error:
                  "Deriv no respondió dentro del tiempo esperado."

              });

            },
            timeoutMs
          );


        this.pendientes.set(
          reqId,
          {
            timeout,
            resolve
          }
        );


        const envio =
          derivConnection.enviar(
            solicitud
          );


        if (
          !envio.ok
        ) {

          clearTimeout(
            timeout
          );


          this.pendientes.delete(
            reqId
          );


          resolve({

            ok:
              false,

            error:
              envio.mensaje

          });

        }

      }
    );

  }


  /* ========================================
     TRANSACTION STREAM
     RESPALDO
     ======================================== */

  asegurarTransactionStream() {

    if (
      this.transactionStreamSolicitado ||
      this.transactionSubscriptionId
    ) {

      return;

    }


    const estado =
      derivConnection
        .obtenerEstado();


    if (
      !estado.connected
    ) {

      return;

    }


    this.transactionStreamSolicitado =
      true;


    const envio =
      derivConnection.enviar({

        transaction:
          1,

        subscribe:
          1

      });


    if (
      !envio.ok
    ) {

      this.transactionStreamSolicitado =
        false;

    }

  }


  /* ========================================
     BUY DEMO
     ======================================== */

  async comprar(
    propuestaDeriv
  ) {

    const permiso =
      this.puedeComprar();


    if (
      !permiso.ok
    ) {

      return {

        ok:
          false,

        error:
          permiso.motivo

      };

    }


    if (
      !propuestaDeriv?.ok ||
      !propuestaDeriv?.id
    ) {

      return {

        ok:
          false,

        error:
          "No existe una propuesta Deriv válida para comprar."

      };

    }


    const precio =
      Number(
        propuestaDeriv.askPrice
      );


    if (
      !Number.isFinite(
        precio
      ) ||
      precio <= 0
    ) {

      return {

        ok:
          false,

        error:
          "Precio de propuesta inválido."

      };

    }


    /*
      Preparar stream antes del BUY.
    */

    this.asegurarTransactionStream();


    const respuesta =
      await this.solicitar(
        {

          buy:
            String(
              propuestaDeriv.id
            ),

          price:
            precio

        }
      );


    if (
      !respuesta.ok
    ) {

      return respuesta;

    }


    const compra =
      respuesta.datos?.buy;


    if (
      !compra?.contract_id
    ) {

      return {

        ok:
          false,

        error:
          "Deriv respondió sin contract_id."

      };

    }


    this.operacionActiva = {

      contractId:
        String(
          compra.contract_id
        ),

      transactionId:
        compra.transaction_id ??
        null,

      buyPrice:
        Number(
          compra.buy_price ??
          precio
        ),

      payout:
        Number(
          compra.payout ??
          0
        ),

      longcode:
        compra.longcode ??
        "",

      purchaseTime:
        compra.purchase_time ??
        null,

      startedAt:
        Date.now()

    };


    return {

      ok:
        true,

      compra:
        {
          ...this.operacionActiva
        }

    };

  }


  /* ========================================
     NORMALIZAR RESULTADO
     PROPOSAL OPEN CONTRACT
     ======================================== */

  normalizarResultadoContrato(
    contrato
  ) {

    const buyPrice =
      Number(
        contrato?.buy_price ??
        this.operacionActiva?.buyPrice ??
        0
      );


    const profit =
      Number(
        contrato?.profit ??
        0
      );


    const sellPrice =
      Number(
        contrato?.sell_price ??
        (
          buyPrice +
          profit
        )
      );


    return {

      contractId:
        String(
          contrato?.contract_id ??
          this.operacionActiva?.contractId ??
          ""
        ),

      status:
        profit > 0
          ? "WON"
          : "LOST",

      profit,

      buyPrice,

      sellPrice,

      payout:
        Number(
          contrato?.payout ??
          sellPrice
        ),

      source:
        "proposal_open_contract",

      raw:
        contrato

    };

  }


  /* ========================================
     NORMALIZAR RESULTADO
     TRANSACTION
     ======================================== */

  normalizarResultadoTransaccion(
    transaccion
  ) {

    const buyPrice =
      Number(
        this.operacionActiva?.buyPrice ??
        0
      );


    const sellPrice =
      Number(
        transaccion?.sell_price ??
        transaccion?.amount ??
        transaccion?.payout ??
        0
      );


    let profit =
      Number(
        transaccion?.profit ??
        NaN
      );


    if (
      !Number.isFinite(
        profit
      )
    ) {

      profit =
        sellPrice -
        buyPrice;

    }


    return {

      contractId:
        String(
          transaccion?.contract_id ??
          this.operacionActiva?.contractId ??
          ""
        ),

      status:
        profit > 0
          ? "WON"
          : "LOST",

      profit,

      buyPrice,

      sellPrice,

      payout:
        sellPrice,

      source:
        "transaction",

      raw:
        transaccion

    };

  }


  /* ========================================
     NORMALIZAR PROFIT TABLE
     ======================================== */

  normalizarResultadoProfitTable(
    item
  ) {

    const buyPrice =
      Math.abs(
        Number(
          item?.buy_price ??
          this.operacionActiva?.buyPrice ??
          0
        )
      );


    const sellPrice =
      Number(
        item?.sell_price ??
        item?.payout ??
        0
      );


    let profit =
      Number(
        item?.profit ??
        NaN
      );


    if (
      !Number.isFinite(
        profit
      )
    ) {

      profit =
        sellPrice -
        buyPrice;

    }


    return {

      contractId:
        String(
          item?.contract_id ??
          this.operacionActiva?.contractId ??
          ""
        ),

      status:
        profit > 0
          ? "WON"
          : "LOST",

      profit,

      buyPrice,

      sellPrice,

      payout:
        sellPrice,

      source:
        "profit_table",

      raw:
        item

    };

  }


  /* ========================================
     CONSULTAR PORTFOLIO
     ======================================== */

  async consultarPortfolio() {

    const respuesta =
      await this.solicitar(
        {
          portfolio:
            1
        },
        8000
      );


    if (
      !respuesta.ok
    ) {

      return respuesta;

    }


    const contratos =
      Array.isArray(
        respuesta.datos
          ?.portfolio
          ?.contracts
      )
        ? respuesta.datos
            .portfolio
            .contracts
        : [];


    return {

      ok:
        true,

      contratos

    };

  }


  /* ========================================
     BUSCAR EN PORTFOLIO
     ======================================== */

  buscarContratoEnPortfolio(
    contratos,
    contractId
  ) {

    const buscado =
      String(
        contractId
      );


    return (
      contratos.find(
        (item) =>

          String(
            item?.contract_id ??
            ""
          ) === buscado

      ) ??
      null
    );

  }


  /* ========================================
     CONSULTAR PROFIT TABLE
     ======================================== */

  async consultarProfitTable(
    contractId
  ) {

    const respuesta =
      await this.solicitar(
        {

          profit_table:
            1,

          description:
            1,

          limit:
            100,

          offset:
            0,

          sort:
            "DESC"

        },
        8000
      );


    if (
      !respuesta.ok
    ) {

      return respuesta;

    }


    const lista =
      Array.isArray(
        respuesta.datos
          ?.profit_table
          ?.transactions
      )
        ? respuesta.datos
            .profit_table
            .transactions
        : [];


    const buscado =
      String(
        contractId
      );


    const encontrada =
      lista.find(
        (item) =>

          String(
            item?.contract_id ??
            ""
          ) === buscado

      ) ??
      null;


    return {

      ok:
        true,

      encontrada,

      lista

    };

  }


  /* ========================================
     CONSULTAR OPEN CONTRACT
     RESPALDO
     ======================================== */

  async consultarContrato(
    contractId
  ) {

    return this.solicitar(
      {

        proposal_open_contract:
          1,

        contract_id:
          Number.isFinite(
            Number(
              contractId
            )
          )
            ? Number(
                contractId
              )
            : contractId

      },
      8000
    );

  }


  /* ========================================
     LIMPIAR SEGUIMIENTO
     ======================================== */

  limpiarSeguimiento(
    contractId
  ) {

    const seguimiento =
      this.seguimientos.get(
        contractId
      );


    if (
      !seguimiento
    ) {

      return null;

    }


    this.seguimientos.delete(
      contractId
    );


    clearTimeout(
      seguimiento.timeout
    );


    clearInterval(
      seguimiento.timer
    );


    if (
      seguimiento.subscriptionId
    ) {

      derivConnection.enviar({

        forget:
          seguimiento.subscriptionId

      });

    }


    return seguimiento;

  }


  /* ========================================
     FINALIZAR
     ======================================== */

  finalizar(
    contractId,
    resultado
  ) {

    const seguimiento =
      this.limpiarSeguimiento(
        contractId
      );


    if (
      !seguimiento
    ) {

      return;

    }


    this.ultimoResultado =
      resultado;


    this.operacionActiva =
      null;


    seguimiento.resolve({

      ok:
        true,

      resultado

    });

  }


  /* ========================================
     FINALIZAR DESDE CONTRATO
     ======================================== */

  finalizarDesdeContrato(
    contractId,
    contrato
  ) {

    this.finalizar(
      contractId,
      this.normalizarResultadoContrato(
        contrato
      )
    );

  }


  /* ========================================
     FINALIZAR DESDE TRANSACTION
     ======================================== */

  finalizarDesdeTransaccion(
    contractId,
    transaccion
  ) {

    this.finalizar(
      contractId,
      this.normalizarResultadoTransaccion(
        transaccion
      )
    );

  }


  /* ========================================
     FINALIZAR DESDE PROFIT TABLE
     ======================================== */

  finalizarDesdeProfitTable(
    contractId,
    item
  ) {

    this.finalizar(
      contractId,
      this.normalizarResultadoProfitTable(
        item
      )
    );

  }


  /* ========================================
     INTERRUMPIR SEGUIMIENTOS
     ======================================== */

  interrumpirSeguimientos(
    motivo
  ) {

    for (
      const contractId
      of Array.from(
        this.seguimientos.keys()
      )
    ) {

      const seguimiento =
        this.limpiarSeguimiento(
          contractId
        );


      if (
        seguimiento
      ) {

        seguimiento.resolve({

          ok:
            false,

          error:
            motivo ||
            "Seguimiento interrumpido.",

          contractId

        });

      }

    }


    this.operacionActiva =
      null;

  }


  /* ========================================
     ESPERAR RESULTADO FIX6

     FUENTE PRINCIPAL:

     PORTFOLIO
     +
     PROFIT TABLE
     ======================================== */

  async esperarResultado(
    contractId,
    {
      timeoutMs = 90000,
      intervalMs = 1200,
      onUpdate = null
    } = {}
  ) {

    const id =
      String(
        contractId
      );


    if (
      !id
    ) {

      return {

        ok:
          false,

        error:
          "Falta contract_id para seguimiento."

      };

    }


    if (
      this.seguimientos.has(
        id
      )
    ) {

      return {

        ok:
          false,

        error:
          "Ese contrato ya está siendo seguido."

      };

    }


    return new Promise(
      (resolve) => {

        const seguimiento = {

          resolve,

          onUpdate,

          subscriptionId:
            null,

          ultimoContrato:
            null,

          consultando:
            false,

          vistoAbierto:
            false,

          desaparecioDePortfolio:
            false,

          timer:
            null,

          timeout:
            null

        };


        this.seguimientos.set(
          id,
          seguimiento
        );


        /*
          RESPALDO TRANSACTION
        */

        this.asegurarTransactionStream();


        /*
          RESPALDO
          PROPOSAL OPEN CONTRACT
        */

        derivConnection.enviar({

          proposal_open_contract:
            1,

          contract_id:
            Number.isFinite(
              Number(
                id
              )
            )
              ? Number(
                  id
                )
              : id,

          subscribe:
            1

        });


        /* ==================================
           CICLO PRINCIPAL
           ================================== */

        const ciclo =
          async () => {

            if (
              !this.seguimientos.has(
                id
              ) ||
              seguimiento.consultando
            ) {

              return;

            }


            seguimiento.consultando =
              true;


            try {

              /* ==============================
                 PASO 1
                 PORTFOLIO
                 ============================== */

              const portfolio =
                await this.consultarPortfolio();


              if (
                portfolio.ok
              ) {

                const abierto =
                  this.buscarContratoEnPortfolio(
                    portfolio.contratos,
                    id
                  );


                if (
                  abierto
                ) {

                  seguimiento.vistoAbierto =
                    true;


                  seguimiento.ultimoContrato =
                    abierto;


                  if (
                    typeof onUpdate ===
                      "function"
                  ) {

                    try {

                      onUpdate({

                        ...abierto,

                        status:
                          "open",

                        is_sold:
                          0

                      });

                    } catch {}

                  }

                }


                else if (
                  seguimiento.vistoAbierto
                ) {

                  seguimiento.desaparecioDePortfolio =
                    true;

                }

              }


              /* ==============================
                 PASO 2
                 PROFIT TABLE

                 FUENTE PRINCIPAL DE CIERRE
                 ============================== */

              const tabla =
                await this.consultarProfitTable(
                  id
                );


              if (
                tabla.ok &&
                tabla.encontrada
              ) {

                this.finalizarDesdeProfitTable(
                  id,
                  tabla.encontrada
                );

                return;

              }


              /* ==============================
                 PASO 3
                 OPEN CONTRACT
                 RESPALDO
                 ============================== */

              const open =
                await this.consultarContrato(
                  id
                );


              const contrato =
                open.ok
                  ? open.datos
                      ?.proposal_open_contract
                  : null;


              if (
                contrato
              ) {

                seguimiento.ultimoContrato =
                  contrato;


                if (
                  typeof onUpdate ===
                    "function"
                ) {

                  try {

                    onUpdate(
                      contrato
                    );

                  } catch {}

                }


                if (
                  this.estaCerrado(
                    contrato
                  )
                ) {

                  this.finalizarDesdeContrato(
                    id,
                    contrato
                  );

                  return;

                }

              }

            } catch (
              error
            ) {

              console.warn(
                "Seguimiento FIX6:",
                error
              );

            } finally {

              seguimiento.consultando =
                false;

            }

          };


        /* ==================================
           INTERVALO
           ================================== */

        seguimiento.timer =
          setInterval(
            ciclo,
            intervalMs
          );


        /* ==================================
           TIMEOUT DE SEGURIDAD
           ================================== */

        seguimiento.timeout =
          setTimeout(
            async () => {

              /*
                Última búsqueda en Profit Table.
              */

              try {

                const tabla =
                  await this.consultarProfitTable(
                    id
                  );


                if (
                  tabla.ok &&
                  tabla.encontrada
                ) {

                  this.finalizarDesdeProfitTable(
                    id,
                    tabla.encontrada
                  );

                  return;

                }

              } catch {}


              const limpio =
                this.limpiarSeguimiento(
                  id
                );


              if (
                limpio
              ) {

                this.operacionActiva =
                  null;


                limpio.resolve({

                  ok:
                    false,

                  error:
                    "No se pudo confirmar el resultado en el histórico de Deriv dentro del tiempo de seguridad.",

                  contractId:
                    id,

                  desaparecioDePortfolio:
                    limpio.desaparecioDePortfolio,

                  ultimoContrato:
                    limpio.ultimoContrato

                });

              }

            },
            timeoutMs
          );


        /*
          Primera comprobación inmediata.
        */

        ciclo();

      }
    );

  }


  /* ========================================
     ESTADO ACTUAL
     ======================================== */

  obtenerEstado() {

    return {

      ejecucionActiva:
        this.ejecucionActiva,

      operacionActiva:
        this.operacionActiva
          ? {
              ...this.operacionActiva
            }
          : null,

      ultimoResultado:
        this.ultimoResultado
          ? {
              ...this.ultimoResultado
            }
          : null,

      contratosEnSeguimiento:
        this.seguimientos.size

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const derivTrade =
  new DerivTrade();
