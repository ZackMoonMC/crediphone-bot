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
// Completá vos esta parte (precio contado, condiciones, etc.)
const CAPTION_GENERICA = "Abonando en efectivo o transferencia.";

// Línea fija: SIEMPRE va al final de la caption, la pone el código.
const DISPARADOR_CUOTAS = "¿Te gustaría conocer las cuotas de este modelo?";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";

const SYSTEM_PROMPT = `Sos Max. Cuando el cliente escriba cualquier cosa, llamá SIEMPRE a la función mostrar_modelo con modeloBase="iPhone 13 Pro". No respondas nada en texto, solo usá la herramienta.`;

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
    const esPrimerMensaje = conv.messages.length === 0;
    conv.ultimoMensaje = new Date().toISOString();
    conv.seguimiento3hEnviado = false;
    conv.seguimiento23hEnviado = false;
    conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });
 
    if (conv.messages.length > 40) conv.messages = conv.messages.slice(-40);
 
    if (esPrimerMensaje) {
      const bienvenida = `👋 ¡Hola! Bienvenido a CrediPhone 🤳🏻
Tenemos disponibles iPhones nuevos y seminuevos 📱, desde el iPhone 11 hasta el 17 Pro Max, *a cómodas cuotas, sin entrega inicial y con garantía*. ✅
*¿Qué modelo estás buscando?* 😊`;
      await enviarMensaje(from, bienvenida);
      conv.messages.push({ role: "assistant", content: bienvenida, timestamp: new Date().toISOString() });
      await saveConv(from, conv);
      console.log(`👋 Bienvenida enviada a ${from}`);
      return;
    }
 
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
    if (respuestaClaude.includes(LINK_FORMULARIO)) {
      conv.etapaSeguimiento = "formulario_enviado"; // uso interno del cron de seguimiento, no tocar
      conv.etiqueta = 1; // Formulario -> mueve la tarjeta en el Pipeline y dispara la alerta visual
      conv.modoHumano = true;
      console.log(`📋 Formulario detectado (link exacto) - Modo humano activado para ${from}`);
    } else if (!conv.etapaSeguimiento) {
      conv.etapaSeguimiento = "cotizando";
    }
    await saveConv(from, conv);
  
 
    await enviarMensaje(from, respuestaClaude);
    console.log(`✅ Respuesta enviada a ${from}`);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
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
