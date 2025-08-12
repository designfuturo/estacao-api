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
    parcelas: parcelasBody,               // opcional (curso + cartão)
  } = req.body

  // 🔒 reCAPTCHA
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

  // ✅ Validação básica
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

  // ✅ Validação por tipo de produto
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

  // >>> Regras EXCLUSIVAS do curso (não afetam o Café)
  const isCurso = tipoProduto === "curso"
  const descontoAvistaPct = 0.10

  // parcelas (somente curso + cartão). Aceita string "10" vindas do front.
  const parcelasNum = parseInt(parcelasBody, 10)
  const parcelas = (isCurso && pagamento === "CREDIT_CARD")
    ? (Number.isInteger(parcelasNum) ? Math.min(Math.max(parcelasNum, 1), 10) : 10)
    : null

  const aplicarDescontoAvista = isCurso && (pagamento === "PIX" || pagamento === "BOLETO")

  // **NOVO**: valor a cobrar e valor da parcela (quando cartão)
  let valorCobranca = +Number(totalPagar || 0).toFixed(2)
  let valorParcela = null

  if (isCurso) {
    if (aplicarDescontoAvista) {
      valorCobranca = +Number(totalPagar * (1 - descontoAvistaPct)).toFixed(2)
    } else if (pagamento === "CREDIT_CARD") {
      valorCobranca = +Number(totalPagar).toFixed(2) // sem desconto no cartão
      const n = parcelas || 10
      valorParcela = +Number(valorCobranca / n).toFixed(2) // informativo
    }
  }
  // <<<

  const pedidoId = uuidv4()
  const criadoEm = new Date().toISOString()

  // 📝 Etapa 1: Salvar pedido na planilha
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
        // informativos para auditoria/relatórios
        aplicarDescontoAvista,
        descontoAvistaPct: aplicarDescontoAvista ? descontoAvistaPct : 0,
        parcelas,                // null para à vista ou Café
        valorCobranca,           // << NOVO
        valorParcela,            // << NOVO (apenas cartão)
        status: "pendente",
        criadoEm,
      }),
    })
  } catch (err) {
    console.error("Erro ao salvar na planilha:", err)
    return res.status(500).json({ error: "Erro ao salvar o pedido na planilha" })
  }

  // 💳 Etapa 2: Gerar link de pagamento via Make
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
        totalPagar,              // valor base (sempre enviado)
        tipoProduto,
        // sinais + valores calculados p/ o cenário no Make/Asaas
        aplicarDescontoAvista,   // true só para Curso + PIX/BOLETO
        descontoAvistaPct: aplicarDescontoAvista ? descontoAvistaPct : 0,
        parcelas,                // null para Café/à vista; 1..10 para cartão
        valorCobranca,           // << NOVO (usar como "value" no Asaas)
        valorParcela,            // << NOVO (para descrição/planilha/e-mail)
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
