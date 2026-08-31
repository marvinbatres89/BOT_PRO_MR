/* ==========================================
   BOT V1 MR
   SIMULADOR DE PROPUESTAS
   FIX6
   FASE SEGURA - SIN DINERO REAL
   ========================================== */

class ProposalSimulator {

  constructor() {

    this.ultimaPropuesta =
      null;

    this.historial =
      [];

    this.maxHistorial =
      30;

  }


  /* ========================================
     CREAR IDENTIFICADOR
     ======================================== */

  crearId() {

    return `SIM-${Date.now()}-${Math.floor(
      Math.random() * 100000
    )}`;

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
          "Falta tipo de contrato."
      };

    }


    if (
      contrato.confidence !==
        undefined &&
      (
        Number(
          contrato.confidence
        ) < 0 ||
        Number(
          contrato.confidence
        ) > 100
      )
    ) {

      return {
        ok:
          false,

        error:
          "Confianza inválida."
      };

    }


    return {
      ok:
        true
    };

  }


  /* ========================================
     CREAR PROPUESTA SIMULADA
     ======================================== */

  crearPropuesta(
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

      return {
        ok:
          false,

        error:
          validacion.error
      };

    }


    const monto =
      Number(
        opciones.monto ??
        1
      );


    if (
      !Number.isFinite(
        monto
      ) ||
      monto <= 0
    ) {

      return {
        ok:
          false,

        error:
          "Monto inválido."
      };

    }


    const moneda =
      String(
        opciones.moneda ??
        "USD"
      )
        .toUpperCase();


    const duracion =
      Number(
        opciones.duracion ??
        1
      );


    if (
      !Number.isFinite(
        duracion
      ) ||
      duracion <= 0
    ) {

      return {
        ok:
          false,

        error:
          "Duración inválida."
      };

    }


    const unidadDuracion =
      String(
        opciones.unidadDuracion ??
        "t"
      );


    const propuesta = {

      ok:
        true,

      id:
        this.crearId(),

      modo:
        "SIMULACION",

      symbol:
        contrato.symbol,

      strategy:
        contrato.strategy,

      direction:
        contrato.direction,

      contractType:
        contrato.contractType,

      barrier:
        contrato.barrier ??
        null,

      confidence:
        Number(
          contrato.confidence ??
          0
        ),

      sourceSignalId:
        contrato.sourceSignalId,

      executionSecond:
        contrato.executionSecond,

      amount:
        monto,

      currency:
        moneda,

      duration:
        duracion,

      durationUnit:
        unidadDuracion,

      status:
        "PROPUESTA_SIMULADA",

      createdAt:
        Date.now()

    };


    this.ultimaPropuesta =
      propuesta;


    this.historial.unshift(
      propuesta
    );


    if (
      this.historial.length >
      this.maxHistorial
    ) {

      this.historial.length =
        this.maxHistorial;

    }


    return propuesta;

  }


  /* ========================================
     OBTENER ÚLTIMA PROPUESTA
     ======================================== */

  obtenerUltimaPropuesta() {

    return this.ultimaPropuesta;

  }


  /* ========================================
     OBTENER HISTORIAL
     ======================================== */

  obtenerHistorial() {

    return [
      ...this.historial
    ];

  }


  /* ========================================
     LIMPIAR
     ======================================== */

  limpiar() {

    this.ultimaPropuesta =
      null;

    this.historial =
      [];

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const proposalSimulator =
  new ProposalSimulator();
