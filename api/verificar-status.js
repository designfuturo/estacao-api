export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  // Aqui você pode, por exemplo, buscar do sessionStorage do servidor (caso tenha),
  // ou simular que o pagamento foi confirmado, se for um teste controlado.
  // Exemplo para teste manual:
  return res.status(200).json({ status: "pago" });
}
