# 🚀 Guia de Deploy em Produção na DigitalOcean

Este repositório está pronto para ser publicado no seu servidor Droplet na DigitalOcean utilizando **Docker Compose**, **Nginx** e SSL gratuito via **Let's Encrypt (Certbot)** para o domínio `https://techops.v4saman.com`.

---

## 📋 Arquivos Criados no Projeto

- `docker-compose.yml`: Orquestração dos serviços (`db` MySQL 8, `api` Express e `web` Nginx).
- `Dockerfile.api`: Container para a API Express com execução automática de migrações.
- `Dockerfile.web`: Multi-stage build para compilar o React Vite e servir pelo Nginx.
- `nginx/default.conf`: Proxy reverso otimizado com rotas `/api/`, SPA fallback e suporte a SSL.
- `.env.production.example`: Modelo de variáveis de ambiente para a produção.

---

## 🛠️ Passo a Passo para Deploy na DigitalOcean

### 1. Configurar o Apontamento DNS (Domínio)
No seu provedor de DNS (Cloudflare, Registro.br, GoDaddy, etc.):
- Crie um registro do tipo **A**:
  - **Nome/Host**: `techops` (resultando em `techops.v4saman.com`)
  - **Valor/IPv4**: Endereço IP público do seu Droplet na DigitalOcean.

---

### 2. Preparar o Servidor (Droplet DigitalOcean)
Conecte ao seu servidor via SSH:
```bash
ssh root@SEU_IP_DIGITALOCEAN
```

Instale o **Docker** e o **Docker Compose** (caso ainda não estejam instalados):
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

---

### 3. Clonar o Projeto e Configurar o `.env`
No servidor, clone o repositório e navegue até a pasta:
```bash
git clone <URL_DO_SEU_REPOSITORIO> sistema-tech
cd sistema-tech
```

Crie o arquivo de variáveis de ambiente de produção a partir do modelo:
```bash
cp .env.production.example .env
nano .env
```
*Edite as senhas (`DB_PASSWORD`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD`) e o `GOOGLE_CLIENT_ID` se aplicável.*

---

### 4. Gerar o Certificado SSL Gratuito (Certbot / Let's Encrypt)

Para gerar os certificados SSL na primeira vez para `techops.v4saman.com`:

1. Crie as pastas temporárias do Certbot:
```bash
mkdir -p certbot/conf certbot/www
```

2. Execute o Certbot temporário via Docker para validar e emitir os certificados:
```bash
docker run -it --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d techops.v4saman.com \
  --email admin@v4saman.com \
  --agree-tos \
  --no-eff-email
```

---

### 5. Subir os Containers com Docker Compose

Com as credenciais e certificados no lugar, inicie a aplicação:
```bash
docker compose up -d --build
```

---

### 6. Verificação do Status dos Serviços

Verifique se todos os containers (`db`, `api`, `web`) estão rodando normalmente:
```bash
docker compose ps
```

Para visualizar logs do sistema:
```bash
# Logs gerais
docker compose logs -f

# Logs da API backend
docker compose logs -f api

# Logs do Nginx
docker compose logs -f web
```

---

### 🔄 Atualizações Futuras (Deploy de Novas Versões)

Sempre que atualizar seu código e fizer `git push`, no servidor basta rodar:
```bash
git pull
docker compose up -d --build
```
