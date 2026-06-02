const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

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

JERARQUÍA OBLIGATORIA DE DECISIONES

Antes de responder cualquier mensaje, evaluar estas reglas en orden.

La primera regla que coincida tiene prioridad absoluta sobre todas las demás.

PRIORIDAD 1 — RESULTADO DEL COTIZADOR

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

Contado:
Precio iPhone − Valor part-pago

Financiado:
(Precio iPhone + Gs. 500.000) − Valor part-pago

PRIORIDAD 2 — ENTREGA DE EQUIPO USADO

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

PRIORIDAD 3 — CLIENTE CON MODELO DEFINIDO

Si el cliente menciona un modelo específico:

→ Cotizar.
→ Mostrar cuotas.
→ Guiar hacia el formulario.

Si el cliente ya recibió una cotización y demuestra interés en continuar
(cualquier señal positiva: "sí", "dale", "quiero", "cómo sigo", o similar):

→ Responder EXACTAMENTE este mensaje, sin modificarlo:

"🚀 Para retirar hoy mismo, te dejo el link del formulario:
👉 https://crediphone-leads.onrender.com/formulario.html
Es súper fácil de completar y te llevará menos de un minuto. ✅"

PRIORIDAD 4 — REQUISITOS

Si el cliente pregunta requisitos:
→ Ejecutar flujo requisitos.

PRIORIDAD 5 — MÉTODOS DE PAGO

Si el cliente pregunta métodos de pago:
→ Ejecutar flujo métodos de pago.

PRIORIDAD 6 — PRIMER CONTACTO

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

LISTA DE PRECIOS DE VENTA CONTADO IPHONES:
iPhone 11 normal 64GB: Gs. 1.200.000
iPhone 11 normal 128GB: Gs. 1.400.000
iPhone 11 Pro 64GB: Gs. 1.600.000
iPhone 11 Pro 256GB: Gs. 1.800.000
iPhone 11 Pro Max 64GB: Gs. 1.700.000
iPhone 11 Pro Max 256GB: Gs. 1.900.000
iPhone 12 normal 64GB: Gs. 1.500.000
iPhone 12 normal 128GB: Gs. 1.800.000
iPhone 12 Pro 128GB: Gs. 2.100.000
iPhone 12 Pro 256GB: Gs. 2.300.000
iPhone 12 Pro Max 128GB: Gs. 2.500.000
iPhone 12 Pro Max 256GB: Gs. 2.700.000
iPhone 13 normal 128GB: Gs. 2.250.000
iPhone 13 normal 256GB: Gs. 2.500.000
iPhone 13 sellado 128GB: Gs. 3.900.000
iPhone 13 Pro 128GB: Gs. 2.900.000
iPhone 13 Pro 256GB: Gs. 3.200.000
iPhone 13 Pro 512GB: Gs. 3.900.000
iPhone 13 Pro Max 128GB: Gs. 3.100.000
iPhone 13 Pro Max 256GB: Gs. 3.700.000
iPhone 14 normal 128GB: Gs. 2.400.000
iPhone 14 normal 256GB: Gs. 2.700.000
iPhone 14 Plus 128GB: Gs. 3.000.000
iPhone 14 Plus 256GB: Gs. 3.200.000
iPhone 14 Pro 128GB: Gs. 3.300.000
iPhone 14 Pro 256GB: Gs. 3.700.000
iPhone 14 Pro Max 128GB: Gs. 3.600.000
iPhone 14 Pro Max 256GB: Gs. 4.200.000
iPhone 15 normal 128GB: Gs. 3.200.000
iPhone 15 normal 256GB: Gs. 3.800.000
iPhone 15 sellado 128GB: Gs. 4.900.000
iPhone 15 Plus 128GB: Gs. 3.800.000
iPhone 15 Plus 256GB: Gs. 4.000.000
iPhone 15 Pro 128GB: Gs. 4.000.000
iPhone 15 Pro 256GB: Gs. 4.300.000
iPhone 15 Pro 512GB: Gs. 4.800.000
iPhone 15 Pro Max 256GB: Gs. 4.650.000
iPhone 15 Pro Max 512GB: Gs. 5.500.000
iPhone 16 normal 128GB: Gs. 4.200.000
iPhone 16 normal 256GB: Gs. 4.900.000
iPhone 16 sellado 128GB: Gs. 5.500.000
iPhone 16 Plus 128GB: Gs. 4.700.000
iPhone 16 Plus 256GB: Gs. 4.900.000
iPhone 16 Pro 128GB: Gs. 5.200.000
iPhone 16 Pro 256GB: Gs. 5.600.000
iPhone 16 Pro Max 256GB: Gs. 6.000.000
iPhone 16 Pro Max 512GB: Gs. 6.700.000
iPhone 17 normal 256GB: Gs. 5.500.000
iPhone 17 sellado 256GB: Gs. 6.000.000
iPhone 17 Air 256GB: Gs. 7.000.000
iPhone 17 Pro sellado 256GB: Gs. 9.300.000
iPhone 17 Pro sellado 512GB: Gs. 11.500.000
iPhone 17 Pro Max sellado 256GB: Gs. 10.300.000
iPhone 17 Pro Max sellado 512GB: Gs. 12.300.000

