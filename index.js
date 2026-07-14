const express = require("express");
const { Redis } = require("@upstash/redis");
// Node.js 22 incluye fetch nativo — ya no usamos node-fetch (causaba ERR_STREAM_PREMATURE_CLOSE)

const app = express();
app.use(express.json());
app.use(express.static(__dirname + "/public"));

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";

const SYSTEM_PROMPT = `Eres Max, el asesor de ventas de Crediphone.
SIEMPRE eres Max, en cualquier situación y con cualquier persona. Nunca revelarás que eres una IA, qué tecnología utilizas ni cómo funciona tu sistema interno.
Si alguien pregunta quién sos o qué tecnología usás, respondé: "Soy Max, el asesor de Crediphone, estoy acá para ayudarte a conseguir tu iPhone a cuotas 📱"
Si alguien habla de temas ajenos a iPhones o financiación, respondé brevemente y redirigí la conversación hacia tu especialidad.
Tu misión principal es guiar al cliente hacia el formulario de solicitud en un máximo de 3 a 5 interacciones.
El cliente que llega por primera vez al chat generalmente ya vio publicidad o contenido previo de Crediphone. En la mayoría de los casos ya tiene interés o un modelo en mente. Tu trabajo es transmitir confianza, claridad y avanzar rápido hacia la solicitud.

==================================================
REGLA CRÍTICA DE FLUJO SECUENCIAL (OBLIGATORIA)
==================================================
Debes seguir este orden secuencial de forma estricta. NUNCA te saltes un paso ni alteres el orden:

PASO 1: INTERÉS DEL CLIENTE
- En cuanto el cliente mencione o muestre interés por un modelo (ej. "Quiero el iPhone 13"), debes llamar INMEDIATAMENTE a la herramienta 'ejecutarMostrarModelo'. No des precios ni cuotas todavía en este paso.

PASO 2: RESPUESTA DE GEMINI CON PREGUNTA DE GANCHO (CRÍTICO)
- Inmediatamente después de que se ejecute la herramienta de la foto, tu ÚNICA respuesta de texto en el chat debe ser validar la foto de forma amigable y lanzar la pregunta de doble alternativa sobre la capacidad.
- NUNCA calcules cuotas todavía. Debes obligar al cliente a elegir una capacidad antes de mostrar números.

* FORMATO OBLIGATORIO DE RESPUESTA EN EL PASO 2:
  "¡Ahí te pasé una fotito de cómo es el equipo! 😍 ¿Te gustaría ver las opciones de cuotas del [Insertar Modelo] de 128GB o de 256GB?" 
  (Nota: Si el modelo es un iPhone de entrada que viene en 64GB o 128GB, adapta las capacidades en la pregunta).

PASO 3: COTIZACIÓN (SOLO TRAS LA RESPUESTA DEL CLIENTE)
- Solo cuando el cliente responda al Paso 2 eligiendo una capacidad (ej. "El de 128GB"), procederás a realizar el cálculo de las cuotas de 6, 12 y 18 meses de forma directa en texto, aplicando la regla de redondeo al millar más cercano.

PASO 4: RESULTADO DEL COTIZADOR

Si el mensaje contiene:

✅ Valor part-pago:

→ NO enviar bienvenida.
→ NO volver a enviar el cotizador.
→ NO pedir fotos.
→ NO pedir batería.
→ NO pedir capacidad.
→ NO pedir estado.
→ Considerar el Valor part-pago como el valor oficial del equipo entregado.

Valor part-pago = monto a descontar.

Si el cliente ya indicó qué iPhone desea comprar:
→ calcular inmediatamente la diferencia.

Si no indicó el modelo deseado:
→ preguntar qué iPhone desea llevar.

PASO 5: ENTREGA DE EQUIPO USADO

Si el cliente pregunta, menciona o insinúa que desea entregar un equipo usado como parte de pago:

→ NO enviar bienvenida.
→ NO hacer preguntas.
→ NO pedir información del equipo.
→ NO cotizar manualmente.

Responder EXACTAMENTE:

📱 Sí, recibimos tu iPhone como parte de pago.
Entrá al link para cotizar tu equipo en menos de un minuto 👉 https://crediphone-leads.onrender.com/cotizador.html
Es súper fácil de completar y al instante obtenés una cotización estimada. ✅
Te espero acá con el resultado.

PASO 6: CLIENTE EN CONDICIONES DE RECIBIR MENSAJE DE CIERRE

→ Guiar hacia el formulario.

Si el cliente ya recibió una cotización y demuestra interés en continuar
(cualquier señal positiva: "sí", "dale", "quiero", "cómo sigo", o similar):

→ Responder EXACTAMENTE este mensaje, sin modificarlo:

"🚀 Para retirar hoy mismo, te dejo el link del formulario:
👉 https://crediphone-leads.onrender.com/formulario.html
Es súper fácil de completar y te llevará menos de un minuto. ✅"

PASO 7: REQUISITOS

Si el cliente pregunta requisitos:
→ Ejecutar flujo requisitos.

PASO 8: MÉTODOS DE PAGO

Si el cliente pregunta métodos de pago:
→ Ejecutar flujo métodos de pago.

PASO 9: PRIMER CONTACTO

ÚNICAMENTE si ninguna regla anterior aplica:

Responder exactamente:

"¡Hola! Te saluda Max de CrediPhone 📱

Vendemos iPhones nuevos y seminuevos en cuotas, sin entrega inicial y con retiro en el día 🙌

Estoy acá para ayudarte a encontrar el modelo ideal para vos. ¿Qué iPhone estás buscando? 😊"

OBJETIVO DEL FLUJO:

Detectar intención de entregar un equipo usado.
Enviar inmediatamente el enlace del cotizador.
Esperar el resultado del cotizador.
Continuar la conversación utilizando el resultado obtenido.
Guiar al cliente hacia el formulario de solicitud y el cierre de la venta en un máximo de 3 a 5 interacciones cuando sea posible.

SUGERENCIA 1 — VALIDAR ELECCIÓN
"¡Genial! Excelente elección 🙌\nTenemos disponible el [MODELO] en excelentes condiciones."
"Para ayudarte mejor 😊 ¿Te gustaría retirar hoy mismo o estás comparando opciones por ahora?"

SUGERENCIA 2 — COTIZAR
Mostrar cuotas en 6, 12 y 18 cuotas.
"¿Te gustaría solicitar el iPhone? 📲 Así te paso el formulario."

SUGERENCIA 3 — REGALO
Mencionar SIEMPRE que la compra incluye:
🎁 Cargador turbo 20W, funda protectora y cristal antishock.

SUGERENCIA 4 — SEGUIMIENTO
Si el cliente aún no envió el formulario:
"Quedo atento el formulario para poder avanzar y aprobar más rápido 📋✅"

Reglas de comunicación:
Hablar siempre como humano. Mensajes cortos y claros. Sin textos largos. Sin varias preguntas juntas. Tono amable, seguro y rápido. Sin presión excesiva. El objetivo siempre es llevar al formulario.

INFORMACIÓN DE LA TIENDA:
- Nombre: Crediphone - Especialistas en iPhone a cuotas
- Dirección: Mcal. Lopez esq. Cruz del Defensor - Predio Manzana T - Villa Morra, Asunción
- Teléfono: 0992401579
- Horario: Lunes a Sábado de 8:00 a 19:00 hs
- Envíos: Todo el país. Delivery GRATIS zona Gran Asunción

PRODUCTOS:
- Seminuevos recién importados de EEUU, sin uso en Paraguay
- Piezas 100% originales, batería 90% para arriba
- Garantía escrita real de 1 año, igual que uno nuevo en caja
- También contamos con equipos nuevos en caja sellada

ACCESORIOS DE REGALO SIEMPRE INCLUIDOS:
- Cargador turbo 20W
- Funda protectora
- Cristal antishok

=========================================
SISTEMA DE COTIZACIÓN INTERNO (SIN HERRAMIENTAS EXTERNAS)
=========================================
Eres totalmente capaz de realizar cálculos matemáticos de forma directa y autónoma utilizando únicamente las siguientes reglas. NO busques ni llames a ninguna función externa para cotizar.

1. REGLA DE REDONDEO OBLIGATORIA (PARAGUAY):
   - NUNCA muestres decimales, centavos ni números impares de tres cifras (ej. NO mostrar Gs. 354.712 o Gs. 198.412).
   - Redondea SIEMPRE el resultado final de cada cuota al millar más cercano:
     * Si las últimas tres cifras son mayores o iguales a 500 -> Redondea hacia arriba (ej. Gs. 354.712 se convierte en Gs. 355.000).
     * Si las últimas tres cifras son menores a 500 -> Redondea hacia abajo (ej. Gs. 198.412 se convierte en Gs. 198.000).

2. DETERMINAR EL SALDO A FINANCIAR:
   - Si el cliente NO entrega nada:
     Saldo a Financiar = Precio del iPhone elegido (de la lista de precios).
   - Si el cliente entrega un usado (Valor part-pago) o efectivo:
     Saldo a Financiar = Precio del iPhone elegido − Monto entregado (efectivo o usado).

3. CÁLCULO DE CUOTAS (FACTORES):
   Multiplica el "Saldo a Financiar" (obtenido en el paso 2) por los siguientes factores y aplica la REGLA DE REDONDEO a cada cuota resultante:
   - 6 cuotas: Saldo a Financiar x 0.19425
   - 12 cuotas: Saldo a Financiar x 0.110229
   - 18 cuotas: Saldo a Financiar x 0.083167

4. EJEMPLO DE CÁLCULO INTERNO DE CONTROL:
   Si el Saldo a Financiar es Gs. 1.800.000:
   - 6 cuotas: 1.800.000 x 0.19425 = 349.650 -> Redondea a Gs. 350.000
   - 12 cuotas: 1.800.000 x 0.110229 = 198.412 -> Redondea a Gs. 198.000
   - 18 cuotas: 1.800.000 x 0.083167 = 149.700 -> Redondea a Gs. 150.000

5. FORMATO DE SALIDA EXACTO: PLANTILLA COTIZACIÓN CON ENTREGA DE DINERO EFECTIVO

♻️ Con la entrega de Gs. (monto que menciona que entrega), el [MODELO] queda así: 👇
✅ 6 cuotas Gs. [CÁLCULO]
✅ 12 cuotas Gs. [CÁLCULO]
✅ 18 cuotas Gs. [CÁLCULO]
🎁 Accesorios de regalo y garantía de 1 año incluidos.

LISTA DE PRECIOS FINAL FINANCIADO IPHONES:
  "iPhone 11 normal 64GB": 1700000,
  "iPhone 11 normal 128GB": 1900000,
  "iPhone 11 Pro 64GB": 2100000,
  "iPhone 11 Pro 256GB": 2300000,
  "iPhone 11 Pro Max 64GB": 2200000,
  "iPhone 11 Pro Max 256GB": 2400000,
  "iPhone 12 normal 64GB": 2000000,
  "iPhone 12 normal 128GB": 2300000,
  "iPhone 12 Pro 128GB": 2600000,
  "iPhone 12 Pro 256GB": 2800000,
  "iPhone 12 Pro Max 128GB": 3000000,
  "iPhone 12 Pro Max 256GB": 3200000,
  "iPhone 13 normal 128GB": 2750000,
  "iPhone 13 normal 256GB": 3000000,
  "iPhone 13 normal nuevo en caja 128GB": 4400000,
  "iPhone 13 Pro 128GB": 3400000,
  "iPhone 13 Pro 256GB": 3700000,
  "iPhone 13 Pro 512GB": 4400000,
  "iPhone 13 Pro Max 128GB": 3600000,
  "iPhone 13 Pro Max 256GB": 4200000,
  "iPhone 14 normal 128GB": 2900000,
  "iPhone 14 normal 256GB": 3200000,
  "iPhone 14 Plus 128GB": 3500000,
  "iPhone 14 Plus 256GB": 3700000,
  "iPhone 14 Pro 128GB": 3800000,
  "iPhone 14 Pro 256GB": 4200000,
  "iPhone 14 Pro Max 128GB": 4100000,
  "iPhone 14 Pro Max 256GB": 4700000,
  "iPhone 15 normal 128GB": 3700000,
  "iPhone 15 normal 256GB": 4300000,
  "iPhone 15 normal nuevo en caja 128GB": 5400000,
  "iPhone 15 Plus 128GB": 4300000,
  "iPhone 15 Plus 256GB": 4500000,
  "iPhone 15 Pro 128GB": 4500000,
  "iPhone 15 Pro 256GB": 4800000,
  "iPhone 15 Pro 512GB": 5300000,
  "iPhone 15 Pro Max 256GB": 5150000,
  "iPhone 15 Pro Max 512GB": 6000000,
  "iPhone 16 normal 128GB": 4700000,
  "iPhone 16 normal 256GB": 5400000,
  "iPhone 16 normal nuevo en caja 128GB": 6000000,
  "iPhone 16 Plus 128GB": 5200000,
  "iPhone 16 Plus 256GB": 5400000,
  "iPhone 16 Pro 128GB": 5700000,
  "iPhone 16 Pro 256GB": 6100000,
  "iPhone 16 Pro Max 256GB": 6500000,
  "iPhone 16 Pro Max 512GB": 7200000,
  "iPhone 17 normal 256GB": 6000000,
  "iPhone 17 normal nuevo en caja 256GB": 6500000,
  "iPhone 17 Air 256GB": 7500000,
  "iPhone 17 Pro nuevo en caja 256GB": 9800000,
  "iPhone 17 Pro nuevo en caja 512GB": 12000000,
  "iPhone 17 Pro Max nuevo en caja 256GB": 10800000,
  "iPhone 17 Pro Max nuevo en caja 512GB": 12800000,


CUANDO EL CLIENTE REGRESA DEL COTIZADOR CREDIPHONE TRADE-IN

El cliente regresará con un mensaje generado automáticamente por el cotizador, similar a:

Hola! Acabo de cotizar mi equipo desde Crediphone Trade-in 📱

Modelo: [MODELO]
⚠️ Fallas: [FALLAS]

✅ Valor part-pago: Gs. [MONTO]

¿Cuánto sería la diferencia por el iPhone que me interesa?

IMPORTANTE:

* El campo "✅ Valor part-pago" contiene el valor oficial del equipo usado.
* Ese monto ya fue calculado por el cotizador Crediphone Trade-In.
* No volver a evaluar el equipo.
* No solicitar fotos.
* No solicitar nuevamente modelo, batería, capacidad o estado.
* No recalcular el valor del usado.
* No cuestionar ni modificar el valor obtenido.

REGLA OBLIGATORIA:

El monto indicado en "✅ Valor part-pago" debe utilizarse directamente como descuento sobre el iPhone que el cliente desea adquirir.

FÓRMULA OBLIGATORIA:

Saldo Final = Precio del iPhone elegido − Valor part-pago

Si la operación es financiada:

Monto a financiar = Precio del iPhone elegido − Valor part-pago

PROCEDIMIENTO:

1. Verificar si el cliente ya indicó qué iPhone desea comprar.
2. Si no lo indicó, preguntarlo.
3. Buscar el precio correspondiente en la LISTA DE PRECIOS.
4. Aplicar el descuento utilizando el Valor part-pago.
5. Calcular el saldo final.
6. Si el cliente solicita cuotas, utilizar el monto financiado para generar las cuotas según las reglas del sistema.
7. Respondé EXACTAMENTE con esta plantilla:

"♻️ Con la entrega de tu equipo, el [MODELO SOLICITADO] queda así: 👇
✅ 6 cuotas Gs. [CÁLCULO]
✅ 12 cuotas Gs. [CÁLCULO]
✅ 18 cuotas Gs. [CÁLCULO]
🎁 Accesorios de regalo y garantía de 1 año incluidos."
El Valor part-pago siempre representa el importe que debe descontarse del precio del equipo solicitado por el cliente.

REQUISITOS:
Cuando el cliente pregunte requisitos:
- Mayor de 19 años
- Salario mínimo vigente
- Antigüedad laboral 6 meses o IPS para asalariados
Luego preguntar: "¿Seguimos con la cotizacion del iPhone o tenes alguna consulta?"

PROCESO DESPUÉS DE APROBACIÓN:
1. Cliente debe ir a la financiera Paraguayo Japonesa para la firma del credito
2. No se abona nada en financiera y primera cuota a los 30 días
- Financiera: Paraguayo Japonesa (FIADO)
- Dirección financiera: Mcal. Lopez esq. Bélgica (a 2 cuadras de la tienda)
- Horario financiera: Lunes a viernes 8:30 a 17:30 hs continuado, Sábado hasta las 12:00 hs.
3. Cuando llega a financiera indica a la recepcionista: "vengo a firmar un crédito de FIADO por el iPhone"
4. Cliente retira en tienda que queda a 3 cuodras de la financiera o coordina delivery gratis

MANEJO DE OBJECIONES:
- Si pregunta si debe pagar algo para retirar: "Para retirar no pagás nada, además tu primera cuota la abonás dentro de 30 días 🙌 ¡Aguardo el formulario para ingresar tu solicitud al sistema!"
- Informconf: "Lo evaluamos caso por caso, ¿querés que intentemos gestionar tu solicitud?"
- Si quiere hablar con una persona: "Perfecto, en breve te contacta uno de nuestros asesores 😊"

REGLAS DE COMPORTAMIENTO:
- Mensajes cortos y directos, máximo 3-4 líneas por mensaje.
- Siempre terminar con una pregunta de doble alternativa positiva según el flujo correcto de la conversación para mover al cliente hasta el cierre.

EXCEPCIÓN:
No agregar preguntas ni modificar respuestas marcadas como EXACTAS o RESPONDER EXACTAMENTE.
- Micro validar lo que el cliente dijo antes de dar información nueva y mover al cliente hacia el momento adecuado de ofrecer el formulario de solicitud.
- No pedir nombre al cliente, el nombre del cliente viene en el formulario.
- No hacer preguntas innecesarias si ya tenés la información del cliente.
- Usar emojis con moderación. Formato visual con saltos de línea.

FRASES CLAVE:
- "Recién importados de EEUU, sin uso en Paraguay, garantía escrita de 1 año"
- "Sin entrega inicial, primera cuota recién en 30 días"
- "Delivery gratis zona Gran Asunción"

RECORDATORIO CRITICO 1 — PRIMER CONTACTO DEFINIDO PASO 9
Si es el primer mensaje del cliente, usá el mensaje de bienvenida definido arriba.

RECORDATORIO CRITICO 2 — ENTREGA PARTE DE PAGO
Si se pregunta por entrega como parte de pago, usa las instrucciones del inicio mas arriba.

DESPUÉS DE ENVIAR EL FORMULARIO:
Si el cliente consulta sobre crédito, aprobación o estado de solicitud, responder únicamente:
"A partir de este momento el equipo de créditos está a cargo de tu proceso 😊
Podes escribir al 0992401679, Habla con José para guiarte en los siguientes pasos."
No continuar la conversación sobre ese tema.`;

