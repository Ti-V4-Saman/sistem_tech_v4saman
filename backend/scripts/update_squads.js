import { query } from '../src/db/pool.js';

const clientSquads = {
  "Lojão das Bombas": "Atlas",
  "RotoGrill": "Atlas",
  "Mercado Rodrigues": "Atlas",
  "Spitz Pomer": "Atlas",
  "Impacto Soluções Seguros": "Atlas",
  "Flame Pizzaria": "Atlas",
  "TV Shop": "Bravo",
  "Carbex": "Bravo",
  "Agronordeste": "Bravo",
  "Sanys Hering": "Bravo",
  "Engra Engenharia": "Briu",
  "ThermoVip": "Briu",
  "Urbano Norte Floripa": "Briu",
  "Cobra Embalagens": "Genius",
  "Ze Maria Supermercado": "Genius",
  "Lointer Software": "Genius",
  "De Melo Trevisan": "Genius",
  "WP Manager": "Genius",
  "Barka Gastronomia": "Genius",
  "Tercel Salgados": "Genius",
  "MDS": "Genius",
  "H Endos": "Genius",
  "Suturmedic": "Genius",
  "Precin": "Genius",
  "33 Soluções Visuais": "Genius",
  "Âncora Marine Serviços Navais": "Genius",
  "RBarros Stands": "Genius",
  "Controltec": "Seals",
  "Yeast Foods": "Seals",
  "Vike Jóias": "Seals",
  "Fran-Laser Gráfica": "Seals",
  "La Na Rita Alimentos": "Seals",
  "BCL Saúde": "Seals",
  "Pick Up Imports": "Seals",
  "Cervejaria Partner": "Seals",
  "W7 Prime Imports": "Seals",
  "Twikky Beach": "Seals",
  "Awo Omi": "Seals",
  "Posto SF IV": "Seals",
  "Casa do Motoqueiro": "Seals",
  "Forjados na Fé": "Seals",
  "Luci Luci": "Seals",
  "DINDIN BOM Gourmet": "Seals",
  "Ekyte Software": "Seals",
  "Império Locações": "Seals",
  "Mrx": "Seals",
  "Grupo Fabrick": "Seals",
  "Ícaro Health": "Seals",
  "Clinica Eviva": "Seals",
  "Get Emprestimos": "Seals",
  "Ancon Seg": "Seals",
  "Hgmax": "Seals",
  "Prime Fit": "Seals",
  "Indubras": "Seals",
  "Edson Pipas e Fogos": "Seals",
  "Pirikito Tênis": "Seals",
  "Miraluz": "Seals",
  "Beni Gastro": "Seals",
  "Orkhestra": "Seals",
  "Hyundai Autoville": "Seals",
  "Villefort": "Seals",
  "Mercadão dos Óculos": "Snipers",
  "Q Óculos Braganca": "Snipers",
  "AuthPay": "Snipers",
  "CeasCred": "Snipers",
  "Leilão Já": "Snipers",
  "Brasil Gases": "Snipers",
  "Pousada do Porto Rifaina": "Snipers",
  "Cynbom Alimentos (Sabor Total)": "Snipers",
  "Oficina Souza Pires": "Snipers",
  "Pllena Obras Industriais": "Snipers",
  "Raposo Motors": "Snipers",
  "Lord Glass": "Snipers",
  "Delima Empreendimentos": "Snipers",
  "Art Figueroa": "Snipers",
  "Clinicão": "Snipers",
  "Crimavel": "Snipers",
  "O Casa Floresta": "Snipers",
  "Chapp": "Snipers",
  "Centro Stima": "Snipers",
  "Meu Locker": "Snipers",
  "Logrosoft": "Snipers",
  "Lua Cheia": "Snipers",
  "Interalum": "Snipers",
  "Alta Pratas": "Snipers",
  "Impacto Academico": "Snipers",
  "Deliciare": "Snipers",
  "Rolp": "Snipers",
  "Qmais Vendas": "Snipers",
  "Tecar": "Snipers",
  "Dr Bruno (Implantes Prime)": "Snipers",
  "CDI Implantes": "Snipers",
  "Alessandra Pardini": "Snipers"
};

async function updateSquads() {
  console.log('Fetching clients with active technology (n8n or typebot)...');
  
  // Find clients that have at least one automation or bot
  const { rows: techClients } = await query(`
    SELECT DISTINCT c.id, c.name, c.legal_name 
    FROM clients c
    LEFT JOIN automations a ON a.client_id = c.id
    LEFT JOIN bots b ON b.client_id = c.id
    WHERE a.id IS NOT NULL OR b.id IS NOT NULL
  `);

  console.log(`Found ${techClients.length} clients in DB with technology.`);
  
  let updatedCount = 0;
  for (const client of techClients) {
    let squad = clientSquads[client.name] || clientSquads[client.legal_name];
    
    // Also try fuzzy matching
    if (!squad) {
      const match = Object.keys(clientSquads).find(key => 
        client.name.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(client.name.toLowerCase()) ||
        (client.legal_name && client.legal_name.toLowerCase().includes(key.toLowerCase()))
      );
      if (match) squad = clientSquads[match];
    }

    if (squad) {
      await query(`UPDATE clients SET unit = ? WHERE id = ?`, [squad, client.id]);
      console.log(`Updated client "${client.name}" to squad "${squad}"`);
      updatedCount++;
    }
  }

  console.log(`\nFinished updating squads. Updated ${updatedCount} clients.`);
  process.exit(0);
}

updateSquads().catch(err => {
  console.error('Error updating squads:', err);
  process.exit(1);
});
