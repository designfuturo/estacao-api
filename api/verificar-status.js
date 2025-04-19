export default async function handler(req, res) {
  // Libera o domínio da Estação do Mel para acessar a API
  res.setHeader('Access-Control-Allow-Origin', 'https://estacaodomel.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde antecipadamente a requisições OPTIONS (necessário para CORS funcionar corretamente)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Aqui você pode incluir a lógica de verificação de status do pagamento
    // Exemplo fictício:
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId não fornecido' });
    }

    // Simulação de chamada ao Asaas ou outra fonte
    const status = 'pending'; // Substitua pela lógica real

    return res.status(200).json({ status });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
