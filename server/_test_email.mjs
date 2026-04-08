import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'umjuan123@gmail.com',
    pass: 'yemhxxsckzzidxir'
  }
});

const mailOptions = {
  from: 'Chrono <umjuan123@gmail.com>',
  to: 'heitortasso12@gmail.com',
  subject: '✉️ Teste de Email - Chrono',
  html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
        <div style="text-align:center;padding:30px 0 20px;border-bottom:2px solid #0084ff;">
            <div style="font-size:28px;font-weight:bold;color:#0084ff;letter-spacing:-1px;">⏱️ CHRONO</div>
            <p style="margin-top:8px;color:#666;font-size:12px;">Rede Social Temporal</p>
        </div>
        <div style="background-color:#fafafa;border:1px solid #e0e0e0;border-radius:12px;padding:30px;margin:30px 0;text-align:center;">
            <p style="font-size:20px;font-weight:600;color:#050505;margin-bottom:15px;">👋 Olá!</p>
            <p style="font-size:14px;color:#666;margin-bottom:30px;line-height:1.8;">
                Este é um <strong>email de teste</strong> do sistema de verificação do Chrono.<br>
                Se você recebeu este email, o SMTP está funcionando corretamente! ✅
            </p>
            <div style="display:inline-block;background-color:#0084ff;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                ✓ SMTP Operacional
            </div>
            <div style="background-color:#f0f7ff;border-left:4px solid #0084ff;padding:15px;margin:20px 0;border-radius:4px;font-size:12px;color:#0084ff;text-align:left;">
                💡 O serviço de email está configurado e pronto para enviar links de verificação de conta.
            </div>
        </div>
        <div style="text-align:center;padding:20px 0;color:#666;font-size:13px;">
            <p style="margin:10px 0;"><strong>🌍 Explore</strong> - Viaje através das 24 horas</p>
            <p style="margin:10px 0;"><strong>🔗 Conecte</strong> - Faça amigos em qualquer momento</p>
            <p style="margin:10px 0;"><strong>⏳ Descubra</strong> - Conteúdo que dura 24 horas</p>
        </div>
        <div style="text-align:center;padding:30px 0 20px;border-top:1px solid #e0e0e0;font-size:12px;color:#999;">
            <p style="margin-bottom:15px;">© 2026 Chrono - Rede Social Temporal</p>
            <p style="font-size:11px;color:#999;font-style:italic;">
                ⚠️ Este é um email de teste. Nenhuma ação é necessária.
            </p>
        </div>
    </div>
</body>
</html>
  `
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email enviado com sucesso!');
  console.log('   Message ID:', info.messageId);
  console.log('   Para:', mailOptions.to);
} catch (err) {
  console.error('❌ Erro ao enviar email:', err.message);
  process.exit(1);
}
