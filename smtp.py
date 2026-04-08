import smtplib
import ssl
import os
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage

def baixar_imagem(url, caminho_local):
    """Tenta baixar a imagem da URL e salvar localmente."""
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://x.com/',
    })
    with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
        dados = response.read()
    with open(caminho_local, 'wb') as f:
        f.write(dados)
    return dados

def enviar_email():
    # Suas credenciais
    remetente = "umjuan123@gmail.com"
    senha = "yemhxxsckzzidxir"  # Veja a nota sobre segurança abaixo
    
    # Dados do destinatário e mensagem
    destinatario = "umjuan1@gmail.com"
    assunto = "Notificação do Sistema"
    corpo = "Olá! Eu estou devendo a minha casa depois da fatura da AWS (help-me-please)."
    
    # Caminho local para a imagem (salve a imagem aqui se o download falhar)
    caminho_imagem = os.path.join(os.path.dirname(__file__), "imagem.jpg")
    
    # URL da imagem (CDN direta do Twitter, não a página do tweet)
    url_imagem = "https://pbs.twimg.com/media/DV0LxGeX0AEfSVp.jpg:large"
    
    # Tentar carregar: primeiro do arquivo local, senão tenta baixar da URL
    if os.path.exists(caminho_imagem):
        print(f"Carregando imagem local: {caminho_imagem}")
        with open(caminho_imagem, 'rb') as f:
            imagem_bytes = f.read()
    else:
        try:
            print("Baixando imagem da URL...")
            imagem_bytes = baixar_imagem(url_imagem, caminho_imagem)
            print(f"Imagem salva em: {caminho_imagem}")
        except Exception as e:
            print(f"Erro ao baixar imagem: {e}")
            print(f"\n>>> SOLUÇÃO: Salve a imagem manualmente em '{caminho_imagem}'")
            print(">>> Clique com botão direito na imagem no navegador > 'Salvar imagem como...'")
            return

    # Montando a estrutura do e-mail (related: permite imagens inline)
    msg = MIMEMultipart('related')
    msg['From'] = remetente
    msg['To'] = destinatario
    msg['Subject'] = assunto

    # Sub-parte alternative (texto + HTML)
    msg_alt = MIMEMultipart('alternative')

    # Parte em texto puro (fallback)
    msg_alt.attach(MIMEText(corpo, 'plain'))

    # Parte em HTML com imagem inline via CID
    html = f"""\
    <html>
      <body>
        <p>{corpo}</p>
        <img src="cid:imagem_inline" alt="Bob Esponja">
      </body>
    </html>
    """
    msg_alt.attach(MIMEText(html, 'html'))
    msg.attach(msg_alt)

    # Anexar a imagem como parte inline (base64 é feito automaticamente pelo MIMEImage)
    imagem = MIMEImage(imagem_bytes, _subtype='jpeg')
    imagem.add_header('Content-ID', '<imagem_inline>')
    imagem.add_header('Content-Disposition', 'inline', filename='imagem.jpg')
    msg.attach(imagem)

    servidor = None
    try:
        # Conectando ao servidor SMTP do Google na porta 587
        print("Conectando ao servidor...")
        servidor = smtplib.SMTP('smtp.gmail.com', 587)
        servidor.starttls()  # Iniciando a criptografia
        
        # Realizando o login
        servidor.login(remetente, senha)
        
        # Enviando a mensagem
        servidor.send_message(msg)
        print("E-mail enviado com sucesso!")
        
    except smtplib.SMTPAuthenticationError:
        print("Erro de Autenticação: Verifique se você está usando uma Senha de App válida.")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        
    finally:
        # Fechando a conexão com o servidor
        if servidor:
            servidor.quit()

if __name__ == "__main__":
    enviar_email()