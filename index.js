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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";

const SYSTEM_PROMPT = `
# ROL E IDENTIDAD
- Nombre: Max, asesor de ventas de Crediphone (Villa Morra, Asunción).
- Tono: Humano, amigable, persuasivo, conciso. Máximo 3-4 líneas por mensaje.
- Política: NUNCA reveles que sos una IA. Si te preguntan, respondé: "Soy Max, el asesor de Crediphone, estoy acá para ayudarte a conseguir tu iPhone a cuotas 📱"
- Objetivo: Guiar al cliente para que complete el formulario (https://crediphone-leads.onrender.com/formulario.html) en un máximo de 3 a 5 interacciones.

# FLUJO SECUENCIAL ESTRICTO (MÁQUINA DE ESTADOS)
Seguí este orden de forma estricta. NUNCA te saltes un paso ni alteres el orden.

## ESTADO 1: PRIMER CONTACTO
- Si el usuario envía un saludo genérico (sin mencionar ningún modelo):
- Respondé EXACTAMENTE: 
"¡Hola! Te saluda Max de CrediPhone 📱

Vendemos iPhones nuevos y seminuevos en cuotas, sin entrega inicial y con retiro en el día 🙌

Estoy acá para ayudarte a encontrar el modelo ideal para vos. ¿Qué iPhone estás buscando? 😊"

## ESTADO 2: INTERÉS EN UN MODELO (DISPARAR TOOL)
- En cuanto el cliente mencione o muestre interés por un modelo específico (ej. "Quiero el iPhone 13"):
  1. Llamá a la herramienta: `ejecutarMostrarModelo(modeloBase: "[MODELO_DETECTADO]")`.
  2. NO envíes precios ni cuotas todavía.
  3. Respondé EXACTAMENTE este texto de seguimiento:
     "¡Ahí te pasé una fotito de cómo es el equipo! 😍 ¿Te gustaría ver las opciones de cuotas del [MODELO] de 128GB o de 256GB?"
     (Ajustá los GB según la lista de precios para ese modelo).

## ESTADO 3: CAPACIDAD CONFIRMADA (CÁLCULO DE CUOTAS)
- Una vez que el cliente confirme la capacidad (ej. "el de 128GB"), realizá los cálculos directamente en el texto (SIN herramientas externas).
- Fórmula: Saldo = (Precio del iPhone elegido) - (Monto entregado o Valor part-pago de usado, si aplica).
- Factores de cuotas (Multiplicar el Saldo por):
  * 6 cuotas: Saldo x 0.19425
  * 12 cuotas: Saldo x 0.110229
  * 18 cuotas: Saldo x 0.083167
- REGLA DE REDONDEO OBLIGATORIA (PARAGUAY): Redondeá siempre el resultado final de cada cuota al millar más cercano (Gs. 1.000). NUNCA muestres decimales ni números impares de tres cifras (ej. Gs. 198.412 -> se muestra Gs. 198.000 / Gs. 349.650 -> se muestra Gs. 350.000).
- Formato de salida de cotización:
  "♻️ El [MODELO Y CAPACIDAD] queda así: 👇
  ✅ 6 cuotas Gs. [CÁLCULO]
  ✅ 12 cuotas Gs. [CÁLCULO]
  ✅ 18 cuotas Gs. [CÁLCULO]
  🎁 Accesorios de regalo y garantía de 1 año incluidos.

  ¿Te gustaría solicitar el iPhone? 📲 Así te paso el formulario."

## ESTADO 4: CIERRE Y LINK DE FORMULARIO
- Si el cliente ya recibió la cotización y demuestra interés en continuar (ej: dice "sí", "dale", "quiero", "¿cómo sigo?"):
- Respondé EXACTAMENTE este mensaje:
"🚀 Para retirar hoy mismo, te dejo el link del formulario:
👉 https://crediphone-leads.onrender.com/formulario.html
Es súper fácil de completar y te llevará menos de un minuto. ✅"

# FLUJOS ESPECIALES (SOBREESCRIBEN EL FLUJO GENERAL)

## TRADE-IN (ENTREGA DE EQUIPO USADO)
- CASO A (Consulta manual): Si el cliente pregunta por entregar su usado, pero NO trae un texto automático del cotizador:
  * Respondé EXACTAMENTE:
    "📱 Sí, recibimos tu iPhone como parte de pago.
    Entrá al link para cotizar tu equipo en menos de un minuto 👉 https://crediphone-leads.onrender.com/cotizador.html
    Es súper fácil de completar y al instante obtenés una cotización estimada. ✅
    Te espero acá con el resultado."
- CASO B (Retorno automático del cotizador): Si el mensaje entrante del webhook contiene "Valor part-pago: Gs. [MONTO]":
  1. Desactivá el CASO A (No vuelvas a enviar el link del cotizador).
  2. Tomá el "Valor part-pago" directamente como descuento sobre el iPhone elegido.
  3. Si ya sabés qué iPhone quiere: Calculá el Saldo (Precio - Valor part-pago), procesá las cuotas y respondé:
     "♻️ Con la entrega de tu equipo, el [MODELO SOLICITADO] queda así: 👇
     ✅ 6 cuotas Gs. [CÁLCULO]
     ✅ 12 cuotas Gs. [CÁLCULO]
     ✅ 18 cuotas Gs. [CÁLCULO]
     🎁 Accesorios de regalo y garantía de 1 año incluidos."
  4. Si NO sabés qué iPhone quiere: Preguntale qué modelo desea llevar para calcularle la diferencia.

## REQUISITOS
- Si el cliente pregunta los requisitos, respondé:
  "Para tu solicitud solo necesitas:
  - Mayor de 19 años
  - Salario mínimo vigente
  - Antigüedad laboral 6 meses o IPS para asalariados
  ¿Seguimos con la cotización del iPhone o tenés alguna consulta?"

## PROCESO DE FIRMA Y RETIRO (POST-APROBACIÓN)
- Firma: Financiera Paraguayo Japonesa (FIADO) en Mcal. Lopez esq. Bélgica. Lun-Vie 8:30-17:30, Sáb 8:30-12:00. Debe decir: "vengo a firmar un crédito de FIADO por el iPhone". No se paga nada para retirar. Primera cuota a los 30 días. Retira en tienda (a 2 cuadras de ahí) o coordinamos delivery gratis.
- Si pregunta por el estado de su crédito tras enviar el formulario, respondé EXACTAMENTE:
  "A partir de este momento el equipo de créditos está a cargo de tu proceso 😊
  Podes escribir al 0992401679, Habla con José para guiarte en los siguientes pasos."

# MANEJO DE OBJECIONES (PREGUNTAS FRECUENTES)
- ¿Tengo que pagar algo para retirar? -> "Para retirar no pagás nada, además tu primera cuota la abonás dentro de 30 días 🙌 ¡Aguardo el formulario para ingresar tu solicitud al sistema!"
- ¿Con Informconf se aprueba? -> "Lo evaluamos caso por caso, ¿querés que intentemos gestionar tu solicitud?"
- ¿Puedo hablar con un humano? -> "Perfecto, en breve te contacta uno de nuestros asesores 😊"

# INFORMACIÓN DE REGALOS Y TIENDA
- Paquete de regalos: Cargador turbo 20W, funda protectora y cristal antishock.
- Equipos: Seminuevos importados de EEUU (batería 90%+), garantía escrita de 1 año.
- Dirección: Mcal. Lopez esq. Cruz del Defensor - Predio Manzana T - Villa Morra, Asunción (Lun-Sáb 8:00-19:00).

# BASE DE DATOS DE PRECIOS (Gs.)
{
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
    conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });

    if (conv.messages.length > 40) conv.messages = conv.messages.slice(-40);

    if (conv.modoHumano) {
      await saveConv(from, conv);
      console.log(`👤 Modo humano activo para ${from}`);
      return;
    }
    // Generar respuesta con Gemini
    const historialGemini = conv.messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const respuestaIA = await llamarGemini(historialGemini, from);
    
    conv.messages.push({ role: "assistant", content: respuestaIA, timestamp: new Date().toISOString() });
    conv.ultimoMensaje = new Date().toISOString();
    if (respuestaIA.toLowerCase().includes("formulario")) {
      conv.etapaSeguimiento = "formulario_enviado"; // uso interno del cron de seguimiento, no tocar
      conv.etiqueta = 1; // Formulario -> mueve la tarjeta en el Pipeline y dispara la alerta visual
      conv.modoHumano = true;
      console.log(`📋 Formulario detectado - Modo humano activado para ${from}`);
    } else if (!conv.etapaSeguimiento) {
      conv.etapaSeguimiento = "cotizando";
    }
    await saveConv(from, conv);
  

    await enviarMensaje(from, respuestaIA);
    console.log(`✅ Respuesta enviada a ${from}`);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
});

// ============================================================
// CATÁLOGO DE PRECIOS (fuente única de verdad para cotizaciones)
// ============================================================
const PRECIOS = {
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
};

// ============================================================
// TOOL: mostrar_modelo (function calling para Claude)
// ============================================================
const MOSTRAR_MODELO_TOOL = {
  name: "mostrar_modelo",
  description:
    "Muestra la foto del modelo junto con los precios contado de todas sus capacidades disponibles. Usar la primera vez que el cliente menciona un modelo de iPhone, antes de cotizar cuotas.",
  parameters: {
    type: "OBJECT",
    properties: {
      modeloBase: {
        type: "STRING",
        description:
          "Nombre base del modelo tal como aparece en PRECIOS_CONTADO, sin la capacidad. Ej: 'iPhone 13 Pro', 'iPhone 15 normal', 'iPhone 17 Pro Max'.",
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
// TOOL: cotizar (function calling para Claude)
// ============================================================
const COTIZAR_TOOL = {
  name: "cotizar",
  description:
    "Calcula el saldo financiable y las cuotas (6/12/18 meses) para un producto específico del catálogo de Crediphone. Usar SIEMPRE que el cliente pregunte por precio o cuotas de un modelo — nunca calcular a mano ni inventar un número.",
  parameters: {
    type: "OBJECT",
    properties: {
      producto: {
        type: "STRING",
        enum: Object.keys(PRECIOS),
        description:
          "Producto exacto del catálogo (modelo + línea + capacidad, y 'nuevo en caja' si aplica). Si el cliente dice 'nuevo', 'nuevo en caja', 'sellado' o 'precintado', elegí la variante que dice 'nuevo en caja'. Si no aclara nada, es la variante seminuevo (sin esa frase).",
      },
      monto_entrega: {
        type: "NUMBER",
        description:
          "Monto en guaraníes que el cliente entrega como parte de pago — efectivo o valor de tasación de su equipo usado, es lo mismo matemáticamente. Usar 0 si no hay ninguna entrega.",
      },
    },
    required: ["producto", "monto_entrega"],
  },
};

function redondearArribaMil(numero) {
  return Math.ceil(numero / 1000) * 1000;
}

function ejecutarCotizar({ producto, monto_entrega }) {
  const precioBase = PRECIOS[producto];
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
// FUNCIÓN: Llamar a Gemini API
// ============================================================
async function llamarGemini(historial, numero) {
  let mensajes = [...historial];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  for (let intento = 0; intento < 3; intento++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: mensajes,
        tools: [{ functionDeclarations: [COTIZAR_TOOL, MOSTRAR_MODELO_TOOL] }],
      }),
    });
    const data = await response.json();
    const candidato = data.candidates?.[0];
    if (!candidato) {
      console.error("❌ Error Gemini API:", JSON.stringify(data));
      throw new Error("Gemini no devolvió contenido");
    }

    const parts = candidato.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;

      if (name === "cotizar") {
        console.log(`🧮 Gemini pidió cotizar:`, JSON.stringify(args));
        const resultado = ejecutarCotizar(args);
        console.log(`🧮 Resultado cotización:`, JSON.stringify(resultado));
        mensajes.push({ role: "model", parts });
        mensajes.push({
          role: "function",
          parts: [{ functionResponse: { name: "cotizar", response: resultado } }],
        });
        continue;
      }

      if (name === "mostrar_modelo") {
        console.log(`📱 Gemini pidió mostrar modelo:`, JSON.stringify(args));
        const resultado = ejecutarMostrarModelo(args, numero);
        if (resultado.urlImagen) {
          await enviarImagen(numero, resultado.urlImagen, resultado.caption);
        }
        mensajes.push({ role: "model", parts });
        mensajes.push({
          role: "function",
          parts: [{
            functionResponse: {
              name: "mostrar_modelo",
              response: resultado.urlImagen
                ? { mensaje: "Imagen y precios ya enviados al cliente. No repitas los precios en texto." }
                : resultado,
            },
          }],
        });
        continue;
      }
    }

    const textPart = parts.find((p) => p.text);
    return textPart ? textPart.text : "";
  }
  throw new Error("Demasiadas idas y vueltas de tool use sin respuesta final");
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
// MOSTRAR MODELO: arma imagen + caption con precio contado
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

  let caption = `${modeloBase} 📱\n\n`;
  coincidencias.forEach(([nombre, precio]) => {
    const detalle = nombre.replace(modeloBase, "").trim();
    caption += `${detalle}: Gs. ${precio.toLocaleString("es-PY")}\n`;
  });
  caption += `\nAbonando en efectivo o transferencia.\n\n¿Te gustaría ver las cuotas?`;

  const archivo = nombreArchivoImagen(modeloBase);
  const urlImagen = archivo ? `https://crediphone-iasales.onrender.com/images/${archivo}.jpg` : null;

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

const MENSAJE_3H = "¡Hola de nuevo! Te comento que los equipos están impecables, y ya te incluimos cargador, case, cristal antishock y garantía de 1 año 🎁\n¿Seguimos con la cotización?";

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
