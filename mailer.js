const PDFDocument = require('pdfkit');
const path = require('path');

const ASSETS = path.join(__dirname, 'public', 'assets');

// ─── Gerar PDF do Comprovativo ─────────────────────────────────
function gerarComprovativoPDF(inscricao) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 595.28;
    const H = 841.89;

    doc.rect(0, 0, W, H).fill('#0a0c0b');
    doc.rect(0, 0, W, 200).fill('#0c3b2a');
    doc.rect(0, 198, W, 4).fill('#b5ff4d');

    const logoH = 26;
    const logoObW = Math.round(logoH * (1771 / 400));
    const logoMrW = Math.round(logoH * (753 / 174));
    const totalLogosW = logoObW + 14 + logoMrW;
    const logoX = (W - totalLogosW) / 2;
    const logoY = 14;
    try {
      doc.image(path.join(ASSETS, 'ob.png'), logoX, logoY, { width: logoObW, height: logoH });
      doc.fillColor('rgba(255,255,255,0.3)').font('Helvetica').fontSize(10)
         .text('×', logoX + logoObW + 3, logoY + 7, { width: 10, align: 'center' });
      doc.image(path.join(ASSETS, 'MR.6.png'), logoX + logoObW + 14, logoY, { width: logoMrW, height: logoH });
    } catch (e) { console.warn('Logos não encontradas:', e.message); }

    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(11)
       .text('COMUNIDADE CGP', 0, 54, { align: 'center', characterSpacing: 4 });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26)
       .text('OFICINA DE GESTÃO', 0, 74, { align: 'center' });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26)
       .text('DE PROJECTOS', 0, 104, { align: 'center' });
    doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
       .text('COMPROVATIVO DE INSCRIÇÃO', 0, 144, { align: 'center', characterSpacing: 3 });

    const numComp = String(inscricao.id).padStart(6, '0');
    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(10)
       .text(`Nº ${numComp}`, 0, 166, { align: 'center', characterSpacing: 2 });

    const cx = W / 2;
    doc.circle(cx, 236, 32).fill('#0c3b2a').stroke();
    doc.strokeColor('#b5ff4d').lineWidth(2).circle(cx, 236, 32).stroke();
    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(28).text('✓', cx - 10, 221);

    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(14)
       .text('PAGAMENTO CONFIRMADO', 0, 284, { align: 'center', characterSpacing: 2 });

    const cardX = 60;
    const cardY = 308;
    const cardW = W - 120;
    const cardH = 220;

    doc.roundedRect(cardX, cardY, cardW, cardH, 8).fill('#1b1f1d');
    doc.rect(cardX, cardY, cardW, 36).fill('#0c3b2a');
    doc.roundedRect(cardX, cardY, cardW, 36, 8).fill('#0c3b2a');
    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(9)
       .text('DADOS DO INSCRITO', cardX, cardY + 13, { width: cardW, align: 'center', characterSpacing: 3 });

    const dados = [
      { label: 'Nome',       valor: inscricao.nome },
      { label: 'Email',      valor: inscricao.email },
      { label: 'Telefone',   valor: inscricao.telefone },
      { label: 'Valor pago', valor: parseInt(inscricao.valor).toLocaleString('pt-PT') + ' KZ' },
      { label: 'Data',       valor: new Date(inscricao.created_at).toLocaleString('pt-PT') },
    ];

    let yLinha = cardY + 52;
    dados.forEach((d, i) => {
      if (i > 0) {
        doc.strokeColor('rgba(255,255,255,0.06)').lineWidth(0.5)
           .moveTo(cardX + 20, yLinha - 8).lineTo(cardX + cardW - 20, yLinha - 8).stroke();
      }
      doc.fillColor('rgba(255,255,255,0.45)').font('Helvetica').fontSize(9)
         .text(d.label.toUpperCase(), cardX + 20, yLinha, { characterSpacing: 1 });
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
         .text(d.valor, cardX + 20, yLinha + 13);
      yLinha += 38;
    });

    const evCardY = cardY + cardH + 20;
    doc.roundedRect(cardX, evCardY, cardW, 90, 8).fill('#1b1f1d');
    doc.rect(cardX, evCardY, cardW, 36).fill('#0c3b2a');
    doc.roundedRect(cardX, evCardY, cardW, 36, 8).fill('#0c3b2a');
    doc.fillColor('#b5ff4d').font('Helvetica-Bold').fontSize(9)
       .text('DETALHES DO EVENTO', cardX, evCardY + 13, { width: cardW, align: 'center', characterSpacing: 3 });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
       .text('Oficina de Gestão de Projectos 2026', cardX + 20, evCardY + 46);
    doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(10)
       .text('28 de Março de 2026  ·  Luanda, Angola', cardX + 20, evCardY + 66);

    doc.rect(0, H - 80, W, 80).fill('#0c3b2a');
    doc.rect(0, H - 82, W, 3).fill('#b5ff4d');

    const rLogoH = 16;
    const rLogoObW = Math.round(rLogoH * (1771 / 400));
    const rLogoMrW = Math.round(rLogoH * (753 / 174));
    const rTotalW = rLogoObW + 10 + rLogoMrW;
    const rLogoX = (W - rTotalW) / 2;
    try {
      doc.image(path.join(ASSETS, 'ob.png'), rLogoX, H - 68, { width: rLogoObW, height: rLogoH });
      doc.fillColor('rgba(255,255,255,0.25)').font('Helvetica').fontSize(8)
         .text('×', rLogoX + rLogoObW + 2, H - 62, { width: 8, align: 'center' });
      doc.image(path.join(ASSETS, 'MR.6.png'), rLogoX + rLogoObW + 10, H - 68, { width: rLogoMrW, height: rLogoH });
    } catch (e) {}

    doc.fillColor('rgba(255,255,255,0.4)').font('Helvetica').fontSize(8)
       .text('Este documento é o comprovativo oficial da tua inscrição na Oficina de Gestão de Projectos.',
         40, H - 44, { align: 'center', width: W - 80 });
    doc.fillColor('rgba(255,255,255,0.25)').fontSize(8)
       .text(`Emitido em ${new Date().toLocaleString('pt-PT')}  ·  Comunidade CGP © 2026`,
         40, H - 28, { align: 'center', width: W - 80 });

    doc.end();
  });
}

