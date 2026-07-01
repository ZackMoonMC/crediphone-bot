const express = require("express");
// Node.js 22 incluye fetch nativo — ya no usamos node-fetch (causaba ERR_STREAM_PREMATURE_CLOSE)

const app = express();
app.use(express.json());
app.use(express.static(__dirname + "/public"));

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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

DESPUÉS DE ENVIAR EL FORMULARIO:
Si el cliente consulta sobre crédito, aprobación o estado de solicitud, responder únicamente:
"A partir de este momento el equipo de créditos está a cargo de tu proceso 😊
Ellos te van a contactar a la brevedad para guiarte en los siguientes pasos."
No continuar la conversación sobre ese tema.`;

// ============================================================
// MEMORIA RAM - Sin Redis, simple y confiable
// ============================================================
const conversaciones = {};

function getConv(numero) {
  if (!conversaciones[numero]) {
    conversaciones[numero] = {
      messages: [],
      modoHumano: false,
      ultimoMensaje: new Date().toISOString(),
      etiqueta: null,
    };
  }
  return conversaciones[numero];
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

    const conv = getConv(from);
    conv.ultimoMensaje = new Date().toISOString();
    conv.messages.push({ role: "user", content: textoRecibido, timestamp: new Date().toISOString() });

    if (conv.messages.length > 40) conv.messages = conv.messages.slice(-40);

    if (conv.modoHumano) {
      console.log(`👤 Modo humano activo para ${from}`);
      return;
    }

    const historialClaude = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    const respuestaClaude = await llamarClaude(historialClaude);

    conv.messages.push({ role: "assistant", content: respuestaClaude, timestamp: new Date().toISOString() });
    conv.ultimoMensaje = new Date().toISOString();

    await enviarMensaje(from, respuestaClaude);
    console.log(`✅ Respuesta enviada a ${from}`);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
});

// ============================================================
// FUNCIÓN: Llamar a Claude API
// ============================================================
async function llamarClaude(historial) {
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
      messages: historial,
    }),
  });
  const data = await response.json();
  if (!data.content) {
    console.error("❌ Error Claude API:", JSON.stringify(data));
    throw new Error("Claude no devolvió contenido");
  }
  return data.content[0].text;
}

// ============================================================
// FUNCIÓN: Enviar mensaje por WhatsApp
// ============================================================
async function enviarMensaje(numero, texto) {
  await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "text", text: { body: texto } }),
  });
}

// ============================================================
// API DEL PANEL
// ============================================================
function authPanel(req, res, next) {
  const pwd = req.headers["x-panel-password"] || req.query.pwd;
  if (pwd !== PANEL_PASSWORD) return res.status(401).json({ error: "No autorizado" });
  next();
}

app.get("/api/conversaciones", authPanel, (req, res) => {
  const lista = Object.entries(conversaciones).map(([numero, conv]) => {
    const msgs = conv.messages || [];
    const ultimo = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    return {
      numero,
      modoHumano: conv.modoHumano || false,
      ultimoMensaje: conv.ultimoMensaje,
      totalMensajes: msgs.length,
      ultimoTexto: ultimo ? ultimo.content.substring(0, 60) : "",
      ultimoRol: ultimo ? ultimo.role : "",
      etiqueta: conv.etiqueta || null,
    };
  });
  lista.sort((a, b) => new Date(b.ultimoMensaje) - new Date(a.ultimoMensaje));
  res.json(lista);
});

app.get("/api/conversaciones/:numero", authPanel, (req, res) => {
  const conv = conversaciones[req.params.numero];
  if (!conv) return res.json({ messages: [], modoHumano: false });
  res.json({ numero: req.params.numero, modoHumano: conv.modoHumano, ultimoMensaje: conv.ultimoMensaje, messages: conv.messages });
});

app.post("/api/modo-humano/:numero", authPanel, (req, res) => {
  const conv = getConv(req.params.numero);
  conv.modoHumano = !conv.modoHumano;
  console.log(`🔄 Modo ${conv.modoHumano ? "HUMANO" : "IA"} para ${req.params.numero}`);
  res.json({ numero: req.params.numero, modoHumano: conv.modoHumano });
});

app.post("/api/etiqueta/:numero", authPanel, (req, res) => {
  const { etiqueta } = req.body;
  const conv = getConv(req.params.numero);
  conv.etiqueta = etiqueta || null;
  res.json({ numero: req.params.numero, etiqueta: conv.etiqueta });
});

app.post("/api/responder/:numero", authPanel, async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el texto" });
  const conv = getConv(req.params.numero);
  conv.messages.push({ role: "assistant", content: texto, timestamp: new Date().toISOString(), enviadoPorHumano: true });
  conv.ultimoMensaje = new Date().toISOString();
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
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
  console.log(`📊 Panel disponible en /panel`);
});
