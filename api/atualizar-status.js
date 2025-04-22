import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  // Libera o CORS para requisições do Make ou outros sistemas
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-make-secret')

  // Trata requisições OPTIONS para CORS prévias
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Permite apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  // Validação do token secreto enviado pelo Make
  const makeSecretHeader = req.headers['x-make-secret']
  const makeSecretEnv = process.env.WEBHOOK_SECRET

  if (!makeSecretHeader || makeSecretHeader !== makeSecretEnv) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  try {
    const { pedidoId, status } = req.body

    if (!pedidoId || !status) {
      return res.status(400).json({ error: 'pedidoId ou status ausente' })
    }

    const filePath = path.resolve('./', 'pedidos.json')

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo de pedidos não encontrado' })
    }

    const fileData = fs.readFileSync(filePath)
    const pedidos = JSON.parse(fileData).pedidos || []

    const index = pedidos.findIndex(p => p.id === pedidoId)
    if (index === -1) {
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    pedidos[index].status = status
    pedidos[index].atualizadoEm = new Date().toISOString()

    fs.writeFileSync(filePath, JSON.stringify({ pedidos }, null, 2))

    return res.status(200).json({ message: 'Status atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
}
