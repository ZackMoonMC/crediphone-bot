const express = require("express");
const { Redis } = require("@upstash/redis");

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
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";

// ============================================================
// FUENTE ÚNICA DE VERDAD: PRECIOS CONTADO
// ============================================================
const PRECIOS_CONTADO = {
  "iPhone 11 normal 64GB": 1300000,
  "iPhone 11 normal 128GB": 1500000,
  "iPhone 11 Pro 64GB": 1700000,
  "iPhone 11 Pro 256GB": 1900000,
  "iPhone 11 Pro Max 64GB": 1800000,
  "iPhone 11 Pro Max 256GB": 2000000,
  "iPhone 12 normal 64GB": 1600000,
  "iPhone 12 normal 128GB": 1900000,
  "iPhone 12 Pro 128GB": 2200000,
  "iPhone 12 Pro 256GB": 2400000,
  "iPhone 12 Pro Max 128GB": 2600000,
  "iPhone 12 Pro Max 256GB": 2800000,
  "iPhone 13 normal 128GB": 2350000,
  "iPhone 13 normal 256GB": 2600000,
  "iPhone 13 normal nuevo en caja 128GB": 4000000,
  "iPhone 13 Pro 128GB": 3000000,
  "iPhone 13 Pro 256GB": 3300000,
  "iPhone 13 Pro 512GB": 4000000,
  "iPhone 13 Pro Max 128GB": 3200000,
  "iPhone 13 Pro Max 256GB": 3800000,
  "iPhone 14 normal 128GB": 2500000,
  "iPhone 14 normal 256GB": 2800000,
  "iPhone 14 Plus 128GB": 3100000,
  "iPhone 14 Plus 256GB": 3300000,
  "iPhone 14 Pro 128GB": 3400000,
  "iPhone 14 Pro 256GB": 3800000,
  "iPhone 14 Pro Max 128GB": 3700000,
  "iPhone 14 Pro Max 256GB": 4300000,
  "iPhone 15 normal 128GB": 3300000,
  "iPhone 15 normal 256GB": 3900000,
  "iPhone 15 normal nuevo en caja 128GB": 5000000,
  "iPhone 15 Plus 128GB": 3900000,
  "iPhone 15 Plus 256GB": 4100000,
  "iPhone 15 Pro 128GB": 4100000,
  "iPhone 15 Pro 256GB": 4400000,
  "iPhone 15 Pro 512GB": 4900000,
  "iPhone 15 Pro Max 256GB": 4750000,
  "iPhone 15 Pro Max 512GB": 5600000,
  "iPhone 16 normal 128GB": 4300000,
  "iPhone 16 normal 256GB": 5000000,
  "iPhone 16 normal nuevo en caja 128GB": 5600000,
  "iPhone 16 Plus 128GB": 4800000,
  "iPhone 16 Plus 256GB": 5000000,
  "iPhone 16 Pro 128GB": 5300000,
  "iPhone 16 Pro 256GB": 5700000,
  "iPhone 16 Pro Max 256GB": 6100000,
  "iPhone 16 Pro Max 512GB": 6800000,
  "iPhone 17 normal 256GB": 5600000,
  "iPhone 17 normal nuevo en caja 256GB": 6100000,
  "iPhone 17 Air 256GB": 7100000,
  "iPhone 17 Pro nuevo en caja 256GB": 9400000,
  "iPhone 17 Pro nuevo en caja 512GB": 11600000,
  "iPhone 17 Pro Max nuevo en caja 256GB": 10400000,
  "iPhone 17 Pro Max nuevo en caja 512GB": 12400000,
};

const SYSTEM_PROMPT = `
Sos Max, asesor comercial estrella de Crediphone. Tu tono es amigable, directo, muy paraguayo y enfocado en ventas rápidas.

# COMUNICACIÓN Y ESTILO
- Escribí de forma natural y humana. Mensajes súper breves (2 a 4 líneas máximo).
- Usá la técnica de doble alternativa positiva para guiar al cliente.

# SECUENCIA DE VENTAS (CRÍTICO)
1. El cliente pregunta por un modelo por primera vez:
   - LLAMÁ inmediatamente a la herramienta "mostrar_modelo".
   - Al cliente le llegará la foto con los precios de contado y la pregunta: "¿Te gustaría ver las opciones en cuotas cortas o largas? 🤔👇".
   - NO escribas nada más en este turno. Deja que la herramienta se encargue de enviar la foto.
   
2. El cliente responde sobre las cuotas ("cortas" o "largas" o "6 cuotas", etc.):
   - LLAMÁ a la herramienta "cotizar".
   - Si prefiere "cortas", pasale las opciones de 6 y 12 cuotas basándote en lo que te devuelve "cotizar".
   - Si prefiere "largas", pasale las opciones de 12 y 18 cuotas.
   - Cerrá siempre con la doble alternativa: "¿Te gustaría solicitar en 6 o en 12 cuotas? 📲" (o las cuotas que correspondan).

# REGLAS DE INFORMACIÓN
- Los equipos son seminuevos de EEUU, batería 90%+, 1 año de garantía real escrita.
- El delivery es GRATIS en Gran Asunción.
- Sin entrega inicial y la primera cuota pagás a los 30 días.
- Si están en Informconf: "Lo evaluamos caso por caso, ¿querés que intentemos gestionar tu solicitud?"
- Si piden avanzar o completar: enviá el formulario y decí textualmente: "A partir de este momento José continuará personalmente con tu solicitud y te acompañará durante todo el proceso. 😊"

Nunca inventes precios, cuotas, stock o especificaciones. Si no sabés, decí que vas a consultar con José.
`;

