const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// ============================================================
// CONFIGURACIÓN
// ============================================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "crediphone2025";
// ============================================================

const SYSTEM_PROMPT = `Sos Max, el agente de ventas de Crediphone. Tu única misión es guiar al cliente desde el primer mensaje hasta que complete el formulario de solicitud.

INFORMACIÓN DE LA TIENDA:
- Nombre: Crediphone - Tienda exclusiva de iPhone a cuotas
- Dirección: Mcal. Lopez esq. Cruz del Defensor - Predio Manzana T - Villa Morra, Asunción
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

FINANCIAMIENTO:
- SIN entrega inicial
- Primera cuota recién a los 30 días
- Opciones: 6, 12 o 18 cuotas
- Reserva: 10% del valor del equipo

CÁLCULO DE CUOTAS:
- 6 cuotas: precio x 0.19425
- 12 cuotas: precio x 0.110229
- 18 cuotas: precio x 0.083167

REQUISITOS:
- Mayor de 20 años
- Inforconf limpio
- Foto de cédula vigente ambos lados
- Asalariados privados: mínimo 6 aportes a IPS
- Funcionarios públicos: liquidación de salario
- Independientes: últimos 3 pagos de IVA en PDF
- Cuenta propia sin IVA: extracto bancario

PROCESO DESPUÉS DE APROBACIÓN:
1. Cliente va a la financiera Paraguayo Japonesa solo con cédula
2. Le dice a la recepcionista: "vengo a firmar un crédito de FIADO por el iPhone"
3. Financiera demora 1 hora en acreditar a tienda
4. Cliente retira en tienda o coordina delivery gratis
5. Primera cuota a los 30 días

REGLAS DE COMPORTAMIENTO:
- Mensajes cortos y directos, máximo 3-4 líneas. El cliente paraguayo no lee textos largos.
- Siempre terminar con una pregunta de doble alternativa positiva, nunca preguntas de sí o no.
- Micro validar lo que el cliente dijo antes de dar información nueva.
- Alternar entre anclaje de valor y reductor de fricción.
- No pedir nombre al cliente, ese dato viene en el formulario.
- Colores: siempre confirmar disponibilidad con confianza.
- Si el cliente pregunta algo fuera del tema, respondé brevemente y volvé a encarrilar.
- Si quiere hablar con una persona: "Perfecto, en breve te contacta uno de nuestros asesores 😊"
- Informconf: "Lo evaluamos caso por caso, ¿querés que intentemos gestionar tu solicitud?"
- Usar emojis con moderación. Formato visual con saltos de línea.

SECUENCIA DE VENTAS:

PASO 1 - BIENVENIDA:
👋 ¡Hola! Bienvenido a Crediphone 📲
iPhones importados de EEUU a cuotas, sin entrega inicial y primera cuota recién en 30 días 🚀
¿Qué modelo estás buscando?

PASO 2 - MODELO: Confirmar disponibilidad + anclaje de valor + preguntar capacidad con doble alternativa.
PASO 3 - PARTE DE PAGO: Siempre preguntar si tienen equipo para entregar como parte de pago.
PASO 4 - CUOTAS: Calcular y mostrar las 3 opciones. Preguntar cuál le queda mejor.
PASO 5 - REDUCIR FRICCIÓN: Sin entrega inicial, primera cuota recién en 30 días.
PASO 6 - VALIDAR REQUISITOS: Confirmar situación laboral.
PASO 7 - FORMULARIO: Enviar link del formulario.`;

// ============================================================
// ESTADO EN MEMORIA
// ============================================================

// conversaciones[numero] = { messages: [], modoHumano: false, ultimoMensaje: Date }
const conversaciones = {};

function getConv(numero) {
  if (!conversaciones[numero]) {
    conversaciones[numero] = {
      messages: [],
      modoHumano: false,
      ultimoMensaje: new Date(),
      numeroFormateado: numero,
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
    conv.ultimoMensaje = new Date();

    // Agregar mensaje del usuario al historial
    conv.messages.push({
      role: "user",
      content: textoRecibido,
      timestamp: new Date(),
    });

    // Limitar historial a últimos 20 mensajes
    if (conv.messages.length > 40) {
      conv.messages = conv.messages.slice(-40);
    }

    // Si está en modo humano, NO responder con IA
    if (conv.modoHumano) {
      console.log(`👤 Modo humano activo para ${from} — sin respuesta IA`);
      return;
    }

    // Preparar historial limpio para Claude (solo role + content)
    const historialClaude = conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Llamar a Claude
    const respuestaClaude = await llamarClaude(historialClaude);

    // Agregar respuesta al historial
    conv.messages.push({
      role: "assistant",
      content: respuestaClaude,
      timestamp: new Date(),
    });

    // Enviar por WhatsApp
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: historial,
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

// ============================================================
// FUNCIÓN: Enviar mensaje por WhatsApp
// ============================================================
async function enviarMensaje(numero, texto) {
  await fetch(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: texto },
    }),
  });
}

