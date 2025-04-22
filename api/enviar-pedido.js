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
  const status = "pendente"

  const payload = {
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
    criadoEm,
    status,
  }

  try {
    const response = await fetch("https://hook.us2.make.com/4aypwyc1oekokjgncdibqpj8kynncfhf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Erro ao enviar para Make:", text)
      return res.status(500).json({ error: "Erro ao enviar para o Make" })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("Erro interno:", err.message)
    return res.status(500).json({ error: "Erro interno", detalhe: err.message })
  }
}
