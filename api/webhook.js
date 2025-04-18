export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { event, payment } = req.body;

  if (event !== "PAYMENT_RECEIVED") {
    return res.status(200).json({ message: "Evento ignorado" });
  }

  try {
    await fetch("https://hook.us2.make.com/urh3qrkkaikwcftjimdjh1w1i9sh7mge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    return res.status(200).json({ message: "Webhook processado com sucesso" });
  } catch (error) {
    console.error("Erro ao encaminhar para Make:", error);
    return res.status(500).json({ message: "Erro interno ao repassar dados" });
  }
}
