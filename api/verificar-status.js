import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://estacaodomel.com.br')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { pedidoId } = req.body

    if (!pedidoId) {
      return res.status(400).json({ error: 'pedidoId não fornecido' })
    }

    const filePath = path.resolve('./', 'pedidos.json')
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Base de pedidos não encontrada' })
    }

    const fileData = fs.readFileSync(filePath)
    const pedidos = JSON.parse(fileData).pedidos || []

    const pedido = pedidos.find(p => p.id === pedidoId)

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    return res.status(200).json({ status: pedido.status })

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
}