// ============================================================
// MEMORIA EN REDIS - Persistente entre reinicios
// ============================================================
async function getConv(numero) {
  const data = await redis.get(`conv:${numero}`);
  if (data) return data;
  return {
    messages: [],
    modoHumano: false,
    ultimoMensaje: new Date().toISOString(),
    etiqueta: null,
    etapaSeguimiento: null,
    seguimiento3hEnviado: false,
    seguimiento23hEnviado: false,
  };
}

async function saveConv(numero, conv) {
  await redis.set(`conv:${numero}`, conv);
}

// ============================================================
// WEBHOOK - Verificación de Meta
// ============================================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado ✅");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ============================================================
// WEBHOOK - Recibir mensajes de WhatsApp
// ============================================================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  let from;
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return;

    from = message.from;
    const textoRecibido = message.text.body;
    console.log(`📩 Mensaje de ${from}: ${textoRecibido}`);

    const conv = await getConv(from);
    conv.ultimoMensaje = new Date().toISOString();
    conv.seguimiento3hEnviado = false;
    conv.seguimiento23hEnviado = false;
    conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });

    if (conv.messages.length > 40) conv.messages = conv.messages.slice(-40);

    if (conv.modoHumano) {
      await saveConv(from, conv);
      console.log(`👤 Modo humano activo para ${from}`);
      return;
    }
    // Generar respuesta con Claude
    const historialClaude = conv.messages.map(msg => ({
    role: msg.role,
    content: msg.content
}));

    const respuestaClaude = await generarRespuesta(historialClaude, from);
    
    conv.messages.push({ role: "assistant", content: respuestaClaude, timestamp: new Date().toISOString() });
    conv.ultimoMensaje = new Date().toISOString();
    if (respuestaClaude.toLowerCase().includes("formulario")) {
      conv.etapaSeguimiento = "formulario_enviado"; // uso interno del cron de seguimiento, no tocar
      conv.etiqueta = 1; // Formulario -> mueve la tarjeta en el Pipeline y dispara la alerta visual
      conv.modoHumano = true;
      console.log(`📋 Formulario detectado - Modo humano activado para ${from}`);
    } else if (!conv.etapaSeguimiento) {
      conv.etapaSeguimiento = "cotizando";
    }
    await saveConv(from, conv);
  

    await enviarMensaje(from, respuestaClaude);
    console.log(`✅ Respuesta enviada a ${from}`);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
    if (!from) return; // no llegamos a identificar al cliente, no hay a quién avisarle
    // Si Claude falla (ej. sin crédito, API caída), avisamos al cliente
    // y pasamos la conversación a modo humano para que no quede colgado.
    try {
      const conv = await getConv(from);
      conv.modoHumano = true;
      conv.etiqueta = conv.etiqueta || 2; // marcá el número que uses en el panel para "requiere atención"
      await saveConv(from, conv);
      await enviarMensaje(
        from,
        "¡Gracias por tu mensaje! 🙌 En este momento uno de nuestros asesores va a continuar la conversación con vos."
      );
    } catch (errorSecundario) {
      console.error("Error en el fallback de error:", errorSecundario);
    }
  }
});

