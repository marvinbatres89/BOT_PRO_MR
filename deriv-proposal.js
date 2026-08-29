/* ==========================================
   BOT V1 MR
   DERIV PROPOSAL
   FIX13.2 - DIAGNÓSTICO DE PROPUESTA

   CONSERVA:
   - PROPUESTAS REALES DERIV DEMO
   - underlying_symbol
   - NO COMPRA CONTRATOS
   - NO USA BUY

   AGREGA:
   - CÓDIGO EXACTO DE ERROR DERIV
   - MENSAJE EXACTO DE ERROR
   - DETALLES DEL ERROR
   - SOLICITUD ENVIADA
   - DIAGNÓSTICO EN CONSOLA

   OBJETIVO:
   IDENTIFICAR EXACTAMENTE POR QUÉ
   DERIV RECHAZA UNA PROPUESTA.
   ========================================== */

import {
  derivConnection
} from "./deriv-connection.js";


class DerivProposal {

  constructor() {

    this.reqId =
      1000;

    this.pendientes =
      new Map();

    this.ultimaPropuesta =
      null;

    this.ultimoError =
      null;

    this.ultimaSolicitud =
      null;


    derivConnection.on(
      "message",
      (datos) => {

        this.procesarRespuesta(
          datos
        );

      }
    );

  }


  /* ========================================
     REQUEST ID
     ======================================== */

  siguienteReqId() {

    this.reqId +=
      1;

    return this.reqId;

  }


  /* ========================================
     PROCESAR RESPUESTA DERIV
     ======================================== */

  procesarRespuesta(
    datos
  ) {

    if (
      !datos ||
      typeof datos !== "object"
    ) {

      return;

    }


    const reqId =
      datos.req_id;


    if (
      !reqId ||
      !this.pendientes.has(
        reqId
      )
    ) {

      return;

    }


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


    /* ======================================
       ERROR REAL DEVUELTO POR DERIV
       ====================================== */

    if (
      datos.error
    ) {

      const errorDeriv =
        datos.error ||
        {};


      const codigo =
        errorDeriv.code ||
        "DERIV_ERROR";


      const mensaje =
        errorDeriv.message ||
        "Deriv rechazó la propuesta.";


      const detalles =
        errorDeriv.details ??
        null;


      const diagnostico = {

        ok:
          false,

        tipo:
          "PROPUESTA_RECHAZADA",

        reqId,

        code:
          codigo,

        errorCode:
          codigo,

        message:
          mensaje,

        error:
          mensaje,

        details:
          detalles,

        solicitud:
          pendiente.solicitud
            ? {
                ...pendiente.solicitud
              }
            : null,

        rawError:
          errorDeriv,

        raw:
          datos,

        receivedAt:
          Date.now()

      };


      this.ultimoError =
        diagnostico;


      console.error(
        "=========================================="
      );

      console.error(
        "BOT V1 MR · PROPUESTA RECHAZADA POR DERIV"
      );

      console.error(
        "Código:",
        codigo
      );

      console.error(
        "Mensaje:",
        mensaje
      );

      console.error(
        "Detalles:",
        detalles
      );

      console.error(
        "Solicitud enviada:",
        pendiente.solicitud
      );

      console.error(
        "Respuesta completa:",
        datos
      );

      console.error(
        "=========================================="
      );


      pendiente.resolve(
        diagnostico
      );


      return;

    }


    /* ======================================
       PROPUESTA CORRECTA
       ====================================== */

    if (
      datos.proposal
    ) {

      const propuesta = {

        ok:
          true,

        modo:
          "DERIV_DEMO_REAL",

        reqId,

        id:
          datos.proposal.id ??
          null,

        askPrice:
          Number(
            datos.proposal.ask_price ??
            0
          ),

        payout:
          Number(
            datos.proposal.payout ??
            0
          ),

        spot:
          datos.proposal.spot ??
          null,

        spotTime:
          datos.proposal.spot_time ??
          null,

        longcode:
          datos.proposal.longcode ??
          "",

        displayValue:
          datos.proposal.display_value ??
          null,

        solicitud:
          pendiente.solicitud
            ? {
                ...pendiente.solicitud
              }
            : null,

        raw:
          datos.proposal,

        receivedAt:
          Date.now()

      };


      this.ultimaPropuesta =
        propuesta;


      this.ultimoError =
        null;


      console.log(
        "BOT V1 MR · PROPUESTA DERIV ACEPTADA",
        {
          reqId,
          id:
            propuesta.id,
          askPrice:
            propuesta.askPrice,
          payout:
            propuesta.payout,
          spot:
            propuesta.spot
        }
      );


      pendiente.resolve(
        propuesta
      );


      return;

    }


    /* ======================================
       RESPUESTA SIN PROPUESTA
       ====================================== */

    const diagnostico = {

      ok:
        false,

      tipo:
        "RESPUESTA_SIN_PROPUESTA",

      reqId,

      code:
        "NO_PROPOSAL",

      errorCode:
        "NO_PROPOSAL",

      message:
        "Deriv respondió sin una propuesta válida.",

      error:
        "Deriv respondió sin una propuesta válida.",

      details:
        null,

      solicitud:
        pendiente.solicitud
          ? {
              ...pendiente.solicitud
            }
          : null,

      raw:
        datos,

      receivedAt:
        Date.now()

    };


    this.ultimoError =
      diagnostico;


    console.error(
      "BOT V1 MR · RESPUESTA SIN PROPUESTA",
      diagnostico
    );


    pendiente.resolve(
      diagnostico
    );

  }


