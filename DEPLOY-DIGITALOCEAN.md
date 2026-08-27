# 🚀 Guia de Deploy em Produção na DigitalOcean

Este repositório está pronto para ser publicado no seu servidor Droplet na DigitalOcean utilizando **Docker Compose**, **Nginx** e SSL gratuito via **Let's Encrypt (Certbot)** para o domínio `https://techops.v4saman.com`.

---

## 📋 Arquivos do Projeto

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

### 2. Conectar e Preparar o Servidor
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

### 3. Criar a Pasta `/home/techops` e Clonar o Repositório
Navegue até a pasta `/home`, crie o diretório `techops` e clone o repositório dentro dele:
```bash
cd /home
mkdir -p techops
cd techops
git clone https://github.com/Ti-V4-Saman/sistem_tech_v4saman.git .
```

---

### 4. Configurar o Arquivo `.env`
Crie o arquivo de variáveis de ambiente a partir do modelo de produção:
```bash
cp .env.production.example .env
nano .env
```
*Ajuste as senhas (`DB_PASSWORD`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD`) e credenciais do Google no arquivo.*

---

### 5. Gerar o Certificado SSL Gratuito (Certbot / Let's Encrypt)
Crie as pastas dos certificados e execute o Certbot via Docker:
```bash
mkdir -p certbot/conf certbot/www

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

### 6. Subir os Containers com Docker Compose
Com tudo configurado, inicie a aplicação em segundo plano:
```bash
docker compose up -d --build
```

---

### 7. Verificação do Status dos Serviços
Verifique se todos os containers (`techops_db`, `techops_api`, `techops_web`) estão ativos:
```bash
docker compose ps
```

Para monitorar os logs:
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
Sempre que fizer alterações e executar `git push origin main`, no servidor basta executar:
```bash
cd /home/techops
git pull
docker compose up -d --build
```
