// /api/enviar-pedido.js
import { v4 as uuidv4 } from "uuid"

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

  const pedidoId = uuidv4()
  const criadoEm = new Date().toISOString()

  // 1. Envia para planilha (cenário 1)
  try {
    await fetch("https://hook.us2.make.com/4aypwyc1oekokjgncdibqpj8kynncfhf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedidoId,
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
        status: "pendente",
        criadoEm,
      }),
    })
  } catch (err) {
    console.error("Erro ao salvar na planilha:", err)
    return res.status(500).json({ error: "Erro ao salvar na planilha" })
  }

  // 2. Envia para gerar link de pagamento (cenário 2)
  try {
    const resposta = await fetch("https://hook.us2.make.com/urh3qrkkaikwcftjimdjh1w1i9sh7mge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedidoId,
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
      }),
    })

    if (!resposta.ok) {
      const text = await resposta.text()
      console.error("Erro ao gerar link:", text)
      return res.status(500).json({ error: "Pedido enviado, mas não foi possível obter o link de pagamento." })
    }

    const json = await resposta.json()
    if (!json?.linkPagamento) {
      return res.status(500).json({ error: "Pedido salvo, mas link de pagamento não retornado." })
    }

    return res.status(200).json({ ok: true, linkPagamento: json.linkPagamento })
  } catch (err) {
    console.error("Erro ao chamar webhook de pagamento:", err.message)
    return res.status(500).json({ error: "Erro ao gerar link de pagamento" })
  }
}
