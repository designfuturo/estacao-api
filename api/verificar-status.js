export default async function handler(req, res) {
  // Habilita CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Trata requisição OPTIONS (pré-vôo CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  // Aqui você poderia verificar status real se estiver salvando info no DB
  const dados = sessionStorage?.getItem("statusPagamento"); // Só funciona client-side

  // Simulação para teste: sempre retorna "pago"
  return res.status(200).json({ status: "pago", nome: "Cliente Teste" });
}