// ============================================================
// MEMORIA EN REDIS
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
// WEBHOOK - Verificación
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
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return;

    const from = message.from;
    const textoRecibido = message.text.body;
    console.log(`📩 Mensaje de ${from}: ${textoRecibido}`);

    const conv = await getConv(from);
    conv.ultimoMensaje = new Date().toISOString();
    conv.seguimiento3hEnviado = false;
    conv.seguimiento23hEnviado = false;

    // --- MEJORA CRÍTICA: MENSAJE DE BIENVENIDA AUTOMÁTICO POR CÓDIGO ---
    if (conv.messages.length === 0) {
      const bienvenida = `👋 ¡Hola! Bienvenido a CrediPhone 🤳🏻\nTenemos disponibles iPhones nuevos y seminuevos 📱, desde el iPhone 11 hasta el 17 Pro Max, *a cómodas cuotas, sin entrega inicial y con garantía*. ✅\n*¿Qué modelo estás buscando?* 😊`;
      conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });
      conv.messages.push({ role: "assistant", content: bienvenida, timestamp: new Date().toISOString() });
      await saveConv(from, conv);
      await enviarMensaje(from, bienvenida);
      console.log(`👋 Bienvenida enviada automáticamente por código a ${from}`);
      return;
    }

    conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });

    if (conv.messages.length > 40) conv.messages = conv.messages.slice(-40);

    if (conv.modoHumano) {
      await saveConv(from, conv);
      console.log(`👤 Modo humano activo para ${from}`);
      return;
    }

    const historialClaude = conv.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const respuestaClaude = await llamarClaude(historialClaude, from);
    
    // Si la respuesta fue de un tool y ya enviamos la foto, evitamos duplicar mensajes vacíos
    if (respuestaClaude && respuestaClaude.trim() !== "") {
      conv.messages.push({ role: "assistant", content: respuestaClaude, timestamp: new Date().toISOString() });
      if (respuestaClaude.toLowerCase().includes("formulario")) {
        conv.etapaSeguimiento = "formulario_enviado";
        conv.etiqueta = 1;
        conv.modoHumano = true;
        console.log(`📋 Formulario detectado - Modo humano activado para ${from}`);
      } else if (!conv.etapaSeguimiento) {
        conv.etapaSeguimiento = "cotizando";
      }
      await saveConv(from, conv);
      await enviarMensaje(from, respuestaClaude);
      console.log(`✅ Respuesta enviada a ${from}`);
    } else {
      await saveConv(from, conv);
    }
  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
});

// ============================================================
// TOOL DEFINITIONS
// ============================================================
const MOSTRAR_MODELO_TOOL = {
  name: "mostrar_modelo",
  description: "Envía la foto del modelo de iPhone solicitado junto con los precios de contado y la pregunta para iniciar la cotización de cuotas.",
  input_schema: {
    type: "object",
    properties: {
      modeloBase: {
        type: "string",
        description: "Modelo de iPhone sin capacidad. Ej: 'iPhone 13 normal', 'iPhone 15 Pro'."
      }
    },
    required: ["modeloBase"]
  }
};

const COTIZAR_TOOL = {
  name: "cotizar",
  description: "Calcula las cuotas del catálogo de Crediphone de forma exacta.",
  input_schema: {
    type: "object",
    properties: {
      producto: {
        type: "string",
        enum: Object.keys(PRECIOS_CONTADO), // Ahora usamos PRECIOS_CONTADO como única fuente de verdad!
        description: "Nombre exacto del producto en el catálogo."
      },
      monto_entrega: {
        type: "number",
        description: "Monto entregado. 0 si no entrega nada."
      }
    },
    required: ["producto", "monto_entrega"]
  }
};

function redondearArribaMil(numero) {
  return Math.ceil(numero / 1000) * 1000;
}