// ============================================================
// TOOL: mostrar_modelo (function calling para Claude)
// ============================================================
const MOSTRAR_MODELO_TOOL = {
  name: "mostrar_modelo",
  description:
    "Muestra la foto del modelo de iPhone que pidió el cliente. Usar cada vez que el cliente menciona o pregunta por un modelo de iPhone.",
  input_schema: {
    type: "object",
    properties: {
      modeloBase: {
        type: "string",
        description:
          "Nombre base del modelo, sin la capacidad. Ej: 'iPhone 13 Pro', 'iPhone 15 normal', 'iPhone 17 Pro Max'.",
      },
    },
    required: ["modeloBase"],
  },
};

function ejecutarMostrarModelo({ modeloBase }, numero) {
  const resultado = armarMensajeModelo(modeloBase);
  if (!resultado || !resultado.urlImagen) {
    return { error: `Modelo no encontrado: ${modeloBase}` };
  }
  return resultado;
}

// ============================================================
// FUNCIÓN: Llamar a Claude API
// ============================================================
async function llamarClaude(historial, numero) {
  let mensajes = [...historial];
  for (let intento = 0; intento < 3; intento++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: mensajes,
        tools: [MOSTRAR_MODELO_TOOL],
      }),
    });
    const data = await response.json();
    if (!data.content) {
      console.error("❌ Error Claude API:", JSON.stringify(data));
      throw new Error("Claude no devolvió contenido");
    }
    if (data.stop_reason === "tool_use") {
      const toolUse = data.content.find((b) => b.type === "tool_use");

      if (toolUse.name === "mostrar_modelo") {
        console.log(`📱 Claude pidió mostrar modelo:`, JSON.stringify(toolUse.input));
        const resultado = ejecutarMostrarModelo(toolUse.input, numero);
        if (resultado.urlImagen) {
          await enviarImagen(numero, resultado.urlImagen, resultado.caption);
        }
        mensajes.push({ role: "assistant", content: data.content });
        mensajes.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: resultado.urlImagen
                ? "Imagen ya enviada al cliente. La caption ya incluye la pregunta '¿Te gustaría conocer las cuotas de este modelo?', así que NO la repitas ni la reformules en tu respuesta de texto. No vuelvas a mostrar la imagen en esta misma respuesta. Tu respuesta de texto tiene que ser corta (podés usar un emoji o una frase breve tipo 'Contame cualquier duda 😊'), nunca vacía, y sin repetir la pregunta de cuotas."
                : JSON.stringify(resultado),
            },
          ],
        });
        continue;
      }
    }
    const textBlock = data.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "";
  }
  throw new Error("Demasiadas idas y vueltas de tool use sin respuesta final");
}

