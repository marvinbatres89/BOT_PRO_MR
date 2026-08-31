BOT V1 MR
TRADING ANALYZER -> BOT -> DERIV DEMO

VERSIÓN ACTUAL: FIX6


==========================================
OBJETIVO
==========================================

BOT V1 MR recibe las señales generadas por
Trading Analyzer y las transforma en contratos
compatibles con Deriv.

El proyecto trabaja actualmente con una cuenta
DEMO verificada de Deriv.


==========================================
FLUJO PRINCIPAL
==========================================

Trading Analyzer
-> Señal
-> Signal Bridge
-> Bot Engine
-> Contract Mapper
-> Propuesta Deriv
-> Compra DEMO
-> Seguimiento del contrato
-> Resultado final


==========================================
ESTRATEGIAS
==========================================

El BOT reconoce:

- Rise / Fall
- Par / Impar
- Más / Menos
- Match


==========================================
SEGURIDAD
==========================================

La ejecución está diseñada para trabajar
únicamente con una cuenta DEMO verificada.

La ejecución automática permanece apagada
hasta que el usuario la activa.

Solo se permite una operación activa a la vez.

No utiliza martingala.

No debe utilizarse una cuenta REAL durante
esta etapa de desarrollo y pruebas.


==========================================
FIX6 - CIERRE DEL CONTRATO
==========================================

FIX6 modifica principalmente el sistema que
recupera el resultado final de una operación.

La compra DEMO, la sincronización con Trading
Analyzer y la generación de propuestas se
mantienen.


FLUJO FIX6:

1. BUY devuelve contract_id.

2. El BOT guarda el contract_id.

3. PORTFOLIO comprueba si el contrato continúa
   entre las posiciones abiertas.

4. PROFIT_TABLE busca el mismo contract_id
   dentro del historial de contratos cerrados.

5. Cuando se encuentra el contrato cerrado,
   el BOT recupera:

   - Resultado
   - Profit
   - Precio de compra
   - Precio de cierre

6. El BOT muestra:

   GANADA

   o

   PERDIDA

   junto con el profit final.


==========================================
RESPALDOS DE SEGUIMIENTO
==========================================

Además del flujo principal FIX6 se conservan
como respaldo:

- proposal_open_contract
- transaction

Estos mecanismos ayudan a detectar el cierre
sin modificar la parte de compra DEMO que ya
funciona correctamente.


==========================================
ARCHIVOS DEL PROYECTO
==========================================

README.txt

bot-engine.js

bot.css

bot.js

contract-mapper.js

deriv-connection.js

deriv-proposal.js

deriv-trade.js

index.html

proposal-simulator.js

signal-bridge.js


==========================================
ESTADO DEL PROYECTO
==========================================

Sincronización Trading Analyzer:
ACTIVA

Recepción de señales:
ACTIVA

Mapeo de contratos:
ACTIVO

Conexión Deriv DEMO:
ACTIVA

Cotización real DEMO:
ACTIVA

Compra DEMO:
ACTIVA

Seguimiento final:
FIX6 EN PRUEBAS


==========================================
IMPORTANTE
==========================================

No colocar el Token PAT directamente dentro
de los archivos del proyecto.

El token debe introducirse desde la interfaz
durante la sesión.

BOT V1 MR
FIX6
