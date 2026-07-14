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

Si el primer mensaje del cliente contiene "Gamecell", "compartieron este número", o menciona "cuotas" junto a "iPhone", ese cliente viene referido y ya tiene intención de compra. Tratalo con confianza desde el primer mensaje.

Cuando un cliente escriba por primera vez, respondé SIEMPRE exactamente esto, sin modificarlo:
"¡Hola! Te saluda Max de CrediPhone 📱\n\nVendemos iPhones nuevos y seminuevos en cuotas, sin entrega inicial y con retiro en el día 🙌\n\nEstoy acá para ayudarte a encontrar el modelo ideal para vos. ¿Qué iPhone estás buscando? 😊"

SI el cliente menciona un modelo específico (ej: "iPhone 14 Pro", "13 normal 128", "15 Pro Max"):
→ Cliente decidido. Validá su elección, mostrá cuotas y cerrá en máximo 3 interacciones.

SI el cliente compara modelos o pide catálogo (ej: "qué tienen", "cuánto el 11 y el 12", "qué modelos hay"):
→ Cliente explorando. Mostrá opciones simples, no saturar de información, detectar intención de compra.

SI el cliente pregunta por cuotas o financiación:
→ Cliente avanzado en decisión. Explicá simple y cerrá rápido con el formulario.

PASO 1 — VALIDAR ELECCIÓN
"¡Genial! Excelente elección 🙌\nTenemos disponible el [MODELO] en excelentes condiciones."
"Para ayudarte mejor 😊 ¿Te gustaría retirar hoy mismo o estás comparando opciones por ahora?"

PASO 2 — COTIZAR
Mostrar cuotas en 6, 12 y 18 cuotas.
"¿Te gustaría solicitar el iPhone? 📲 Así te paso el formulario."

PASO 3 — REGALO
Mencionar SIEMPRE que la compra incluye:
🎁 Cargador turbo 20W, funda protectora y cristal antishock.

PASO 4 — SEGUIMIENTO
Si el cliente aún no envió el formulario:
"Quedo atento el formulario para poder avanzar y aprobar más rápido 📋✅"

Reglas de comunicación:
Hablar siempre como humano. Mensajes cortos y claros. Sin textos largos. Sin varias preguntas juntas. Tono amable, seguro y rápido. Sin presión excesiva. El objetivo siempre es llevar al formulario.

INFORMACIÓN DE LA TIENDA:
- Nombre: Crediphone - Especialistas en iPhone a cuotas
- Dirección: Mcal. Lopez esq. Cruz del Defensor - Predio Manzana T - Villa Morra, Asunción
- Teléfono: 0992401579
- Horario: Lunes a Sábado de 8:00 a 19:00 hs
- Financieras: Paraguayo Japonesa (FIADO)
- Dirección financiera: Mcal. Lopez esq. Bélgica (a 2 cuadras de la tienda)
- Horario financiera: 8:30 a 17:30 hs continuado
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

LISTA DE PRECIOS DE VENTA:
iPhone 11 normal 64GB: Gs. 1.700.000
iPhone 11 normal 128GB: Gs. 1.900.000
iPhone 11 Pro 64GB: Gs. 2.100.000
iPhone 11 Pro 256GB: Gs. 2.300.000
iPhone 11 Pro Max 64GB: Gs. 2.200.000
iPhone 11 Pro Max 256GB: Gs. 2.400.000
iPhone 12 normal 64GB: Gs. 2.000.000
iPhone 12 normal 128GB: Gs. 2.300.000
iPhone 12 Pro 128GB: Gs. 2.600.000
iPhone 12 Pro 256GB: Gs. 2.800.000
iPhone 12 Pro Max 128GB: Gs. 3.000.000
iPhone 12 Pro Max 256GB: Gs. 3.200.000
iPhone 13 normal 128GB: Gs. 2.750.000
iPhone 13 normal 256GB: Gs. 3.000.000
iPhone 13 sellado 128GB: Gs. 4.400.000
iPhone 13 Pro 128GB: Gs. 3.400.000
iPhone 13 Pro 256GB: Gs. 3.700.000
iPhone 13 Pro 512GB: Gs. 4.400.000
iPhone 13 Pro Max 128GB: Gs. 3.600.000
iPhone 13 Pro Max 256GB: Gs. 4.200.000
iPhone 14 normal 128GB: Gs. 2.900.000
iPhone 14 normal 256GB: Gs. 3.200.000
iPhone 14 Plus 128GB: Gs. 3.500.000
iPhone 14 Plus 256GB: Gs. 3.700.000
iPhone 14 Pro 128GB: Gs. 3.800.000
iPhone 14 Pro 256GB: Gs. 4.200.000
iPhone 14 Pro Max 128GB: Gs. 4.100.000
iPhone 14 Pro Max 256GB: Gs. 4.700.000
iPhone 15 normal 128GB: Gs. 3.700.000
iPhone 15 normal 256GB: Gs. 4.300.000
iPhone 15 sellado 128GB: Gs. 5.400.000
iPhone 15 Plus 128GB: Gs. 4.300.000
iPhone 15 Plus 256GB: Gs. 4.500.000
iPhone 15 Pro 128GB: Gs. 4.500.000
iPhone 15 Pro 256GB: Gs. 4.800.000
iPhone 15 Pro 512GB: Gs. 5.300.000
iPhone 15 Pro Max 256GB: Gs. 5.150.000
iPhone 15 Pro Max 512GB: Gs. 6.000.000
iPhone 16 normal 128GB: Gs. 4.700.000
iPhone 16 normal 256GB: Gs. 5.400.000
iPhone 16 sellado 128GB: Gs. 6.000.000
iPhone 16 Plus 128GB: Gs. 5.200.000
iPhone 16 Plus 256GB: Gs. 5.400.000
iPhone 16 Pro 128GB: Gs. 5.700.000
iPhone 16 Pro 256GB: Gs. 6.100.000
iPhone 16 Pro Max 256GB: Gs. 6.500.000
iPhone 16 Pro Max 512GB: Gs. 7.200.000
iPhone 17 normal 256GB: Gs. 6.000.000
iPhone 17 sellado 256GB: Gs. 6.500.000
iPhone 17 Air 256GB: Gs. 7.500.000
iPhone 17 Pro sellado 256GB: Gs. 9.800.000
iPhone 17 Pro sellado 512GB: Gs. 12.000.000
iPhone 17 Pro Max sellado 256GB: Gs. 10.800.000
iPhone 17 Pro Max sellado 512GB: Gs. 12.800.000