// ============================================================
// API DEL PANEL - Endpoints internos
// ============================================================

// Middleware simple de autenticación para la API del panel
function authPanel(req, res, next) {
  const pwd = req.headers["x-panel-password"] || req.query.pwd;
  if (pwd !== PANEL_PASSWORD) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

// GET /api/conversaciones — lista de chats activos
app.get("/api/conversaciones", authPanel, (req, res) => {
  const lista = Object.entries(conversaciones).map(([numero, conv]) => ({
    numero,
    modoHumano: conv.modoHumano,
    ultimoMensaje: conv.ultimoMensaje,
    totalMensajes: conv.messages.length,
    ultimoTexto: conv.messages.length > 0
      ? conv.messages[conv.messages.length - 1].content.substring(0, 60)
      : "",
    ultimoRol: conv.messages.length > 0
      ? conv.messages[conv.messages.length - 1].role
      : "",
  }));

  // Ordenar por último mensaje más reciente
  lista.sort((a, b) => new Date(b.ultimoMensaje) - new Date(a.ultimoMensaje));

  res.json(lista);
});

// GET /api/conversaciones/:numero — historial completo de un chat
app.get("/api/conversaciones/:numero", authPanel, (req, res) => {
  const numero = req.params.numero;
  const conv = conversaciones[numero];
  if (!conv) return res.json({ messages: [], modoHumano: false });
  res.json({
    numero,
    modoHumano: conv.modoHumano,
    ultimoMensaje: conv.ultimoMensaje,
    messages: conv.messages,
  });
});

// POST /api/modo-humano/:numero — toggle IA / Humano
app.post("/api/modo-humano/:numero", authPanel, (req, res) => {
  const numero = req.params.numero;
  const conv = getConv(numero);
  conv.modoHumano = !conv.modoHumano;
  console.log(`🔄 Modo ${conv.modoHumano ? "HUMANO" : "IA"} activado para ${numero}`);
  res.json({ numero, modoHumano: conv.modoHumano });
});

// POST /api/responder/:numero — Max humano envía mensaje manual
app.post("/api/responder/:numero", authPanel, async (req, res) => {
  const numero = req.params.numero;
  const { texto } = req.body;

  if (!texto) return res.status(400).json({ error: "Falta el texto" });

  const conv = getConv(numero);

  // Guardar en historial como assistant
  conv.messages.push({
    role: "assistant",
    content: texto,
    timestamp: new Date(),
    enviadoPorHumano: true,
  });
  conv.ultimoMensaje = new Date();

  // Enviar por WhatsApp
  await enviarMensaje(numero, texto);

  console.log(`👤 Mensaje humano enviado a ${numero}: ${texto}`);
  res.json({ ok: true });
});

// ============================================================
// PANEL VISUAL — Sirve el HTML del panel
// ============================================================
app.get("/panel", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Crediphone — Panel Max</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0c10;
      --surface: #111318;
      --surface2: #1a1d24;
      --border: #23262f;
      --accent: #2eff9a;
      --accent-dim: rgba(46,255,154,0.12);
      --human: #ff8c42;
      --human-dim: rgba(255,140,66,0.12);
      --alert: #ff4f6a;
      --text: #e8eaf0;
      --muted: #6b7280;
      --radius: 12px;
    }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* LOGIN */
    #login-screen {
      position: fixed; inset: 0;
      background: var(--bg);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
    .login-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      width: 340px;
      text-align: center;
    }
    .login-box .logo {
      font-size: 32px; margin-bottom: 8px;
    }
    .login-box h2 {
      font-size: 20px; font-weight: 700; margin-bottom: 4px;
    }
    .login-box p {
      color: var(--muted); font-size: 13px; margin-bottom: 28px;
    }
    .login-box input {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      margin-bottom: 12px;
      outline: none;
      transition: border-color 0.2s;
    }
    .login-box input:focus { border-color: var(--accent); }
    .login-box button {
      width: 100%;
      background: var(--accent);
      color: #000;
      border: none;
      border-radius: 10px;
      padding: 13px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .login-box button:hover { opacity: 0.88; }
    .login-error {
      color: var(--alert); font-size: 13px; margin-top: 10px; display: none;
    }

    /* HEADER */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      height: 58px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .header-brand {
      display: flex; align-items: center; gap: 10px;
    }
    .header-brand .icon { font-size: 22px; }
    .header-brand .name {
      font-weight: 700; font-size: 16px; letter-spacing: -0.3px;
    }
    .header-brand .sub {
      color: var(--muted); font-size: 12px;
    }
    .header-right {
      display: flex; align-items: center; gap: 16px;
    }
    .badge-online {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--accent); font-weight: 600;
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--accent);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* LAYOUT PRINCIPAL */
    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* SIDEBAR — lista de chats */
    .sidebar {
      width: 300px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      background: var(--surface);
    }
    .sidebar-header {
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-header h3 {
      font-size: 13px; font-weight: 600; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.8px;
    }
    .sidebar-list {
      flex: 1; overflow-y: auto;
    }
    .sidebar-list::-webkit-scrollbar { width: 4px; }
    .sidebar-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .chat-item {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .chat-item:hover { background: var(--surface2); }
    .chat-item.active { background: var(--accent-dim); border-left: 3px solid var(--accent); }
    .chat-item.human-mode { border-left: 3px solid var(--human); background: var(--human-dim); }

    .avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--surface2);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
      border: 2px solid var(--border);
    }
    .chat-item.human-mode .avatar { border-color: var(--human); }
    .chat-item.active .avatar { border-color: var(--accent); }

    .chat-info { flex: 1; min-width: 0; }
    .chat-top {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 4px;
    }
    .chat-numero {
      font-size: 13px; font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .chat-time { font-size: 11px; color: var(--muted); }
    .chat-preview {
      font-size: 12px; color: var(--muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .chat-badge {
      font-size: 10px; font-weight: 700;
      padding: 2px 7px; border-radius: 20px;
      margin-top: 5px; display: inline-block;
    }
    .badge-ia { background: var(--accent-dim); color: var(--accent); }
    .badge-human { background: var(--human-dim); color: var(--human); }

    .empty-sidebar {
      padding: 40px 20px; text-align: center; color: var(--muted); font-size: 13px;
    }

    /* CHAT PRINCIPAL */
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-topbar {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);
      flex-shrink: 0;
    }
    .chat-topbar-left {
      display: flex; align-items: center; gap: 12px;
    }
    .chat-topbar-num {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600; font-size: 15px;
    }
    .chat-topbar-status {
      font-size: 12px; color: var(--muted);
    }

    .btn-toggle {
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-toggle.ia {
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--accent);
    }
    .btn-toggle.ia:hover { background: var(--accent); color: #000; }
    .btn-toggle.human {
      background: var(--human-dim);
      color: var(--human);
      border: 1px solid var(--human);
    }
    .btn-toggle.human:hover { background: var(--human); color: #000; }

    /* MENSAJES */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .messages-area::-webkit-scrollbar { width: 4px; }
    .messages-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .msg {
      max-width: 68%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
    }
    .msg-user {
      align-self: flex-start;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }
    .msg-assistant {
      align-self: flex-end;
      background: var(--accent-dim);
      border: 1px solid rgba(46,255,154,0.25);
      border-bottom-right-radius: 4px;
    }
    .msg-assistant.human-sent {
      background: var(--human-dim);
      border-color: rgba(255,140,66,0.25);
    }
    .msg-time {
      font-size: 10px;
      color: var(--muted);
      margin-top: 4px;
      text-align: right;
    }
    .msg-label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 3px;
      color: var(--muted);
    }

    .no-chat-selected {
      flex: 1; display: flex;
      flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--muted); gap: 12px;
    }
    .no-chat-selected .big-icon { font-size: 48px; opacity: 0.4; }

    /* INPUT ÁREA */
    .input-area {
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      flex-shrink: 0;
    }
    .input-area textarea {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      resize: none;
      outline: none;
      max-height: 100px;
      min-height: 42px;
      transition: border-color 0.2s;
      line-height: 1.4;
    }
    .input-area textarea:focus { border-color: var(--accent); }
    .input-area textarea:disabled {
      opacity: 0.4; cursor: not-allowed;
    }
    .btn-send {
      background: var(--accent);
      color: #000;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
      height: 42px;
    }
    .btn-send:hover { opacity: 0.85; }
    .btn-send:disabled { opacity: 0.3; cursor: not-allowed; }
    .input-hint {
      font-size: 11px; color: var(--muted);
      padding: 0 20px 10px;
      background: var(--surface);
    }
  </style>
</head>
<body>

<!-- LOGIN -->
<div id="login-screen">
  <div class="login-box">
    <div class="logo">📲</div>
    <h2>Crediphone Panel</h2>
    <p>Ingresá la contraseña para acceder</p>
    <input type="password" id="pwd-input" placeholder="Contraseña" onkeydown="if(event.key==='Enter') doLogin()"/>
    <button onclick="doLogin()">Entrar</button>
    <div class="login-error" id="login-error">Contraseña incorrecta</div>
  </div>
</div>

<!-- HEADER -->
<header>
  <div class="header-brand">
    <span class="icon">📲</span>
    <div>
      <div class="name">Crediphone</div>
      <div class="sub">Panel de Mensajes — Max</div>
    </div>
  </div>
  <div class="header-right">
    <div class="badge-online"><div class="dot"></div> Bot activo</div>
  </div>
</header>

<!-- MAIN -->
<div class="main">

  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Conversaciones</h3>
    </div>
    <div class="sidebar-list" id="sidebar-list">
      <div class="empty-sidebar">Sin conversaciones aún.<br/>Esperando mensajes… 🤖</div>
    </div>
  </div>

  <!-- CHAT PANEL -->
  <div class="chat-panel" id="chat-panel">
    <div class="no-chat-selected" id="no-chat">
      <div class="big-icon">💬</div>
      <div>Seleccioná una conversación</div>
    </div>

    <!-- TOPBAR DEL CHAT (oculta hasta elegir chat) -->
    <div class="chat-topbar" id="chat-topbar" style="display:none">
      <div class="chat-topbar-left">
        <div>
          <div class="chat-topbar-num" id="topbar-num">—</div>
          <div class="chat-topbar-status" id="topbar-status">—</div>
        </div>
      </div>
      <button class="btn-toggle ia" id="btn-toggle" onclick="toggleModo()">
        🤖 Tomar control
      </button>
    </div>

    <!-- MENSAJES -->
    <div class="messages-area" id="messages-area" style="display:none"></div>

    <!-- INPUT -->
    <div class="input-area" id="input-area" style="display:none">
      <textarea id="msg-input" placeholder="Escribí tu mensaje…" rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviarManual()}"
        oninput="autoResize(this)"></textarea>
      <button class="btn-send" id="btn-send" onclick="enviarManual()">Enviar</button>
    </div>
    <div class="input-hint" id="input-hint" style="display:none"></div>
  </div>

</div>

<script>
  let PWD = '';
  let chatActual = null;
  let modoHumanoActual = false;
  let polling = null;

  // ——— LOGIN ———
  function doLogin() {
    const val = document.getElementById('pwd-input').value;
    fetch('/api/conversaciones', {
      headers: { 'x-panel-password': val }
    }).then(r => {
      if (r.status === 401) {
        document.getElementById('login-error').style.display = 'block';
      } else {
        PWD = val;
        document.getElementById('login-screen').style.display = 'none';
        iniciar();
      }
    });
  }

  // ——— INICIAR ———
  function iniciar() {
    cargarSidebar();
    polling = setInterval(() => {
      cargarSidebar();
      if (chatActual) cargarChat(chatActual);
    }, 3000);
  }

  // ——— SIDEBAR ———
  async function cargarSidebar() {
    const r = await fetch('/api/conversaciones', {
      headers: { 'x-panel-password': PWD }
    });
    const lista = await r.json();
    const el = document.getElementById('sidebar-list');

    if (!lista.length) {
      el.innerHTML = '<div class="empty-sidebar">Sin conversaciones aún.<br/>Esperando mensajes… 🤖</div>';
      return;
    }

    el.innerHTML = lista.map(c => {
      const active = c.numero === chatActual ? 'active' : '';
      const human = c.modoHumano ? 'human-mode' : '';
      const badge = c.modoHumano
        ? '<span class="chat-badge badge-human">👤 Humano</span>'
        : '<span class="chat-badge badge-ia">🤖 IA</span>';
      const time = c.ultimoMensaje ? formatTime(c.ultimoMensaje) : '';
      const preview = c.ultimoTexto
        ? (c.ultimoRol === 'user' ? '👤 ' : '🤖 ') + c.ultimoTexto
        : '';
      return \`
        <div class="chat-item \${active} \${human}" onclick="abrirChat('\${c.numero}')">
          <div class="avatar">\${c.modoHumano ? '👤' : '🤖'}</div>
          <div class="chat-info">
            <div class="chat-top">
              <span class="chat-numero">\${c.numero}</span>
              <span class="chat-time">\${time}</span>
            </div>
            <div class="chat-preview">\${preview}</div>
            \${badge}
          </div>
        </div>
      \`;
    }).join('');
  }

  // ——— ABRIR CHAT ———
  async function abrirChat(numero) {
    chatActual = numero;
    document.getElementById('no-chat').style.display = 'none';
    document.getElementById('chat-topbar').style.display = 'flex';
    document.getElementById('messages-area').style.display = 'flex';
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('input-hint').style.display = 'block';
    document.getElementById('topbar-num').textContent = numero;
    await cargarChat(numero);
    await cargarSidebar();
  }

  // ——— CARGAR MENSAJES ———
  async function cargarChat(numero) {
    const r = await fetch(\`/api/conversaciones/\${numero}\`, {
      headers: { 'x-panel-password': PWD }
    });
    const data = await r.json();
    modoHumanoActual = data.modoHumano;

    // Actualizar topbar
    const statusEl = document.getElementById('topbar-status');
    const toggleBtn = document.getElementById('btn-toggle');
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('btn-send');
    const hint = document.getElementById('input-hint');

    if (modoHumanoActual) {
      statusEl.textContent = '👤 Modo Humano — vos estás respondiendo';
      toggleBtn.textContent = '🤖 Devolver a IA';
      toggleBtn.className = 'btn-toggle human';
      input.disabled = false;
      input.placeholder = 'Escribí tu respuesta…';
      sendBtn.disabled = false;
      hint.textContent = 'La IA está pausada. Solo vos respondés ahora.';
    } else {
      statusEl.textContent = '🤖 Max IA está respondiendo';
      toggleBtn.textContent = '👤 Tomar control';
      toggleBtn.className = 'btn-toggle ia';
      input.disabled = true;
      input.placeholder = 'La IA está activa — tomá el control para escribir';
      sendBtn.disabled = true;
      hint.textContent = 'Hacé clic en "Tomar control" para responder manualmente.';
    }

    // Renderizar mensajes
    const area = document.getElementById('messages-area');
    const scrollBottom = area.scrollHeight - area.scrollTop === area.clientHeight;

    area.innerHTML = (data.messages || []).map(m => {
      const isUser = m.role === 'user';
      const isHumanSent = m.enviadoPorHumano;
      const cls = isUser ? 'msg-user' : ('msg-assistant' + (isHumanSent ? ' human-sent' : ''));
      const label = isUser ? 'Cliente' : (isHumanSent ? '👤 Vos' : '🤖 Max IA');
      const time = m.timestamp ? formatTime(m.timestamp) : '';
      return \`
        <div class="msg \${cls}">
          <div class="msg-label">\${label}</div>
          \${escapeHtml(m.content)}
          <div class="msg-time">\${time}</div>
        </div>
      \`;
    }).join('');

    // Scroll al final
    area.scrollTop = area.scrollHeight;
  }

  // ——— TOGGLE MODO ———
  async function toggleModo() {
    if (!chatActual) return;
    await fetch(\`/api/modo-humano/\${chatActual}\`, {
      method: 'POST',
      headers: { 'x-panel-password': PWD }
    });
    await cargarChat(chatActual);
    await cargarSidebar();
  }

  // ——— ENVIAR MANUAL ———
  async function enviarManual() {
    const input = document.getElementById('msg-input');
    const texto = input.value.trim();
    if (!texto || !chatActual) return;

    input.value = '';
    input.style.height = 'auto';

    await fetch(\`/api/responder/\${chatActual}\`, {
      method: 'POST',
      headers: {
        'x-panel-password': PWD,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texto })
    });

    await cargarChat(chatActual);
  }

  // ——— UTILS ———
  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm';
    if (diff < 86400000) return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\\n/g,'<br/>');
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }
</script>
</body>
</html>`);
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
  console.log(`📊 Panel disponible en /panel`);
});
