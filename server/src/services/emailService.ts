import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class EmailService {
  async sendVerificationEmail(email: string, token: string, username: string) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"Chrono" <${process.env.SMTP_USER || 'noreply@chrono.com'}>`,
      to: email,
      subject: 'Ative sua conta Chrono',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Space Mono', monospace;
                background-color: #f7f7f7;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 40px;
                border-radius: 8px;
                margin-top: 20px;
              }
              h1 {
                color: #8A2BE2;
                font-size: 24px;
                margin-bottom: 20px;
              }
              p {
                color: #111111;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #8A2BE2;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                margin: 20px 0;
              }
              .button:hover {
                background-color: #9400FF;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dbdbdb;
                color: #555555;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Bem-vindo ao Chrono, ${username}!</h1>
              <p>Obrigado por se registrar no Chrono. Para ativar sua conta, clique no botão abaixo:</p>
              <a href="${verificationUrl}" class="button">Ativar Conta</a>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #8A2BE2;">${verificationUrl}</p>
              <div class="footer">
                <p>Se você não criou uma conta no Chrono, pode ignorar este email.</p>
                <p>Este link expira em 24 horas.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Bem-vindo ao Chrono, ${username}!
        
        Obrigado por se registrar no Chrono. Para ativar sua conta, clique no link abaixo:
        
        ${verificationUrl}
        
        Se você não criou uma conta no Chrono, pode ignorar este email.
        Este link expira em 24 horas.
      `,
    };

    try {
      // Verify transporter configuration
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('❌ SMTP credentials not configured! Check your .env file:');
        console.error('   SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
        console.error('   SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');
        throw new Error('SMTP credentials not configured. Please check your .env file.');
      }

      console.log('📧 Attempting to send verification email to:', email);
      console.log('📧 Using SMTP:', process.env.SMTP_HOST, 'on port', process.env.SMTP_PORT);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   To:', email);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending verification email:');
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      if (error.response) {
        console.error('   SMTP response:', error.response);
      }
      console.error('   Full error:', error);
      
      // In development, still return true to allow testing
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Email sending failed, but continuing in development mode');
        return true;
      }
      throw error;
    }
  }
}

