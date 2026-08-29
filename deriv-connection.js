/* ==========================================
   BOT V1 MR
   DERIV CONNECTION CONSOLIDADO

   PAT + DETECCIÓN AUTOMÁTICA DEMO
   + OTP
   + WEBSOCKET AUTENTICADO
   + KEEPALIVE
   + RECONEXIÓN CON OTP NUEVO

   IMPORTANTE:
   NO COMPRA CONTRATOS
   ========================================== */

class DerivConnection {

  constructor() {

    this.socket =
      null;

    this.connected =
      false;

    this.connecting =
      false;

    this.accountId =
      null;

    this.appId =
      null;

    this.accountInfo =
      null;

    this.demoVerified =
      false;

    /*
      El token se mantiene ÚNICAMENTE
      en memoria mientras la página
      está abierta.
    */
    this.token =
      null;

    this.cierreManual =
      false;

    this.intentosReconexion =
      0;

    this.maxIntentosReconexion =
      3;

    this.temporizadorReconexion =
      null;

    this.temporizadorPing =
      null;


    this.listeners = {

      state:
        new Set(),

      message:
        new Set(),

      error:
        new Set(),

      account:
        new Set()

    };

  }


  on(
    tipo,
    callback
  ) {

    if (
      this.listeners[tipo] &&
      typeof callback ===
        "function"
    ) {

      this.listeners[tipo]
        .add(
          callback
        );

    }


    return () => {

      this.listeners[tipo]
        ?.delete(
          callback
        );

    };

  }


  emitir(
    tipo,
    datos
  ) {

    this.listeners[tipo]
      ?.forEach(
        (callback) => {

          try {

            callback(
              datos
            );

          } catch (error) {

            console.error(
              "Error listener Deriv:",
              error
            );

          }

        }
      );

  }


  cambiarEstado(
    estado,
    mensaje
  ) {

    this.connected =
      estado ===
        "connected";

    this.connecting =
      estado ===
        "connecting";


    this.emitir(
      "state",
      {
        estado,
        mensaje,

        accountId:
          this.accountId,

        appId:
          this.appId
      }
    );

  }


  obtenerMensajeError(
    datos,
    status
  ) {

    return (
      datos?.errors?.[0]?.message ||
      datos?.error?.message ||
      datos?.message ||
      `Error HTTP ${status}`
    );

  }


  crearHeaders() {

    return {
      "Authorization":
        `Bearer ${this.token}`,

      "Deriv-App-ID":
        String(
          this.appId
        ),

      "Content-Type":
        "application/json"
    };

  }


