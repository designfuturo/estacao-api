export default async function handler(req, res) {
  // Permitir requisições do site principal
  res.setHeader("Access-Control-Allow-Origin", "https://estacaodomel.com.br")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Responder preflight (CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // Validar método
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  // Extrair dados do corpo da requisição
  const { pedidoId, status } = req.body

  if (!pedidoId || !status) {
    return res.status(400).json({ error: "pedidoId e status são obrigatórios" })
  }

  // Aqui você pode salvar em planilha, banco, ou apenas logar
  console.log(`Atualizando status do pedido ${pedidoId} para: ${status}`)

  // Resposta de sucesso
  return res.status(200).json({ ok: true, pedidoId, statusAtualizado: status })
}