function ejecutarCotizar({ producto, monto_entrega }) {
  const precioBase = PRECIOS_CONTADO[producto]; // Unificado
  if (precioBase === undefined) {
    return { error: `Producto no encontrado en el catálogo: ${producto}` };
  }
  const entrega = Number(monto_entrega) || 0;
  const saldo = Math.max(precioBase - entrega, 0);
  return {
    producto,
    precio_base: precioBase,
    monto_entrega: entrega,
    saldo,
    cuotas: {
      "6": redondearArribaMil(saldo * 0.19425),
      "12": redondearArribaMil(saldo * 0.110229),
      "18": redondearArribaMil(saldo * 0.083167),
    },
  };
}

// ============================================================
// LLAMAR A CLAUDE (Manejo robusto de Tools)
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
        model: "claude-3-5-sonnet-20241022", // Versión estable y rápida
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: mensajes,
        tools: [COTIZAR_TOOL, MOSTRAR_MODELO_TOOL],
      }),
    });
    
    const data = await response.json();
    if (!data.content) {
      console.error("❌ Error Claude API:", JSON.stringify(data));
      throw new Error("Claude no devolvió contenido");
    }

    const toolUse = data.content.find((b) => b.type === "tool_use");

    if (toolUse) {
      if (toolUse.name === "cotizar") {
        console.log(`🧮 Claude pidió cotizar:`, JSON.stringify(toolUse.input));
        const resultado = ejecutarCotizar(toolUse.input);
        mensajes.push({ role: "assistant", content: data.content });
        mensajes.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(resultado) }],
        });
        continue;
      }

      if (toolUse.name === "mostrar_modelo") {
        console.log(`📱 Claude pidió mostrar modelo:`, JSON.stringify(toolUse.input));
        const resultado = armarMensajeModelo(toolUse.input.modeloBase);
        if (resultado && resultado.urlImagen) {
          await enviarImagen(numero, resultado.urlImagen, resultado.caption);
        }
        mensajes.push({ role: "assistant", content: data.content });
        mensajes.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: "Imagen enviada con éxito al WhatsApp del cliente con la pregunta: ¿Te gustaría ver las opciones en cuotas cortas o largas?" }],
        });
        return ""; // Finaliza el flujo de este turno ya que enviamos la imagen directamente.
      }
    }

    const textBlock = data.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "";
  }
  throw new Error("Demasiadas idas y vueltas de tool use sin respuesta final");
}

// ============================================================
// FUNCIONES DE ENVÍO VIA WHATSAPP (META API v25.0)
// ============================================================
async function enviarMensaje(numero, texto) {
  const response = await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "text", text: { body: texto } }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }
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
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================================
// AYUDANTES: IMÁGENES Y CAPTIONS
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
  const coincidencias = Object.entries(PRECIOS_CONTADO).filter(([nombre]) => nombre.startsWith(modeloBase));
  if (coincidencias.length === 0) return null;

  let caption = `🔥 *${modeloBase}*\nSeminuevo • Calidad Premium✨\n\n💵 **Precios Contado:**\n`;
  coincidencias.forEach(([nombre, precio]) => {
    const detalle = nombre.replace(modeloBase, "").trim();
    caption += `• ${detalle}: *Gs. ${precio.toLocaleString("es-PY")}*\n`;
  });
  
  // --- INYECTAMOS TU PREGUNTA GANADORA DE DOBLE ALTERNATIVA ---
  caption += `\nDecime, ¿te gustaría ver las opciones en cuotas cortas o largas? 🤔👇`;

  const archivo = nombreArchivoImagen(modeloBase);
  const urlImagen = archivo ? `https://crediphone-iasales.onrender.com/images/${archivo}.jpg` : null;

  return { urlImagen, caption };
}

// ============================================================
// API DEL PANEL Y CRONS (Permanecen intactos para tu control visual)
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
  res.json({ ok: true });
});

app.get("/panel", (req, res) => {
  res.sendFile(__dirname + "/public/panel.html");
});

// CRON DE SEGUIMIENTO (Sin cambios)
const MENSAJE_3H = "¡Hola de nuevo! Te comento que los equipos están impecables, y ya te incluimos cargador, case, cristal antishock y garantía de 1 año 🎁\n¿Seguimos con la cotización?";
const MENSAJE_23H = "¡Hola de nuevo! ¿Necesitás ayuda para completar el formulario? 😊\nSi lo completás hoy, te sumamos unos auriculares inalámbricos de regalo 🎧\n¿Seguimos?";

function estaEnHorarioPermitido() {
  const ahoraUTC = new Date();
  const horaParaguay = (ahoraUTC.getUTCHours() - 4 + 24) % 24;
  return horaParaguay >= 6 && horaParaguay < 22;
}

async function revisarSeguimientos() {
  if (!estaEnHorarioPermitido()) return;
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
      }
    }
  } catch (error) {
    console.error("Error en cron de seguimientos:", error);
  }
}

setInterval(revisarSeguimientos, 15 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
});