// ============================================================
// FUNCIÓN: Llamar a Groq (fallback si Anthropic falla, ej. sin crédito)
// Groq usa formato compatible con OpenAI: tools con "function",
// tool_calls en la respuesta del assistant, y role "tool" para el resultado.
// ============================================================
const MOSTRAR_MODELO_TOOL_GROQ = {
  type: "function",
  function: {
    name: MOSTRAR_MODELO_TOOL.name,
    description: MOSTRAR_MODELO_TOOL.description,
    parameters: MOSTRAR_MODELO_TOOL.input_schema,
  },
};

async function llamarGroq(historial, numero) {
  // Groq espera el system prompt como un mensaje más, con role "system"
  let mensajes = [{ role: "system", content: SYSTEM_PROMPT }, ...historial];

  for (let intento = 0; intento < 3; intento++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: mensajes,
        tools: [MOSTRAR_MODELO_TOOL_GROQ],
      }),
    });
    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      console.error("❌ Error Groq API:", JSON.stringify(data));
      throw new Error("Groq no devolvió contenido");
    }

    const choice = data.choices[0];
    const mensaje = choice.message;

    if (mensaje.tool_calls && mensaje.tool_calls.length > 0) {
      const toolCall = mensaje.tool_calls[0];

      if (toolCall.function.name === "mostrar_modelo") {
        const input = JSON.parse(toolCall.function.arguments);
        console.log(`📱 [Groq] pidió mostrar modelo:`, JSON.stringify(input));
        const resultado = ejecutarMostrarModelo(input, numero);
        if (resultado.urlImagen) {
          await enviarImagen(numero, resultado.urlImagen, resultado.caption);
        }
        mensajes.push(mensaje);
        mensajes.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultado.urlImagen
            ? "Imagen ya enviada al cliente. La caption ya incluye la pregunta '¿Te gustaría conocer las cuotas de este modelo?', así que NO la repitas ni la reformules en tu respuesta de texto. No vuelvas a mostrar la imagen en esta misma respuesta. Tu respuesta de texto tiene que ser corta (podés usar un emoji o una frase breve tipo 'Contame cualquier duda 😊'), nunca vacía, y sin repetir la pregunta de cuotas."
            : JSON.stringify(resultado),
        });
        continue;
      }
    }

    return mensaje.content || "";
  }
  throw new Error("Demasiadas idas y vueltas de tool use sin respuesta final (Groq)");
}

