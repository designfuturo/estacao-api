export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { event, payment, status, nome } = req.body;

  if (event !== "PAYMENT_RECEIVED" && status !== "pago") {
    return res.status(200).json({ message: "Evento ignorado" });
  }

  try {
    await fetch("https://hook.us2.make.com/urh3qrkkaikwcftjimdjh1w1i9sh7mge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    // Agora retornamos o status e nome para o navegador
    return res.status(200).json({
      status: "pago",
      nome: nome || (payment?.customer || "Cliente"),
    });
  } catch (error) {
    console.error("Erro ao encaminhar para Make:", error);
    return res.status(500).json({ message: "Erro interno ao repassar dados" });
  }
}
