import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const providedListRaw = `
Vike Jóias
Fran-Laser Gráfica
La Na Rita Alimentos
Leilão Já
Brasil Gases
Pousada do Porto Rifaina
BCL Saúde
Cynbom Alimentos (Sabor Total)
Oficina Souza Pires
TV Shop
Pllena Obras Industriais
Carbex
Precin
Cervejaria Partner
Agronordeste
Sanys Hering
Pick Up Imports
W7 Prime Imports
Twikky Beach
Awo Omi
Posto SF IV
ThermoVip
Lojão das Bombas
Raposo Motors
33 Soluções Visuais
RotoGrill
Flame Pizzaria
Urbano Norte Floripa
Casa do Motoqueiro
Lord Glass
Forjados na Fé
Mercado Rodrigues
Luci Luci
Impacto Soluções Seguros
Delima Empreendimentos
DINDIN BOM Gourmet
Grupo Hoff
Automak
Xprime
Forma Certa Gráfica
Kelly Imóveis
Sonora
Engra Engenharia
Cobra Embalagens
Get Emprestimos
Meu Locker
Ancon Seg
Logrosoft
Barka Gastronomia
Lua Cheia
Interalum
Hgmax
Alta Pratas
Prime Fit
Ícaro Health
MDS
Spinelli Contabilidade
WR2 Construtora
Unicapital
Crimavel
Instituto A Força do Bem
O Casa Floresta
LBN Empreendimentos
Ucorp
Tudu Phooto
Banco Unique
SegNorte
Ze Maria Supermercado
Lointer Software
Grupo Fabrick
4Watt
Kasanova
Tereos
Tellar Soluções em Engenharia
Chapp
Renato Auto Center
Mix Impressos
Granisul
Villa Kahvi
Mrx
Clinica Eviva
Ti Plus
Panificadora Amsterdan
WP Manager
Excelência Soluções Agrícolas
Head Spa
Up Pressurizadores Inteligentes
Baboon Cosmeticos
Acesse Seu Condomínio
Quadoo Arquitetura Corporativa
Horti + Vida
Grupo Gama
Divinnus Gastronomia
Bengo Açaí
Dr Matheus Galhardo
Unique Guns
Guarda Bem
Ki-Máximo Açaí
King Fitness
Teclabel
Porsche
Petmimo
Instituto Wesley Gabriel
Promom
Serve Bem
Miraluz
Rolp
Enermont
Paulo Serviços de Engenharia
SCM Marcenaria
Ágil Metal
Império Locações
Edson Pipas e Fogos
Papelaria Rainha
XSol Automação
Cuide Bem
Patroni Franchising
Novafit
Grupo Proeste Renault
Impacto Academico
Tercel Salgados
Indubras
Casa Tree Móveis
Embol (Brasilplast)
Body Station
StarVip
Rb Laser Depilação
Beni Gastro
Flores e Formas
BH Embreagens
Land BH
UAV Streetwear
Academia Agitare
Art Figueroa
Santa Luiza Transporte
Dr Eduardo Gomes
Restaurante Dona Cris
Instituto Kleber Caiado Fisioterapia
AquaMais
Urus Fit
Famerp (Restaurante Grão de Bico)
Vx Telerradiologia
Trr Diesel Express
Boutique de Carnes Sal Grosso Moinhos
DryClean
Auto-R Caputo
Grupo Perita
De Melo Trevisan
RBarros Stands
Centro Stima
Dental Bueno
Nobra Engenharia
Star Móveis
NFood
Atlas Locações
Ekyte Software
All Rubber
The Black Beef Mogi
Passira Pizzaria e Restaurante
Lupulapa
Pirikito Tênis
Spitz Pomer
Clinicão
Pacific Incorporadora
Vipart
Wep Compliance
Vidoti Salgados
De Nois Proce
Vitória Semi Novos
Kidstok
Truly Nolen
Torina e Santoro Semi Jóias
Contato Condomínios
Geeco
Limc Papeis e Serviços
TotalMedi
Dual Fitness (Sparta Fight Team)
Vila Hortensia
Pollo Veículos
Nacife
Grupo Primicias
Setta Incorporadora
Unnico Saúde
Siglia Azevedo
Viga
Marchesini & Lisboa
Uninova
BDA
Ice Gustos
So Farois
Atalaia Alimentos
Deliciare
Dec Distribuidora
Incantus Motel
Ecoville
Hyundai Autoville
Tecar
Qmais Vendas
Dr Bruno (Implantes Prime)
H Endos
Orkhestra
CDI Implantes
Alessandra Pardini
Suturmedic
Villefort
`;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Convert provided list to set of normalized names
const providedSet = new Set(
  providedListRaw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(name => normalize(name))
);

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'techhub',
  });

  const [rows] = await connection.execute('SELECT name FROM clients');
  
  const notInList = [];
  
  for (const client of rows) {
    const normName = normalize(client.name);
    
    // Check direct matching or partial matching
    let found = providedSet.has(normName);
    if (!found) {
      // Check if any in the provided set contains the normName or vice-versa
      for (const prov of providedSet) {
        if (prov.includes(normName) || normName.includes(prov)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      notInList.push(client.name);
    }
  }

  console.log(JSON.stringify(notInList, null, 2));

  await connection.end();
}

main().catch(console.error);