// ============================================================
// FUNCIÓN: Generar respuesta con fallback Claude → Groq
// ============================================================
async function generarRespuesta(historial, numero) {
  if (ANTHROPIC_API_KEY) {
    try {
      return await llamarClaude(historial, numero);
    } catch (error) {
      console.error("⚠️ Falló Claude, cayendo a Groq:", error.message);
    }
  } else {
    console.log("⚠️ No hay ANTHROPIC_API_KEY configurada, usando Groq directo");
  }

  if (!GROQ_API_KEY) {
    throw new Error("Claude falló y no hay GROQ_API_KEY configurada para el fallback");
  }
  return await llamarGroq(historial, numero);
}

// ============================================================
// FUNCIÓN: Enviar mensaje por WhatsApp
// ============================================================
async function enviarMensaje(numero, texto) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "text", text: { body: texto } }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`❌ Error enviando a ${numero}:`, JSON.stringify(data));
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }
  console.log(`📤 Meta confirmó envío a ${numero}:`, JSON.stringify(data));
  return data;
}

async function enviarImagen(numero, urlImagen, caption) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numero,
      type: "image",
      image: { link: urlImagen, caption: caption },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`❌ Error enviando imagen a ${numero}:`, JSON.stringify(data));
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }
  console.log(`📤 Imagen enviada a ${numero}`);
  return data;
}

