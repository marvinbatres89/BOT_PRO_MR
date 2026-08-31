/* ==========================================
   BOT V1 MR
   TRADUCTOR DE SEÑALES A CONTRATOS DERIV
   FIX6
   ========================================== */

class ContractMapper {

  /* ========================================
     NORMALIZAR TEXTO
     ======================================== */

  normalizar(valor) {

    return String(valor || "")
      .trim()
      .toUpperCase();

  }


  /* ========================================
     RISE / FALL
     ======================================== */

  mapearRiseFall(direccion) {

    const valor =
      this.normalizar(direccion);


    if (
      valor === "RISE" ||
      valor === "SUBE" ||
      valor === "UP"
    ) {

      return {
        contractType:
          "CALL",

        barrier:
          null
      };

    }


    if (
      valor === "FALL" ||
      valor === "BAJA" ||
      valor === "DOWN"
    ) {

      return {
        contractType:
          "PUT",

        barrier:
          null
      };

    }


    return null;

  }


  /* ========================================
     PAR / IMPAR
     ======================================== */

  mapearParImpar(direccion) {

    const valor =
      this.normalizar(direccion);


    if (
      valor === "EVEN" ||
      valor === "PAR"
    ) {

      return {
        contractType:
          "DIGITEVEN",

        barrier:
          null
      };

    }


    if (
      valor === "ODD" ||
      valor === "IMPAR"
    ) {

      return {
        contractType:
          "DIGITODD",

        barrier:
          null
      };

    }


    return null;

  }


  /* ========================================
     MÁS / MENOS
     ======================================== */

  mapearOverUnder(
    direccion,
    metadata = {}
  ) {

    const valor =
      this.normalizar(
        direccion
      );


    const barrier =
      Number(
        metadata.barrier ??
        metadata.digit ??
        metadata.numero
      );


    if (
      !Number.isInteger(
        barrier
      ) ||
      barrier < 0 ||
      barrier > 9
    ) {

      return {
        error:
          "Falta el número barrera para OVER/UNDER."
      };

    }


    if (
      valor === "OVER" ||
      valor === "MAS" ||
      valor === "MÁS"
    ) {

      return {
        contractType:
          "DIGITOVER",

        barrier
      };

    }


    if (
      valor === "UNDER" ||
      valor === "MENOS"
    ) {

      return {
        contractType:
          "DIGITUNDER",

        barrier
      };

    }


    return null;

  }


  /* ========================================
     MATCH
     ======================================== */

  mapearMatch(
    direccion,
    metadata = {}
  ) {

    const valor =
      this.normalizar(
        direccion
      );


    let digit =
      metadata.digit ??
      metadata.numero ??
      metadata.barrier;


    /*
      También admite:

      MATCH 7
    */

    if (
      digit === undefined ||
      digit === null
    ) {

      const encontrado =
        valor.match(
          /(\d)/
        );


      if (
        encontrado
      ) {

        digit =
          Number(
            encontrado[1]
          );

      }

    }


    digit =
      Number(
        digit
      );


    if (
      !Number.isInteger(
        digit
      ) ||
      digit < 0 ||
      digit > 9
    ) {

      return {
        error:
          "MATCH necesita un dígito válido del 0 al 9."
      };

    }


    /*
      Regla de Trading Analyzer:
      MATCH 0 no se ejecuta.
    */

    if (
      digit === 0
    ) {

      return {
        error:
          "MATCH 0 está descartado por Trading Analyzer."
      };

    }


    return {
      contractType:
        "DIGITMATCH",

      barrier:
        digit
    };

  }


  /* ========================================
     MAPEAR SEÑAL COMPLETA
     ======================================== */

  mapear(senal) {

    if (
      !senal
    ) {

      return {
        ok:
          false,

        error:
          "No existe señal."
      };

    }


    if (
      !senal.mercado
    ) {

      return {
        ok:
          false,

        error:
          "La señal no contiene mercado."
      };

    }


    const estrategia =
      String(
        senal.estrategia ||
        ""
      )
        .trim()
        .toLowerCase();


    let contrato =
      null;


    /* ======================================
       RISE / FALL
       ====================================== */

    if (
      estrategia === "rise_fall" ||
      estrategia === "rise/fall"
    ) {

      contrato =
        this.mapearRiseFall(
          senal.direccion
        );

    }


    /* ======================================
       PAR / IMPAR
       ====================================== */

    else if (
      estrategia === "even_odd" ||
      estrategia === "even/odd" ||
      estrategia === "par_impar" ||
      estrategia === "par/impar"
    ) {

      contrato =
        this.mapearParImpar(
          senal.direccion
        );

    }


    /* ======================================
       MÁS / MENOS
       ====================================== */

    else if (
      estrategia === "over_under" ||
      estrategia === "over/under" ||
      estrategia === "mas_menos" ||
      estrategia === "más/menos"
    ) {

      contrato =
        this.mapearOverUnder(
          senal.direccion,
          senal.metadata || {}
        );

    }


    /* ======================================
       MATCH
       ====================================== */

    else if (
      estrategia === "match"
    ) {

      contrato =
        this.mapearMatch(
          senal.direccion,
          senal.metadata || {}
        );

    }


    else {

      return {
        ok:
          false,

        error:
          `Estrategia no soportada: ${senal.estrategia}`
      };

    }


    if (
      !contrato
    ) {

      return {
        ok:
          false,

        error:
          `Dirección no reconocida: ${senal.direccion}`
      };

    }


    if (
      contrato.error
    ) {

      return {
        ok:
          false,

        error:
          contrato.error
      };

    }


    return {
      ok:
        true,

      symbol:
        senal.mercado,

      strategy:
        senal.estrategia,

      direction:
        senal.direccion,

      contractType:
        contrato.contractType,

      barrier:
        contrato.barrier,

      confidence:
        Number(
          senal.confianza ||
          0
        ),

      sourceSignalId:
        senal.id,

      executionSecond:
        senal.segundosEntrada,

      timestamp:
        Date.now()
    };

  }

}


/* ==========================================
   INSTANCIA ÚNICA
   ========================================== */

export const contractMapper =
  new ContractMapper();
