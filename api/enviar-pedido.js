export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://estacaodomel.com.br")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  const secret = process.env.WEBHOOK_SECRET
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL

  const {
    nome,
    email,
    telefone,
    cpf,
    dataNascimento,
    pagamento,
    dataEvento,
    qtdInteira,
    qtdMeia,
    qtdGratis,
    totalPagar,
  } = req.body

  if (!nome || !email || !telefone || !cpf || !dataEvento || !pagamento || !totalPagar) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" })
  }

  if ((qtdInteira + qtdMeia + qtdGratis) === 0) {
    return res.status(400).json({ error: "Nenhum ingresso selecionado" })
  }

  try {
    const response = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": secret,
      },
      body: JSON.stringify({
        name: nome,
        email,
        telefone,
        cpf,
        dataNascimento,
        pagamento,
        dataEvento,
        qtdInteira,
        qtdMeia,
        qtdGratis,
        totalPagar,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Erro Make:", text)
      return res.status(500).json({
        error: "Erro ao enviar para o Make",
        detalhe: text,
      })
    }

    const resposta = await response.json()

    if (resposta?.linkPagamento) {
      return res.status(200).json({ ok: true, linkPagamento: resposta.linkPagamento })
    } else {
      console.error("Resposta inesperada do Make:", resposta)
      return res.status(500).json({
        error: "Resposta do Make sem linkPagamento",
        detalhe: resposta,
      })
    }

  } catch (err) {
    console.error("Erro interno:", err.message)
    return res.status(500).json({ error: "Erro interno", detalhe: err.message })
  }
}
