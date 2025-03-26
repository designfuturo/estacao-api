// Arquivo: /api/enviar-pedido.js

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader("Access-Control-Allow-Origin", "https://estacaodomel.com.br");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const secret = process.env.WEBHOOK_SECRET;
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

  const {
    nome,
    email,
    telefone,
    dataEvento,
    qtdInteira,
    qtdMeia,
    qtdGratis,
    totalPagar
  } = req.body;

  if (!nome || !email || !telefone || !dataEvento) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  if ((qtdInteira + qtdMeia + qtdGratis) === 0) {
    return res.status(400).json({ error: "Nenhum ingresso selecionado" });
  }

  try {
    const response = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": secret
      },
      body: JSON.stringify({
        nome,
        email,
        telefone,
        dataEvento,
        qtdInteira,
        qtdMeia,
        qtdGratis,
        totalPagar
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: "Erro ao enviar para o Make", detalhe: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detalhe: err.message });
  }
}