  /* ========================================
     VALIDAR CONTRATO
     ======================================== */

  validarContrato(
    contrato
  ) {

    if (
      !contrato
    ) {

      return {

        ok:
          false,

        error:
          "No existe contrato."

      };

    }


    if (
      !contrato.symbol
    ) {

      return {

        ok:
          false,

        error:
          "Falta mercado."

      };

    }


    if (
      !contrato.contractType
    ) {

      return {

        ok:
          false,

        error:
          "Falta contractType."

      };

    }


    return {

      ok:
        true

    };

  }


  /* ========================================
     CONSTRUIR SOLICITUD
     ======================================== */

  construirSolicitud(
    contrato,
    opciones = {}
  ) {

    const monto =
      Number(
        opciones.monto ??
        1
      );


    const moneda =
      String(
        opciones.moneda ??
        "USD"
      )
        .trim()
        .toUpperCase();


    const duracion =
      Number(
        opciones.duracion ??
        1
      );


    const unidadDuracion =
      String(
        opciones.unidadDuracion ??
        "t"
      )
        .trim()
        .toLowerCase();


    if (
      !Number.isFinite(
        monto
      ) ||
      monto <= 0
    ) {

      throw new Error(
        "Monto inválido."
      );

    }


    if (
      !Number.isFinite(
        duracion
      ) ||
      duracion <= 0
    ) {

      throw new Error(
        "Duración inválida."
      );

    }


    const reqId =
      this.siguienteReqId();


    /*
      IMPORTANTE:

      Se conserva underlying_symbol.

      No cambiamos este parámetro durante
      esta prueba diagnóstica porque el
      objetivo es obtener el error EXACTO
      que está devolviendo Deriv.
    */

    const solicitud = {

      proposal:
        1,

      amount:
        monto,

      basis:
        "stake",

      contract_type:
        String(
          contrato.contractType
        )
          .trim()
          .toUpperCase(),

      currency:
        moneda,

      duration:
        duracion,

      duration_unit:
        unidadDuracion,

      underlying_symbol:
        String(
          contrato.symbol
        )
          .trim(),

      req_id:
        reqId

    };


    /* ======================================
       BARRERA SOLO CUANDO EXISTE
       ====================================== */

    if (
      contrato.barrier !==
        null &&
      contrato.barrier !==
        undefined &&
      contrato.barrier !==
        ""
    ) {

      solicitud.barrier =
        String(
          contrato.barrier
        );

    }


    this.ultimaSolicitud =
      {
        ...solicitud
      };


    console.log(
      "BOT V1 MR · SOLICITUD PROPOSAL",
      {
        reqId:
          solicitud.req_id,

        mercado:
          solicitud.underlying_symbol,

        contrato:
          solicitud.contract_type,

        monto:
          solicitud.amount,

        moneda:
          solicitud.currency,

        duracion:
          solicitud.duration,

        unidad:
          solicitud.duration_unit,

        barrier:
          solicitud.barrier ??
          null
      }
    );


    return solicitud;

  }


  /* ========================================
     SOLICITAR PROPUESTA
     ======================================== */