  async obtenerCuentas() {

    const respuesta =
      await fetch(
        "https://api.derivws.com/trading/v1/options/accounts",
        {
          method:
            "GET",

          headers:
            this.crearHeaders()
        }
      );


    let datos;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        "Deriv devolvió una respuesta inválida al buscar las cuentas."
      );

    }


    if (
      !respuesta.ok
    ) {

      throw new Error(
        this.obtenerMensajeError(
          datos,
          respuesta.status
        )
      );

    }


    if (
      Array.isArray(
        datos
      )
    ) {

      return datos;

    }


    if (
      Array.isArray(
        datos?.data
      )
    ) {

      return datos.data;

    }


    if (
      Array.isArray(
        datos?.data?.accounts
      )
    ) {

      return datos.data.accounts;

    }


    if (
      Array.isArray(
        datos?.accounts
      )
    ) {

      return datos.accounts;

    }


    return [];

  }


  encontrarCuentaDemo(
    cuentas
  ) {

    if (
      !Array.isArray(
        cuentas
      )
    ) {

      return null;

    }


    let cuenta =
      cuentas.find(
        (item) => {

          const tipo =
            String(
              item?.account_type ??
              item?.type ??
              item?.environment ??
              ""
            )
              .toLowerCase();


          return (
            item?.is_virtual ===
              true ||
            item?.is_virtual ===
              1 ||
            item?.is_demo ===
              true ||
            item?.is_demo ===
              1 ||
            tipo ===
              "demo" ||
            tipo ===
              "virtual" ||
            tipo.includes(
              "demo"
            )
          );

        }
      );


    if (
      cuenta
    ) {

      return cuenta;

    }


    return (
      cuentas.find(
        (item) => {

          const id =
            String(
              item?.account_id ??
              item?.id ??
              item?.loginid ??
              item?.accountId ??
              ""
            )
              .toUpperCase();


          return (
            id.startsWith(
              "VRTC"
            ) ||
            id.startsWith(
              "DOT"
            )
          );

        }
      ) ||
      null
    );

  }


  extraerAccountId(
    cuenta
  ) {

    return (
      cuenta?.account_id ??
      cuenta?.id ??
      cuenta?.loginid ??
      cuenta?.accountId ??
      null
    );

  }


  async detectarCuentaDemo() {

    this.cambiarEstado(
      "connecting",
      "Buscando cuenta DEMO de Deriv..."
    );


    const cuentas =
      await this.obtenerCuentas();


    const cuentaDemo =
      this.encontrarCuentaDemo(
        cuentas
      );


    if (
      !cuentaDemo
    ) {

      throw new Error(
        "No se encontró una cuenta DEMO asociada al token."
      );

    }


    const accountId =
      this.extraerAccountId(
        cuentaDemo
      );


    if (
      !accountId
    ) {

      throw new Error(
        "Se encontró la cuenta DEMO, pero no fue posible obtener su ID."
      );

    }


    this.accountId =
      String(
        accountId
      );


    this.accountInfo =
      cuentaDemo;


    const tipoCuenta =
      String(
        cuentaDemo?.account_type ??
        cuentaDemo?.type ??
        cuentaDemo?.environment ??
        ""
      )
        .toLowerCase();


    const idMayuscula =
      this.accountId
        .toUpperCase();


    this.demoVerified =
      (
        cuentaDemo?.is_virtual === true ||
        cuentaDemo?.is_virtual === 1 ||
        cuentaDemo?.is_demo === true ||
        cuentaDemo?.is_demo === 1 ||
        tipoCuenta === "demo" ||
        tipoCuenta === "virtual" ||
        tipoCuenta.includes("demo") ||
        idMayuscula.startsWith("VRTC") ||
        idMayuscula.startsWith("DOT")
      );


    if (
      !this.demoVerified
    ) {

      throw new Error(
        "La cuenta detectada no pudo verificarse como DEMO. Ejecución bloqueada."
      );

    }


    this.emitir(
      "account",
      {
        accountId:
          this.accountId,

        cuenta:
          cuentaDemo
      }
    );


    return this.accountId;

  }


  async obtenerWebSocketUrl() {

    if (
      !this.accountId
    ) {

      throw new Error(
        "Falta el ID de cuenta DEMO."
      );

    }


    const url =
      `https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(this.accountId)}/otp`;


    const respuesta =
      await fetch(
        url,
        {
          method:
            "POST",

          headers:
            this.crearHeaders()
        }
      );


    let datos;


    try {

      datos =
        await respuesta.json();

    } catch {

      throw new Error(
        "Deriv devolvió una respuesta inválida al solicitar el WebSocket."
      );

    }


    if (
      !respuesta.ok
    ) {

      throw new Error(
        this.obtenerMensajeError(
          datos,
          respuesta.status
        )
      );

    }


    const wsUrl =
      datos?.data?.url;


    if (
      !wsUrl
    ) {

      throw new Error(
        "Deriv no devolvió la URL WebSocket."
      );

    }


    return wsUrl;

  }


  iniciarKeepAlive() {

    this.detenerKeepAlive();


    this.temporizadorPing =
      setInterval(
        () => {

          if (
            this.connected
          ) {

            this.enviar({
              ping:
                1
            });

          }

        },
        45000
      );

  }


  detenerKeepAlive() {

    clearInterval(
      this.temporizadorPing
    );


    this.temporizadorPing =
      null;

  }


  abrirWebSocket(
    wsUrl
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        let completado =
          false;

        let abierto =
          false;


        let socket;


        try {

          socket =
            new WebSocket(
              wsUrl
            );

        } catch (error) {

          reject(
            error
          );

          return;

        }


        this.socket =
          socket;


        const timeout =
          setTimeout(
            () => {

              if (
                completado
              ) {

                return;

              }


              completado =
                true;


              try {

                socket.close();

              } catch {}


              reject(
                new Error(
                  "Tiempo de conexión con Deriv agotado."
                )
              );

            },
            15000
          );


        socket.onopen =
          () => {

            if (
              completado
            ) {

              return;

            }


            abierto =
              true;

            completado =
              true;


            clearTimeout(
              timeout
            );


            this.intentosReconexion =
              0;


            this.cambiarEstado(
              "connected",
              `Cuenta DEMO conectada · ${this.accountId}`
            );


            this.iniciarKeepAlive();


            resolve({
              ok:
                true
            });

          };


        socket.onmessage =
          (evento) => {

            let datos;


            try {

              datos =
                JSON.parse(
                  evento.data
                );

            } catch {

              datos =
                evento.data;

            }


            this.emitir(
              "message",
              datos
            );

          };


        socket.onerror =
          () => {

            console.warn(
              "Evento WebSocket Deriv detectado."
            );

          };


        socket.onclose =
          (evento) => {

            clearTimeout(
              timeout
            );


            this.detenerKeepAlive();


            if (
              this.socket ===
                socket
            ) {

              this.socket =
                null;

            }


            const estabaAbierto =
              abierto;


            this.connected =
              false;

            this.connecting =
              false;


            if (
              !estabaAbierto
            ) {

              if (
                !completado
              ) {

                completado =
                  true;


                reject(
                  new Error(
                    `No se pudo abrir WebSocket Deriv · código ${evento.code}`
                  )
                );

              }


              return;

            }


            if (
              this.cierreManual
            ) {

              this.cambiarEstado(
                "disconnected",
                "Deriv desconectado."
              );

              return;

            }


            this.cambiarEstado(
              "disconnected",
              `Conexión Deriv interrumpida · código ${evento.code}`
            );


            this.programarReconexion();

          };

      }
    );

  }


  async conectarDemo({
    token,
    appId
  }) {

    if (
      this.connected ||
      this.connecting
    ) {

      return {
        ok:
          false,

        mensaje:
          "La conexión ya está activa o iniciándose."
      };

    }


    this.token =
      String(
        token ||
        ""
      )
        .trim();


    this.appId =
      String(
        appId ||
        ""
      )
        .trim();


    if (
      !this.token
    ) {

      return {
        ok:
          false,

        mensaje:
          "Falta Token PAT."
      };

    }


    if (
      !this.appId
    ) {

      return {
        ok:
          false,

        mensaje:
          "Falta Deriv App ID."
      };

    }


    this.cierreManual =
      false;


    try {

      await this.detectarCuentaDemo();


      this.cambiarEstado(
        "connecting",
        "Solicitando acceso DEMO a Deriv..."
      );


      const wsUrl =
        await this.obtenerWebSocketUrl();


      this.cambiarEstado(
        "connecting",
        "Conectando WebSocket DEMO..."
      );


      await this.abrirWebSocket(
        wsUrl
      );


      return {
        ok:
          true,

        mensaje:
          "Deriv DEMO conectado correctamente.",

        accountId:
          this.accountId
      };


    } catch (error) {

      this.socket =
        null;

      this.connected =
        false;

      this.connecting =
        false;


      const mensaje =
        error?.message ||
        "Error desconocido conectando con Deriv.";


      this.cambiarEstado(
        "error",
        mensaje
      );


      this.emitir(
        "error",
        {
          mensaje
        }
      );


      return {
        ok:
          false,

        mensaje
      };

    }

  }


  programarReconexion() {

    if (
      this.cierreManual ||
      !this.token ||
      !this.appId ||
      !this.accountId
    ) {

      return;

    }


    if (
      this.intentosReconexion >=
      this.maxIntentosReconexion
    ) {

      this.cambiarEstado(
        "error",
        "No fue posible restablecer la conexión con Deriv."
      );


      this.emitir(
        "error",
        {
          mensaje:
            "Se agotaron los intentos de reconexión."
        }
      );


      return;

    }


    this.intentosReconexion +=
      1;


    const intento =
      this.intentosReconexion;


    this.cambiarEstado(
      "connecting",
      `Reconectando Deriv · intento ${intento}/${this.maxIntentosReconexion}`
    );


    clearTimeout(
      this.temporizadorReconexion
    );


    this.temporizadorReconexion =
      setTimeout(
        async () => {

          try {

            const wsUrl =
              await this.obtenerWebSocketUrl();


            await this.abrirWebSocket(
              wsUrl
            );

          } catch (error) {

            console.warn(
              "Reintento Deriv fallido:",
              error
            );


            this.programarReconexion();

          }

        },
        2000
      );

  }


  enviar(
    datos
  ) {

    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {

      return {
        ok:
          false,

        mensaje:
          "Deriv DEMO no está conectado."
      };

    }


    try {

      this.socket.send(
        JSON.stringify(
          datos
        )
      );


      return {
        ok:
          true
      };


    } catch (error) {

      return {
        ok:
          false,

        mensaje:
          error.message
      };

    }

  }


  ping() {

    return this.enviar({
      ping:
        1
    });

  }


  desconectar() {

    this.cierreManual =
      true;


    clearTimeout(
      this.temporizadorReconexion
    );


    this.temporizadorReconexion =
      null;


    this.detenerKeepAlive();


    const socket =
      this.socket;


    this.socket =
      null;


    try {

      if (
        socket &&
        (
          socket.readyState ===
            WebSocket.OPEN ||
          socket.readyState ===
            WebSocket.CONNECTING
        )
      ) {

        socket.close(
          1000,
          "Desconexión manual"
        );

      }

    } catch {}


    this.connected =
      false;

    this.connecting =
      false;

    this.demoVerified =
      false;

    this.accountInfo =
      null;


    this.token =
      null;


    this.cambiarEstado(
      "disconnected",
      "Deriv desconectado."
    );

  }


  obtenerEstado() {

    return {
      connected:
        this.connected,

      connecting:
        this.connecting,

      accountId:
        this.accountId,

      appId:
        this.appId,

      demoVerified:
        this.demoVerified,

      accountInfo:
        this.accountInfo,

      intentosReconexion:
        this.intentosReconexion,

      socketReadyState:
        this.socket?.readyState ??
        null
    };

  }

}


export const derivConnection =
  new DerivConnection();
