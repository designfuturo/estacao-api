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

  const { pedidoId } = req.body

  if (!pedidoId) {
    return res.status(400).json({ error: 'pedidoId não fornecido' })
  }

  try {
    const response = await fetch(`https://www.asaas.com/api/v3/payments/${pedidoId}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${process.env.ASAAS_API_KEY}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro na resposta da API do Asaas:', data)
      return res.status(500).json({ error: 'Erro ao consultar status no Asaas' })
    }

    const statusValido = ['RECEIVED', 'CONFIRMED'].includes(data.status)

    return res.status(200).json({ status: statusValido ? 'pago' : 'pendente' })

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error)
    return res.status(500).json({ error: 'Erro interno ao verificar status do pagamento' })
  }
}