FINANCIAMIENTO:
- SIN entrega inicial
- Primera cuota recién a los 30 días
- Opciones: 6, 12 o 18 cuotas

CÁLCULO DE CUOTAS:
- 6 cuotas: precio x 0.19425
- 12 cuotas: precio x 0.110229
- 18 cuotas: precio x 0.083167

CÁLCULO ENTREGA DE DINERO EN EFECTIVO:
1. Precio de venta del iPhone que se lleva
2. Menos el dinero en efectivo que entrega
3. El resultado es el Saldo Final
4. Saldo Final x Factor = valor de cada cuota

PLANTILLA COTIZACIÓN CON ENTREGA DE DINERO EFECTIVO:
♻️ Con la entrega de Gs. (monto que menciona que entrega), el [MODELO] queda así: 👇
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

Monto a financiar = (Precio del iPhone elegido + Gs. 500.000) − Valor part-pago

Si la operación es al contado:

Monto contado final = Precio del iPhone elegido − Valor part-pago

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

RECORDATORIO — PRIMER CONTACTO
Si es el primer mensaje del cliente, usá el mensaje de bienvenida definido arriba.

RECORDATORIO CRITICO — ENTREGA PARTE DE PAGO
Si se pregunta por entrega como parte de pago, usa las instrucciones del inicio mas arriba.

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
      model: "claude-sonnet-4-5",
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
  res.send(
    '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
    '<title>Crediphone Panel</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    ':root{--bg:#0a0c10;--surface:#111318;--surface2:#1a1d24;--border:#23262f;--accent:#2eff9a;--accent-dim:rgba(46,255,154,0.12);--human:#ff8c42;--human-dim:rgba(255,140,66,0.12);--alert:#ff4f6a;--text:#e8eaf0;--muted:#6b7280}' +
    'body{font-family:"DM Sans",sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden}' +
    '#ls{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:100}' +
    '.lb{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:40px;width:340px;text-align:center}' +
    '.lb h2{font-size:20px;font-weight:700;margin-bottom:4px}' +
    '.lb p{color:var(--muted);font-size:13px;margin-bottom:28px}' +
    '.lb input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-size:14px;margin-bottom:12px;outline:none}' +
    '.lb button{width:100%;background:var(--accent);color:#000;border:none;border-radius:10px;padding:13px;font-weight:700;font-size:15px;cursor:pointer}' +
    '.le{color:var(--alert);font-size:13px;margin-top:10px;display:none}' +
    'header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}' +
    '.hn{font-weight:700;font-size:16px}' +
    '.hs{color:var(--muted);font-size:12px}' +
    '.bo{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--accent);font-weight:600}' +
    '.dot{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite}' +
    '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}' +
    '.main{display:flex;flex:1;overflow:hidden}' +
    '.sidebar{width:300px;border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;background:var(--surface)}' +
    '.sh{padding:16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px}' +
    '.sl{flex:1;overflow-y:auto}' +
    '.ci{padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;display:flex;gap:12px;align-items:flex-start}' +
    '.ci:hover{background:var(--surface2)}' +
    '.ci.active{background:var(--accent-dim);border-left:3px solid var(--accent)}' +
    '.ci.hm{border-left:3px solid var(--human);background:var(--human-dim)}' +
    '.av{width:40px;height:40px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;border:2px solid var(--border)}' +
    '.cn{font-size:13px;font-weight:600}' +
    '.ct{font-size:11px;color:var(--muted)}' +
    '.cp{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cb{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-top:5px;display:inline-block}' +
    '.bi{background:var(--accent-dim);color:var(--accent)}' +
    '.bh{background:var(--human-dim);color:var(--human)}' +
    '.es{padding:40px 20px;text-align:center;color:var(--muted);font-size:13px}' +
    '.etqs{display:flex;gap:6px;padding:10px 20px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0}' +
    '.etq{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:all 0.2s;opacity:0.5}' +
    '.etq:hover{opacity:1}' +
    '.etq.active{opacity:1;border-color:currentColor}' +
    '.e1{color:#ff4f6a;background:rgba(255,79,106,0.12)}' +
    '.e2{color:#ff8c42;background:rgba(255,140,66,0.12)}' +
    '.e3{color:#a78bfa;background:rgba(167,139,250,0.12)}' +
    '.e4{color:#2eff9a;background:rgba(46,255,154,0.12)}' +
    '.e5{color:#6b7280;background:rgba(107,114,128,0.12)}' +
    '.cp2{flex:1;display:flex;flex-direction:column;overflow:hidden}' +
    '.tb{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface);flex-shrink:0}' +
    '.tbn{font-weight:600;font-size:15px}' +
    '.tbs{font-size:12px;color:var(--muted)}' +
    '.bt{padding:8px 18px;border-radius:8px;border:none;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s}' +
    '.bt.ia{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent)}' +
    '.bt.ia:hover{background:var(--accent);color:#000}' +
    '.bt.hu{background:var(--human-dim);color:var(--human);border:1px solid var(--human)}' +
    '.bt.hu:hover{background:var(--human);color:#000}' +
    '.ma{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px}' +
    '.msg{max-width:68%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5}' +
    '.mu{align-self:flex-start;background:var(--surface2);border:1px solid var(--border);border-bottom-left-radius:4px}' +
    '.mb{align-self:flex-end;background:var(--accent-dim);border:1px solid rgba(46,255,154,0.25);border-bottom-right-radius:4px}' +
    '.mb.hs2{background:var(--human-dim);border-color:rgba(255,140,66,0.25)}' +
    '.mt{font-size:10px;color:var(--muted);margin-top:4px;text-align:right}' +
    '.ml{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;color:var(--muted)}' +
    '.nc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:12px}' +
    '.ia2{padding:14px 20px;border-top:1px solid var(--border);background:var(--surface);display:flex;gap:10px;align-items:flex-end;flex-shrink:0}' +
    '.ia2 textarea{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:14px;resize:none;outline:none;max-height:100px;min-height:42px;line-height:1.4}' +
    '.ia2 textarea:disabled{opacity:0.4;cursor:not-allowed}' +
    '.bs{background:var(--accent);color:#000;border:none;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer;height:42px}' +
    '.bs:disabled{opacity:0.3;cursor:not-allowed}' +
    '.ih{font-size:11px;color:var(--muted);padding:0 20px 10px;background:var(--surface)}' +
    '</style></head><body>' +
    '<div id="ls"><div class="lb"><div style="font-size:32px;margin-bottom:8px">📲</div>' +
    '<h2>Crediphone Panel</h2><p>Ingresa la contrasena</p>' +
    '<input type="password" id="pi" placeholder="Contrasena"/>' +
    '<button onclick="dL()">Entrar</button>' +
    '<div class="le" id="le">Contrasena incorrecta</div></div></div>' +
    '<header><div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">📲</span>' +
    '<div><div class="hn">Crediphone</div><div class="hs">Panel de Mensajes</div></div></div>' +
    '<div class="bo"><div class="dot"></div>Bot activo</div></header>' +
    '<div class="main">' +
    '<div class="sidebar"><div class="sh">Conversaciones</div>' +
    '<div class="sl" id="sl"><div class="es">Sin conversaciones.<br/>Esperando mensajes...</div></div></div>' +
    '<div class="cp2">' +
    '<div class="nc" id="nc"><div style="font-size:48px;opacity:0.4">💬</div><div>Selecciona una conversacion</div></div>' +
    '<div class="tb" id="tb" style="display:none">' +
    '<div><div class="tbn" id="tbn">—</div><div class="tbs" id="tbs">—</div></div>' +
    '<button class="bt ia" id="btg" onclick="tM()">Tomar control</button></div>' +
    '<div class="etqs" id="etqs" style="display:none">' +
    '<span onclick="sE(null)" class="etq e5 active" id="e0">Sin etiqueta</span>' +
    '<span onclick="sE(1)" class="etq e1" id="e1">🔥 Caliente</span>' +
    '<span onclick="sE(2)" class="etq e2" id="e2">👀 Interesado</span>' +
    '<span onclick="sE(3)" class="etq e3" id="e3">⏳ Seguimiento</span>' +
    '<span onclick="sE(4)" class="etq e4" id="e4">✅ Cerrado</span>' +
    '</div>' +
    '<div class="ma" id="ma" style="display:none"></div>' +
    '<div class="ia2" id="ia2" style="display:none">' +
    '<textarea id="mi" placeholder="Escribe tu mensaje..." rows="1" oninput="aR(this)"></textarea>' +
    '<button class="bs" id="bs" onclick="eM()" disabled>Enviar</button></div>' +
    '<div class="ih" id="ih" style="display:none">Toma el control para responder.</div>' +
    '</div></div>' +
    '<script>' +
    'var P="",cA=null,mH=false;' +
    'document.getElementById("pi").onkeydown=function(e){if(e.key==="Enter")dL();};' +
    'function dL(){' +
    '  var v=document.getElementById("pi").value;' +
    '  if(!v){alert("Ingresa la contrasena");return;}' +
    '  fetch("/api/conversaciones",{headers:{"x-panel-password":v}})' +
    '  .then(function(r){' +
    '    if(r.status===401){document.getElementById("le").style.display="block";}' +
    '    else{P=v;document.getElementById("ls").style.display="none";ini();}' +
    '  }).catch(function(e){alert("Error: "+e.message);});' +
    '}' +
    'function ini(){' +
    '  cSB();' +
    '  setInterval(function(){' +
    '    cSB();' +
    '    if(cA&&!mH)cC(cA);' +
    '  },3000);' +
    '}' +
    'function cSB(){' +
    '  fetch("/api/conversaciones",{headers:{"x-panel-password":P}})' +
    '  .then(function(r){return r.json();})' +
    '  .then(function(l){' +
    '    var el=document.getElementById("sl");' +
    '    if(!l.length){el.innerHTML="<div class=\\"es\\">Sin conversaciones.<br/>Esperando mensajes...</div>";return;}' +
    '    el.innerHTML=l.map(function(c){' +
    '      var a=c.numero===cA?"active":"",h=c.modoHumano?"hm":"";' +
    '      var b=c.modoHumano?"<span class=\\"cb bh\\">Humano</span>":"<span class=\\"cb bi\\">IA</span>";' +
    '      var t=c.ultimoMensaje?fT(c.ultimoMensaje):"";' +
    '      var p=c.ultimoTexto?(c.ultimoRol==="user"?"Cliente: ":"Max: ")+c.ultimoTexto:"";' +
    '      var n=c.numero;' +
    '      return "<div class=\\"ci "+a+" "+h+"\\" onclick=\\"aC(\'"+n+"\')\\">"' +
    '        +"<div class=\\"av\\">"+(c.modoHumano?"👤":"🤖")+"</div>"' +
    '        +"<div style=\\"flex:1;min-width:0\\">"' +
    '        +"<div style=\\"display:flex;justify-content:space-between\\"><span class=\\"cn\\">"+n+"</span><span class=\\"ct\\">"+t+"</span></div>"' +
    '        +"<div class=\\"cp\\">"+p+"</div>"+b+"</div></div>";' +
    '    }).join("");' +
    '  });' +
    '}' +
    'function aC(n){' +
    '  cA=n;' +
    '  document.getElementById("nc").style.display="none";' +
    '  document.getElementById("tb").style.display="flex";' +
    '  document.getElementById("etqs").style.display="flex";' +
    '  document.getElementById("ma").style.display="flex";' +
    '  document.getElementById("ia2").style.display="flex";' +
    '  document.getElementById("ih").style.display="block";' +
    '  document.getElementById("tbn").textContent=n;' +
    '  cC(n);cSB();' +
    '}' +
    'function cC(n){' +
    '  fetch("/api/conversaciones/"+n,{headers:{"x-panel-password":P}})' +
    '  .then(function(r){return r.json();})' +
    '  .then(function(d){' +
    '    mH=d.modoHumano;' +
    '    actualizarUI();' +
    '    var a=document.getElementById("ma");' +
    '    a.innerHTML=(d.messages||[]).map(function(m){' +
    '      var u=m.role==="user";' +
    '      var c=u?"mu":("mb"+(m.enviadoPorHumano?" hs2":""));' +
    '      var l=u?"Cliente":(m.enviadoPorHumano?"Vos":"Max IA");' +
    '      var t=m.timestamp?fT(m.timestamp):"";' +
    '      var x=String(m.content).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");' +
    '      return "<div class=\\"msg "+c+"\\"><div class=\\"ml\\">"+l+"</div>"+x+"<div class=\\"mt\\">"+t+"</div></div>";' +
    '    }).join("");' +
    '    a.scrollTop=a.scrollHeight;' +
    '  });' +
    '}' +
    'function sE(num){' +
    '  if(!cA)return;' +
    '  fetch("/api/etiqueta/"+cA,{method:"POST",headers:{"x-panel-password":P,"Content-Type":"application/json"},body:JSON.stringify({etiqueta:num})})' +
    '  .then(function(){' +
    '    for(var i=0;i<=4;i++){var el=document.getElementById("e"+i);if(el)el.classList.remove("active");}' +
    '    var sel=document.getElementById(num?"e"+num:"e0");if(sel)sel.classList.add("active");' +
    '    cSB();' +
    '  });' +
    '}' +
    'function actualizarUI(){' +
    '  var bt=document.getElementById("btg");' +
    '  var inp=document.getElementById("mi");' +
    '  var sb=document.getElementById("bs");' +
    '  var s=document.getElementById("tbs");' +
    '  var ih=document.getElementById("ih");' +
    '  if(mH){' +
    '    bt.textContent="Devolver a IA";bt.className="bt hu";' +
    '    inp.disabled=false;sb.disabled=false;' +
    '    s.textContent="Modo Humano — vos estas respondiendo";' +
    '    ih.textContent="IA pausada. Solo vos respondes.";' +
    '  }else{' +
    '    bt.textContent="Tomar control";bt.className="bt ia";' +
    '    inp.disabled=true;sb.disabled=true;' +
    '    s.textContent="Max IA esta respondiendo";' +
    '    ih.textContent="Toma el control para responder.";' +
    '  }' +
    '}' +
    'function tM(){' +
    '  if(!cA)return;' +
    '  fetch("/api/modo-humano/"+cA,{method:"POST",headers:{"x-panel-password":P}})' +
    '  .then(function(r){return r.json();})' +
    '  .then(function(d){mH=d.modoHumano;actualizarUI();cSB();});' +
    '}' +
    'function eM(){' +
    '  var inp=document.getElementById("mi");' +
    '  var t=inp.value.trim();' +
    '  if(!t||!cA)return;' +
    '  inp.value="";inp.style.height="auto";' +
    '  fetch("/api/responder/"+cA,{method:"POST",headers:{"x-panel-password":P,"Content-Type":"application/json"},body:JSON.stringify({texto:t})})' +
    '  .then(function(){cC(cA);});' +
    '}' +
    'function fT(ts){' +
    '  var d=new Date(ts),now=new Date(),df=now-d;' +
    '  if(df<60000)return"ahora";' +
    '  if(df<3600000)return Math.floor(df/60000)+"m";' +
    '  if(df<86400000)return d.toLocaleTimeString("es-PY",{hour:"2-digit",minute:"2-digit"});' +
    '  return d.toLocaleDateString("es-PY",{day:"2-digit",month:"2-digit"});' +
    '}' +
    'function aR(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight,100)+"px";}' +
    '</script></body></html>'
  );
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
  console.log(`📊 Panel disponible en /panel`);
});
