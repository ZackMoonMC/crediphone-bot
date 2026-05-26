const express = require("express");
const fetch = require("node-fetch");
 
const app = express();
app.use(express.json());
 
// ============================================================
// CONFIGURACIÓN - Reemplazá con tus datos reales
// ============================================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // cualquier palabra secreta tuya
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
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
PASO 3 - ELCCION DE COLOR: Siempre preguntar si quiere algun color especifico.
PASO 4 - CUOTAS: Calcular y mostrar las 3 opciones. Preguntar cuál le queda mejor.
PASO 5 - REDUCIR FRICCIÓN: Sin entrega inicial, primera cuota recién en 30 días.
PASO 6 - VALIDAR REQUISITOS: Confirmar situación laboral.
PASO 7 - FORMULARIO: Enviar link del formulario.`;
 
// Memoria de conversaciones por número de teléfono
const conversaciones = {};
 
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
// WEBHOOK - Recibir mensajes
// ============================================================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Responder rápido a Meta
 
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
 
    // Inicializar historial si no existe
    if (!conversaciones[from]) {
      conversaciones[from] = [];
    }
 
    // Agregar mensaje del usuario al historial
    conversaciones[from].push({
      role: "user",
      content: textoRecibido,
    });
 
    // Limitar historial a últimos 20 mensajes para no exceder tokens
    if (conversaciones[from].length > 20) {
      conversaciones[from] = conversaciones[from].slice(-20);
    }
 
    // Llamar a Claude
    const respuestaClaude = await llamarClaude(conversaciones[from]);
 
    // Agregar respuesta de Claude al historial
    conversaciones[from].push({
      role: "assistant",
      content: respuestaClaude,
    });
 
    // Enviar respuesta por WhatsApp
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
  return data?.content?.[0]?.text || "Lo siento, intentá de nuevo.";
}
 
// ============================================================
// FUNCIÓN: Enviar mensaje por WhatsApp
// ============================================================
async function enviarMensaje(numero, texto) {
  await fetch(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
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
    }
  );
}
 
// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Max de Crediphone corriendo en puerto ${PORT}`);
});
 