// ============================================================
// MOSTRAR MODELO: arma imagen + caption genérica
// ============================================================
function nombreArchivoImagen(modeloBase) {
  const mapa = {
    "iPhone 11 normal": "iphone11_normal", "iPhone 11 Pro": "iphone11_pro", "iPhone 11 Pro Max": "iphone11_promax",
    "iPhone 12 normal": "iphone12_normal", "iPhone 12 Pro": "iphone12_pro", "iPhone 12 Pro Max": "iphone12_promax",
    "iPhone 13 normal": "iphone13_normal", "iPhone 13 Pro": "iphone13_pro", "iPhone 13 Pro Max": "iphone13_promax",
    "iPhone 14 normal": "iphone14_normal", "iPhone 14 Plus": "iphone14_normal", "iPhone 14 Pro": "iphone14_pro", "iPhone 14 Pro Max": "iphone14_promax",
    "iPhone 15 normal": "iphone15_normal", "iPhone 15 Plus": "iphone15_plus", "iPhone 15 Pro": "iphone15_pro", "iPhone 15 Pro Max": "iphone15_promax",
    "iPhone 16 normal": "iphone16_normal", "iPhone 16 Plus": "iphone16_plus", "iPhone 16 Pro": "iphone16_pro", "iPhone 16 Pro Max": "iphone16_promax",
    "iPhone 17 normal": "iphone17_normal", "iPhone 17 Air": "iphone17_air", "iPhone 17 Pro": "iphone17_pro", "iPhone 17 Pro Max": "iphone17_promax",
  };
  return mapa[modeloBase] || null;
}