  async solicitar(
    contrato,
    opciones = {}
  ) {

    const validacion =
      this.validarContrato(
        contrato
      );


    if (
      !validacion.ok
    ) {

      const resultado = {

        ok:
          false,

        tipo:
          "VALIDACION_CONTRATO",

        code:
          "INVALID_CONTRACT",

        errorCode:
          "INVALID_CONTRACT",

        message:
          validacion.error,

        error:
          validacion.error

      };


      this.ultimoError =
        resultado;


      return resultado;

    }


    const estado =
      derivConnection
        .obtenerEstado();


    if (
      !estado.connected
    ) {

      const resultado = {

        ok:
          false,

        tipo:
          "SIN_CONEXION",

        code:
          "NOT_CONNECTED",

        errorCode:
          "NOT_CONNECTED",

        message:
          "Deriv DEMO no está conectado.",

        error:
          "Deriv DEMO no está conectado."

      };


      this.ultimoError =
        resultado;


      return resultado;

    }


    if (
      !estado.demoVerified
    ) {

      const resultado = {

        ok:
          false,

        tipo:
          "CUENTA_NO_DEMO",

        code:
          "DEMO_NOT_VERIFIED",

        errorCode:
          "DEMO_NOT_VERIFIED",

        message:
          "La cuenta no está verificada como DEMO.",

        error:
          "La cuenta no está verificada como DEMO."

      };


      this.ultimoError =
        resultado;


      return resultado;

    }


    let solicitud;


    try {

      solicitud =
        this.construirSolicitud(
          contrato,
          opciones
        );

    }

    catch (
      error
    ) {

      const resultado = {

        ok:
          false,

        tipo:
          "ERROR_CONSTRUCCION",

        code:
          "REQUEST_BUILD_ERROR",

        errorCode:
          "REQUEST_BUILD_ERROR",

        message:
          error?.message ||
          "No se pudo construir la propuesta.",

        error:
          error?.message ||
          "No se pudo construir la propuesta."

      };


      this.ultimoError =
        resultado;


      return resultado;

    }


    return new Promise(
      (resolve) => {

        const reqId =
          solicitud.req_id;


        const timeout =
          setTimeout(
            () => {

              this.pendientes.delete(
                reqId
              );


              const resultado = {

                ok:
                  false,

                tipo:
                  "TIMEOUT",

                reqId,

                code:
                  "PROPOSAL_TIMEOUT",

                errorCode:
                  "PROPOSAL_TIMEOUT",

                message:
                  "Deriv no respondió a la propuesta dentro del tiempo esperado.",

                error:
                  "Deriv no respondió a la propuesta dentro del tiempo esperado.",

                solicitud:
                  {
                    ...solicitud
                  },

                receivedAt:
                  Date.now()

              };


              this.ultimoError =
                resultado;


              console.error(
                "BOT V1 MR · TIMEOUT PROPUESTA",
                resultado
              );


              resolve(
                resultado
              );

            },
            10000
          );


        this.pendientes.set(
          reqId,
          {

            timeout,

            solicitud:
              {
                ...solicitud
              },

            resolve:
              (resultado) => {

                resolve(
                  resultado
                );

              }

          }
        );


        const envio =
          derivConnection.enviar(
            solicitud
          );


        if (
          !envio?.ok
        ) {

          clearTimeout(
            timeout
          );


          this.pendientes.delete(
            reqId
          );


          const resultado = {

            ok:
              false,

            tipo:
              "ERROR_ENVIO",

            reqId,

            code:
              "SEND_ERROR",

            errorCode:
              "SEND_ERROR",

            message:
              envio?.mensaje ||
              "No se pudo enviar la propuesta a Deriv.",

            error:
              envio?.mensaje ||
              "No se pudo enviar la propuesta a Deriv.",

            solicitud:
              {
                ...solicitud
              },

            receivedAt:
              Date.now()

          };


          this.ultimoError =
            resultado;


          console.error(
            "BOT V1 MR · ERROR ENVIANDO PROPUESTA",
            resultado
          );


          resolve(
            resultado
          );

        }

      }
    );

  }


  /* ========================================
     OBTENER ÚLTIMA PROPUESTA
     ======================================== */

  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

  }


  /* ========================================
     OBTENER ÚLTIMO ERROR
     ======================================== */

  obtenerUltimoError() {

    return this.ultimoError;

  }


  /* ========================================
     OBTENER ÚLTIMA SOLICITUD
     ======================================== */

  obtenerUltimaSolicitud() {

    return this.ultimaSolicitud;

  }


  /* ========================================
     ESTADO DIAGNÓSTICO
     ======================================== */

  obtenerEstado() {

    return {

      version:
        "FIX13.2-DIAGNOSTICO",

      ultimaPropuesta:
        this.ultimaPropuesta,

      ultimoError:
        this.ultimoError,

      ultimaSolicitud:
        this.ultimaSolicitud,

      pendientes:
        this.pendientes.size

    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const derivProposal =
  new DerivProposal();
