import { v4 as uuidv4 } from "uuid"

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://estacaodomel.com.br")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  const {
    nome,
    email,
    telefone,
    cpf,
    dataNascimento,
    pagamento,
    dataEvento,
    totalPagar,
    qtdInteira = 0,
    qtdSenior = 0,
    qtdGratis = 0,
    qtdInscritos = 0,
    tipoProduto = "evento",
    recaptchaToken,
    parcelas: parcelasBody,               // >>> opcional, vindo do checkout (curso+cartão)
  } = req.body

  // 🔒 reCAPTCHA (inalterado)
  if (!recaptchaToken) {
    return res.status(400).json({ error: "reCAPTCHA não verificado" })
  }
  try {
    const resposta = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${recaptchaToken}`,
    })
    const resultado = await resposta.json()
    if (!resultado.success) {
      return res.status(403).json({ error: "Falha na verificação do reCAPTCHA" })
    }
  } catch (err) {
    console.error("Erro ao validar reCAPTCHA:", err)
    return res.status(500).json({ error: "Erro ao validar reCAPTCHA" })
  }

  // ✅ Validação básica (inalterada)
  if (
    !nome || typeof nome !== "string" ||
    !email || typeof email !== "string" ||
    !telefone || typeof telefone !== "string" ||
    !cpf || typeof cpf !== "string" ||
    !dataEvento || typeof dataEvento !== "string" ||
    !pagamento || !["PIX", "BOLETO", "CREDIT_CARD"].includes(pagamento) ||
    typeof totalPagar !== "number"
  ) {
    return res.status(400).json({ error: "Dados inválidos ou campos obrigatórios ausentes" })
  }

  // ✅ Validação por tipo de produto (inalterada)
  if (tipoProduto === "evento") {
    if (
      typeof qtdInteira !== "number" ||
      typeof qtdSenior !== "number" ||
      typeof qtdGratis !== "number" ||
      (qtdInteira + qtdSenior + qtdGratis) === 0
    ) {
      return res.status(400).json({ error: "Ingressos inválidos ou ausentes para evento" })
    }
  } else if (tipoProduto === "curso") {
    if (typeof qtdInscritos !== "number" || qtdInscritos <= 0) {
      return res.status(400).json({ error: "Quantidade de participantes inválida para o curso" })
    }
  }

  // >>> Regras EXCLUSIVAS do curso (sem vazar pro Café)
  const isCurso = tipoProduto === "curso"
  const descontoAvistaPct = 0.10
  // se curso + cartão, parcelas = inteiro 1..10 (default 10); caso contrário, null
  const parcelas = (isCurso && pagamento === "CREDIT_CARD")
    ? (Number.isInteger(parcelasBody) ? Math.min(Math.max(parcelasBody, 1), 10) : 10)
    : null
  const aplicarDescontoAvista = isCurso && (pagamento === "PIX" || pagamento === "BOLETO")
  // <<<

  const pedidoId = uuidv4()
  const criadoEm = new Date().toISOString()

  // 📝 Etapa 1: Salvar pedido na planilha (mantido, só adiciona info útil p/ auditoria)
  try {
    await fetch("https://hook.us2.make.com/4aypwyc1oekokjgncdibqpj8kynncfhf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedidoId,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        dataNascimento: dataNascimento ? dataNascimento.trim() : "",
        pagamento,
        dataEvento,
        qtdInteira,
        qtdSenior,
        qtdGratis,
        qtdInscritos,
        totalPagar,
        tipoProduto,
        // >>> campos só informativos (não quebram nada se a planilha ignorar)
        parcelas,
        aplicarDescontoAvista,
        descontoAvistaPct: aplicarDescontoAvista ? descontoAvistaPct : 0,
        // <<<
        status: "pendente",
        criadoEm,
      }),
    })
  } catch (err) {
    console.error("Erro ao salvar na planilha:", err)
    return res.status(500).json({ error: "Erro ao salvar o pedido na planilha" })
  }

  // 💳 Etapa 2: Gerar link de pagamento via Make (envia sinais claros)
  try {
    const resposta = await fetch("https://hook.us2.make.com/urh3qrkkaikwcftjimdjh1w1i9sh7mge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pedidoId,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        dataNascimento: dataNascimento ? dataNascimento.trim() : "",
        pagamento,
        dataEvento,
        qtdInteira,
        qtdSenior,
        qtdGratis,
        qtdInscritos,
        totalPagar,             // valor base (sem desconto)
        tipoProduto,
        // >>> sinais para o cenário do Make/Asaas
        parcelas,               // null para Café; 10 (ou 1..10) para Curso+Cartão
        aplicarDescontoAvista,  // true só para Curso + PIX/BOLETO
        descontoAvistaPct: aplicarDescontoAvista ? descontoAvistaPct : 0,
        // <<<
      }),
    })

    if (!resposta.ok) {
      const text = await resposta.text()
      console.error("Erro ao gerar link de pagamento:", text)
      return res.status(500).json({ error: "Pedido enviado, mas não foi possível obter o link de pagamento." })
    }

    const contentType = resposta.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      const raw = await resposta.text()
      console.error("Resposta inesperada do webhook (não é JSON):", raw)
      return res.status(500).json({ error: "Resposta inválida do gerador de link de pagamento." })
    }

    const json = await resposta.json()

    if (!json?.linkPagamento) {
      return res.status(500).json({ error: "Pedido salvo, mas link de pagamento não retornado." })
    }

    return res.status(200).json({
      ok: true,
      linkPagamento: json.linkPagamento,
      pedidoId,
    })
  } catch (err) {
    console.error("Erro ao chamar webhook de pagamento:", err.message)
    return res.status(500).json({ error: "Erro ao gerar link de pagamento" })
  }
}