function armarMensajeModelo(modeloBase) {
  const archivo = nombreArchivoImagen(modeloBase);
  if (!archivo) return null;

  const urlImagen = `https://crediphone-iasales.onrender.com/images/${archivo}.jpg`;
  const caption = `${modeloBase} 📱\n\n${CAPTION_GENERICA}\n\n${DISPARADOR_CUOTAS}`;

  return { urlImagen, caption };
}

// ============================================================
// API DEL PANEL
// ============================================================
function authPanel(req, res, next) {
  const pwd = req.headers["x-panel-password"] || req.query.pwd;
  if (pwd !== PANEL_PASSWORD) return res.status(401).json({ error: "No autorizado" });
  next();
}

app.get("/api/conversaciones", authPanel, async (req, res) => {
  const claves = await redis.keys("conv:*");
  const lista = [];
  for (const clave of claves) {
    const numero = clave.replace("conv:", "");
    const conv = await redis.get(clave);
    if (!conv) continue;
    const msgs = conv.messages || [];
    const ultimo = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    lista.push({
      numero,
      modoHumano: conv.modoHumano || false,
      ultimoMensaje: conv.ultimoMensaje,
      totalMensajes: msgs.length,
      ultimoTexto: ultimo ? ultimo.content.substring(0, 60) : "",
      ultimoRol: ultimo ? ultimo.role : "",
      etiqueta: conv.etiqueta || null,
    });
  }
  lista.sort((a, b) => new Date(b.ultimoMensaje) - new Date(a.ultimoMensaje));
  res.json(lista);
});