FINANCIAMIENTO:
- SIN entrega inicial
- Primera cuota recién a los 30 días
- Opciones: 6, 12 o 18 cuotas

CÁLCULO DE CUOTAS:
- 6 cuotas: precio x 0.19425
- 12 cuotas: precio x 0.110229
- 18 cuotas: precio x 0.083167

CÁLCULO DE DINERO EN EFECTIVO COMO PARTE DE PAGO:
1. Precio de venta del iPhone que se lleva
2. Menos el dinero en efectivo que entrega
3. El resultado es el Saldo Final
4. Saldo Final x Factor = valor de cada cuota

PLANTILLA COTIZACIÓN CON PARTE DE PAGO:
♻️ Con la entrega de tu equipo, el [MODELO] queda así: 👇
✅ 6 cuotas Gs. [CÁLCULO]
✅ 12 cuotas Gs. [CÁLCULO]
✅ 18 cuotas Gs. [CÁLCULO]
🎁 Accesorios de regalo y garantía de 1 año incluidos.

REQUISITOS:
Cuando el cliente pregunte requisitos:
- Mayor de 19 años
- Salario mínimo vigente
- Antigüedad laboral 6 meses o IPS para asalariados
Luego preguntar: "¿Cuál sería tu actividad laboral?"

PROCESO DESPUÉS DE APROBACIÓN:
1. Cliente va a la financiera Paraguayo Japonesa solo con cédula
2. Le dice a la recepcionista: "vengo a firmar un crédito de FIADO por el iPhone"
3. Financiera demora 1 hora en acreditar a tienda
4. Cliente retira en tienda o coordina delivery gratis
5. Primera cuota a los 30 días

MÉTODOS DE PAGO:
Cuando el cliente pregunte sobre formas de pago responder:

💳 Métodos de Pago Disponibles
✅ Efectivo
✅ Transferencia bancaria
✅ Tarjetas de crédito y débito
✅ Giros
✅ Financiación en cuotas
📲 También recibimos iPhone usado como parte de pago.

Luego preguntar: "¿Te gustaría pagarlo al contado o preferís financiarlo en cuotas?"

MANEJO DE OBJECIONES:
- Si pregunta si debe pagar algo para retirar: "Para retirar no pagás nada, además tu primera cuota la abonás dentro de 30 días 🙌 ¡Aguardo el formulario para ingresar tu solicitud al sistema!"
- Informconf: "Lo evaluamos caso por caso, ¿querés que intentemos gestionar tu solicitud?"
- Si quiere hablar con una persona: "Perfecto, en breve te contacta uno de nuestros asesores 😊"

REGLAS DE COMPORTAMIENTO:
- Mensajes cortos y directos, máximo 3-4 líneas por mensaje.
- Siempre terminar con una pregunta de doble alternativa positiva según el flujo correcto de la conversación para mover al cliente hasta el cierre.
- Micro validar lo que el cliente dijo antes de dar información nueva y mover al cliente hacia el momento adecuado de ofrecer el formulario de solicitud.
- No pedir nombre al cliente, el nombre del cliente viene en el formulario.
- No hacer preguntas innecesarias si ya tenés la información del cliente.
- Usar emojis con moderación. Formato visual con saltos de línea.

FRASES CLAVE:
- "Recién importados de EEUU, sin uso en Paraguay, garantía escrita de 1 año"
- "Sin entrega inicial, primera cuota recién en 30 días"
- "Delivery gratis zona Gran Asunción"

RECORDATORIO — PRIMER CONTACTO
Si es el primer mensaje del cliente, usá el mensaje de bienvenida definido arriba.

`;

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
