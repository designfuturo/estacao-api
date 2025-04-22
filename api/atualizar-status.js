import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
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

    // Atualiza o status
    pedidos[index].status = status
    pedidos[index].atualizadoEm = new Date().toISOString()

    // Salva de volta
    fs.writeFileSync(filePath, JSON.stringify({ pedidos }, null, 2))

    return res.status(200).json({ message: 'Status atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
}