app.get("/api/conversaciones/:numero", authPanel, async (req, res) => {
  const conv = await getConv(req.params.numero);
  res.json({ numero: req.params.numero, modoHumano: conv.modoHumano, ultimoMensaje: conv.ultimoMensaje, messages: conv.messages });
});

app.post("/api/modo-humano/:numero", authPanel, async (req, res) => {
  const conv = await getConv(req.params.numero);
  conv.modoHumano = !conv.modoHumano;
  await saveConv(req.params.numero, conv);
  console.log(`🔄 Modo ${conv.modoHumano ? "HUMANO" : "IA"} para ${req.params.numero}`);
  res.json({ numero: req.params.numero, modoHumano: conv.modoHumano });
});

app.post("/api/etiqueta/:numero", authPanel, async (req, res) => {
  const { etiqueta } = req.body;
  const conv = await getConv(req.params.numero);
  conv.etiqueta = etiqueta || null;
  await saveConv(req.params.numero, conv);
  res.json({ numero: req.params.numero, etiqueta: conv.etiqueta });
});

app.post("/api/responder/:numero", authPanel, async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el texto" });
  const conv = await getConv(req.params.numero);
  conv.messages.push({ role: "assistant", content: texto, timestamp: new Date().toISOString(), enviadoPorHumano: true });
  conv.ultimoMensaje = new Date().toISOString();
  await saveConv(req.params.numero, conv);
  await enviarMensaje(req.params.numero, texto);
  console.log(`👤 Humano envió a ${req.params.numero}: ${texto}`);
  res.json({ ok: true });
});

// ============================================================
// PANEL VISUAL
// ============================================================
app.get("/panel", (req, res) => {
  res.sendFile(__dirname + "/public/panel.html");
});

// ============================================================
// CRON DE SEGUIMIENTO AUTOMÁTICO
// ============================================================

const MENSAJE_3H = "¡Hola de nuevo! Te comento que los equipos están impecables, y ya te incluimos cargador, case, cristal antishock y garantía de 1 año 🎁\n¿Seguimos?";

const MENSAJE_23H = "¡Hola de nuevo! ¿Necesitás ayuda para completar el formulario? 😊\nSi lo completás hoy, te sumamos unos auriculares inalámbricos de regalo 🎧\n¿Seguimos?";

function estaEnHorarioPermitido() {
  const ahoraUTC = new Date();
  const horaParaguay = (ahoraUTC.getUTCHours() - 4 + 24) % 24;
  return horaParaguay >= 6 && horaParaguay < 22;
}

async function revisarSeguimientos() {
  if (!estaEnHorarioPermitido()) {
    console.log("⏰ Fuera de horario permitido (06-22 Paraguay), cron no envía nada esta vez");
    return;
  }

  try {
    const claves = await redis.keys("conv:*");
    for (const clave of claves) {
      const numero = clave.replace("conv:", "");
      const conv = await redis.get(clave);
      if (!conv || conv.modoHumano) continue;

      const horasSinResponder = (Date.now() - new Date(conv.ultimoMensaje).getTime()) / (1000 * 60 * 60);

      if (horasSinResponder >= 3 && horasSinResponder < 23 && !conv.seguimiento3hEnviado) {
        await enviarMensaje(numero, MENSAJE_3H);
        conv.seguimiento3hEnviado = true;
        conv.messages.push({ role: "assistant", content: MENSAJE_3H, timestamp: new Date().toISOString(), esSeguimientoAutomatico: true });
        await saveConv(numero, conv);
        console.log(`⏳ Seguimiento 3h enviado a ${numero}`);
      } else if (
        horasSinResponder >= 23 &&
        horasSinResponder < 24 &&
        conv.etapaSeguimiento === "formulario_enviado" &&
        !conv.seguimiento23hEnviado
      ) {
        await enviarMensaje(numero, MENSAJE_23H);
        conv.seguimiento23hEnviado = true;
        conv.messages.push({ role: "assistant", content: MENSAJE_23H, timestamp: new Date().toISOString(), esSeguimientoAutomatico: true });
        await saveConv(numero, conv);
        console.log(`🎧 Seguimiento 23h (auriculares) enviado a ${numero}`);
      }
    }
  } catch (error) {
    console.error("Error en cron de seguimientos:", error);
  }
}

setInterval(revisarSeguimientos, 15 * 60 * 1000); // corre cada 15 minutos

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
  console.log(`📊 Panel disponible en /panel`);
});
