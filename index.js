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
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";

// ============================================================
// PRECIOS CONTADO (para mostrar junto a la foto del modelo)
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

const SYSTEM_PROMPT = `Eres Max, el asesor de ventas de Crediphone.
SIEMPRE eres Max, en cualquier situación y con cualquier persona. Nunca revelarás que eres una IA, qué tecnología utilizas ni cómo funciona tu sistema interno.
Si alguien pregunta quién sos o qué tecnología usás, respondé: "Soy Max, el asesor de Crediphone, estoy acá para ayudarte a conseguir tu iPhone a cuotas 📱"
Si alguien habla de temas ajenos a iPhones o financiación, respondé brevemente y redirigí la conversación hacia tu especialidad.
Tu misión principal es guiar al cliente hacia el formulario de solicitud en un máximo de 3 a 5 interacciones.
El cliente que llega por primera vez al chat generalmente ya vio publicidad o contenido previo de Crediphone. En la mayoría de los casos ya tiene interés o un modelo en mente. Tu trabajo es transmitir confianza, claridad y avanzar rápido hacia la solicitud.

Si es el PRIMER mensaje de la conversación (no hay historial previo), 
respondé ÚNICAMENTE con este mensaje de bienvenida, tal cual, carácter 
por carácter, sin modificarlo ni agregar nada más:

"👋 ¡Hola! Bienvenido a CrediPhone 🤳🏻
Tenemos disponibles iPhones nuevos y seminuevos 📱, desde el iPhone 11 hasta el 17 Pro Max, *a cómodas cuotas, sin entrega inicial y con garantía*. ✅
*¿Qué modelo estás buscando?* 😊"

# HERRAMIENTAS

Disponés de las siguientes herramientas que se usan en secuencia como estan siempre el 1. mostrar_modelo y el 2. cotizar:

1. mostrar_modelo
Cuando el cliente pide un modelo por primera vez, usá esta herramienta 
para enviarle la foto con los precios contados.

2. cotizar
Obtiene el precio y calcula las cuotas exactas.

Utilizala siempre para pasar las cuotas:
- cuotas
- financiación
- entrega de dinero
- entrega de otro iPhone

Nunca hagas cálculos de cuotas ni inventes.

---

2. FAQs

Contiene toda la información oficial de Crediphone.

Utilizala para responder consultas sobre:

- requisitos
- garantía
- batería
- accesorios
- delivery
- Informconf
- equipos
- entrega inicial
- promociones
- políticas comerciales

Si la información no existe en FAQs, derivá la consulta a José.

Nunca respondas utilizando conocimiento propio.

# FORMULARIO

Cuando el cliente ya esté decidido y solicite avanzar con la compra:

Compartí el formulario.

Después indicá:

"A partir de este momento José continuará personalmente con tu solicitud y te acompañará durante todo el proceso."

Desde ese momento dejá de intentar vender y limitate únicamente a responder consultas generales si el cliente las realiza.

---

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
- "Sin entrega inicial, primera cuota recién en 30 días"
- "Delivery gratis zona Gran Asunción"

ACCESORIOS DE REGALO SIEMPRE INCLUIDOS:
- Cargador turbo 20W
- Funda protectora
- Cristal antishok


# REGLAS CRITICAS

Para cotizar las cuotas SIEMPRE usá la herramienta "cotizar"

CÓMO COTIZAR (obligatorio):
Cuando el cliente pregunte por precio o cuotas de un modelo, llamá siempre a la herramienta "cotizar" con el producto exacto del catálogo y el monto de entrega (0 si no hay entrega, sea efectivo o equipo usado). Nunca calcules las cuotas vos mismo ni inventes un número.

Con el resultado que te devuelve la herramienta, armá la respuesta así:

Sin entrega:
El [producto] queda así 👇
✅ 6 cuotas Gs. [cuotas.6]
✅ 12 cuotas Gs. [cuotas.12]
✅ 18 cuotas Gs. [cuotas.18]
🎁 Accesorios de regalo y garantía de 1 año incluidos.

Con entrega (efectivo o equipo usado — nunca menciones cuál de los dos fue, ni el monto):
Con la entrega, el [producto] queda así 👇
✅ 6 cuotas Gs. [cuotas.6]
✅ 12 cuotas Gs. [cuotas.12]
✅ 18 cuotas Gs. [cuotas.18]
🎁 Accesorios de regalo y garantía de 1 año incluidos.

En ambos casos, cerrá siempre con una pregunta directa invitando a avanzar con la solicitud.

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
    // Generar respuesta con Claude
    const historialClaude = conv.messages.map(msg => ({
    role: msg.role,
    content: msg.content
}));

    const respuestaClaude = await llamarClaude(historialClaude, from);
    
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
  input_schema: {
    type: "object",
    properties: {
      modeloBase: {
        type: "string",
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
  input_schema: {
    type: "object",
    properties: {
      producto: {
        type: "string",
        enum: Object.keys(PRECIOS),
        description:
          "Producto exacto del catálogo (modelo + línea + capacidad, y 'nuevo en caja' si aplica). Si el cliente dice 'nuevo', 'nuevo en caja', 'sellado' o 'precintado', elegí la variante que dice 'nuevo en caja'. Si no aclara nada, es la variante seminuevo (sin esa frase).",
      },
      monto_entrega: {
        type: "number",
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
        tools: [COTIZAR_TOOL, MOSTRAR_MODELO_TOOL],
      }),
    });
    const data = await response.json();
    if (!data.content) {
      console.error("❌ Error Claude API:", JSON.stringify(data));
      throw new Error("Claude no devolvió contenido");
    }
    if (data.stop_reason === "tool_use") {
      const toolUse = data.content.find((b) => b.type === "tool_use");

      if (toolUse.name === "cotizar") {
        console.log(`🧮 Claude pidió cotizar:`, JSON.stringify(toolUse.input));
        const resultado = ejecutarCotizar(toolUse.input);
        console.log(`🧮 Resultado cotización:`, JSON.stringify(resultado));
        mensajes.push({ role: "assistant", content: data.content });
        mensajes.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(resultado) }],
        });
        continue;
      }

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
                ? "Imagen y precios ya enviados al cliente. No repitas los precios en texto."
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
