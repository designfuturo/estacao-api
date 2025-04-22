import fs from "fs"
import path from "path"
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

  // Gera um ID único para o pedido
  const pedidoId = uuidv4()

  // Caminho do arquivo local para salvar os pedidos
  const filePath = path.resolve("./", "pedidos.json")

  let pedidos = []
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath)
      pedidos = JSON.parse(fileData).pedidos || []
    }
  } catch (err) {
    console.error("Erro ao ler pedidos.json:", err)
  }

  const novoPedido = {
    id: pedidoId,
    nome,
    email,
    telefone,
    cpf,
    dataNascimento,
    dataEvento,
    formaPagamento: pagamento,
    qtdInteira,
    qtdMeia,
    qtdGratis,
    totalPagar,
    status: "pendente",
    criadoEm: new Date().toISOString()
  }

  // Adiciona o novo pedido ao array
  pedidos.push(novoPedido)

  try {
    fs.writeFileSync(filePath, JSON.stringify({ pedidos }, null, 2))
  } catch (err) {
    console.error("Erro ao salvar pedido:", err)
    return res.status(500).json({ error: "Erro interno ao salvar pedido localmente" })
  }

  // Continua com envio para Make
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
        pedidoId // opcional: enviar esse ID para o Make também
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Erro Make:", text)
      return res.status(500).json({ error: "Erro ao enviar para o Make", detalhe: text })
    }

    const resposta = await response.json()

    if (resposta?.linkPagamento) {
      return res.status(200).json({
        ok: true,
        linkPagamento: resposta.linkPagamento,
        pedidoId, // devolve ID do pedido para o frontend consultar depois
      })
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
