# Setup sistema_tech_v4
Set-Location "c:\Users\Giovani\Desktop\Projetos v0\sistema_tech_v4"

# Copia o arquivo principal para src/App.jsx
Copy-Item "V4ITHub_v0.2.jsx" -Destination "src\App.jsx" -Force
Write-Host "✅ src/App.jsx criado"

# Instala dependências
Write-Host "📦 Instalando dependências..."
npm install

Write-Host "🚀 Iniciando dev server..."
npm run dev