// ─── Enviar Email com Comprovativo (Brevo API HTTP) ────────────
async function enviarComprovanteEmail(inscricao) {
  const pdfBuffer = await gerarComprovativoPDF(inscricao);
  const numComp = String(inscricao.id).padStart(6, '0');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Oficina CGP', email: 'mtbpedro17@gmail.com' },
      to: [{ email: inscricao.email, name: inscricao.nome }],
      subject: '✅ Inscrição Confirmada - Oficina de Projectos CGP',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
            <div style="background:#0c3b2a;padding:32px 40px;text-align:center;">
              <p style="color:#b5ff4d;font-size:11px;letter-spacing:4px;margin:0 0 8px;">COMUNIDADE CGP</p>
              <h1 style="color:#ffffff;font-size:22px;margin:0;line-height:1.3;">
                Oficina de Gestão<br>de Projectos 2026
              </h1>
            </div>
            <div style="padding:32px 40px;text-align:center;border-bottom:1px solid #eee;">
              <h2 style="color:#0c3b2a;font-size:20px;margin:0 0 8px;">Pagamento Confirmado!</h2>
              <p style="color:#666;font-size:14px;margin:0;">
                Olá <strong>${inscricao.nome}</strong>, a tua inscrição foi confirmada com sucesso.
              </p>
            </div>
            <div style="padding:28px 40px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="padding:10px 0;color:#999;font-size:12px;">COMPROVATIVO</td>
                  <td style="padding:10px 0;color:#0c3b2a;font-weight:bold;text-align:right;">Nº ${numComp}</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="padding:10px 0;color:#999;font-size:12px;">VALOR PAGO</td>
                  <td style="padding:10px 0;color:#0c3b2a;font-weight:bold;text-align:right;">${parseInt(inscricao.valor).toLocaleString('pt-PT')} KZ</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="padding:10px 0;color:#999;font-size:12px;">EVENTO</td>
                  <td style="padding:10px 0;color:#333;text-align:right;">28 de Março de 2026</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#999;font-size:12px;">LOCAL</td>
                  <td style="padding:10px 0;color:#333;text-align:right;">Luanda, Angola</td>
                </tr>
              </table>
            </div>
            <div style="margin:0 40px 28px;background:#f0faf4;border-left:4px solid #b5ff4d;border-radius:4px;padding:14px 16px;">
              <p style="margin:0;color:#0c3b2a;font-size:13px;">
                📎 O teu <strong>comprovativo oficial em PDF</strong> está em anexo.
              </p>
            </div>
            <div style="background:#0c3b2a;padding:20px 40px;text-align:center;">
              <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
                Comunidade CGP © 2026 · Oficina de Gestão de Projectos
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachment: [
        {
          name: `comprovativo_cgp_${numComp}.pdf`,
          content: pdfBuffer.toString('base64')
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao enviar email via Brevo');
  }

  console.log(`✅ Comprovativo enviado para ${inscricao.email}`);
}

module.exports = { enviarComprovanteEmail };