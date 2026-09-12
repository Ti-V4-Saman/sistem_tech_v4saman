import { query as appQuery } from '../../db/pool.js';
import { queryAds } from '../../db/ads-pool.js';

export class AdsRepository {
  async getClientAdsSource(clientId, organizationId) {
    // Valida se o cliente existe e pertence à org do usuário
    const { rows } = await appQuery(`
      SELECT cas.schema_name, cas.meta_enabled, cas.google_enabled, c.name
      FROM clients c
      JOIN client_ads_sources cas ON cas.client_id = c.id
      WHERE c.id = ? AND c.organization_id = ?
    `, [clientId, organizationId]);
    
    return rows[0] || null;
  }
  
  async getClientsWithAds(organizationId) {
    const { rows } = await appQuery(`
      SELECT c.id, c.name, cas.schema_name, cas.meta_enabled, cas.google_enabled
      FROM clients c
      JOIN client_ads_sources cas ON cas.client_id = c.id
      WHERE c.organization_id = ? AND c.status = 'active'
      ORDER BY c.name
    `, [organizationId]);
    return rows;
  }

  // whitelist check for safety
  validateSchema(schema) {
    if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
      throw new Error('Invalid schema name');
    }
    return schema;
  }
  
  async getMetaOverview(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        SUM(valor_gasto) as spend,
        SUM(impressoes) as impressions,
        SUM(clicks_no_link) as clicks,
        SUM(leads) as leads,
        SUM(mensagens_enviadas) as messages,
        SUM(compras) as purchases,
        SUM(valor_compras) as purchase_value
      FROM \`${s}\`.bd_meta_ads
      WHERE data >= ? AND data <= ?
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows[0] || {};
  }
  
  async getGoogleOverview(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        SUM(valor_gasto) as spend,
        SUM(impressoes) as impressions,
        SUM(clicks_no_link) as clicks,
        SUM(conversoes) as conversions,
        SUM(valor_da_conversao) as conversion_value,
        SUM(compras) as purchases,
        SUM(receita_ecommerce) as purchase_value
      FROM \`${s}\`.bd_google_ads
      WHERE data >= ? AND data <= ?
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows[0] || {};
  }
  
  async getMetaDaily(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        data as date,
        SUM(valor_gasto) as spend,
        SUM(leads) as leads,
        SUM(mensagens_enviadas) as messages
      FROM \`${s}\`.bd_meta_ads
      WHERE data >= ? AND data <= ?
      GROUP BY data
      ORDER BY data ASC
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows;
  }
  
  async getGoogleDaily(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        data as date,
        SUM(valor_gasto) as spend,
        SUM(conversoes) as conversions
      FROM \`${s}\`.bd_google_ads
      WHERE data >= ? AND data <= ?
      GROUP BY data
      ORDER BY data ASC
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows;
  }
  
  async getMetaCampaigns(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        id_campanha,
        campanha,
        SUM(valor_gasto) as spend,
        SUM(impressoes) as impressions,
        SUM(clicks_no_link) as clicks,
        SUM(leads) as leads,
        SUM(mensagens_enviadas) as messages,
        SUM(valor_compras) as roas_value
      FROM \`${s}\`.bd_meta_ads
      WHERE data >= ? AND data <= ?
      GROUP BY id_campanha, campanha
      ORDER BY spend DESC
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows;
  }
  
  async getGoogleCampaigns(schema, startDate, endDate) {
    const s = this.validateSchema(schema);
    const sql = `
      SELECT 
        id_campanha,
        campanha,
        tipo_campanha,
        SUM(valor_gasto) as spend,
        SUM(impressoes) as impressions,
        SUM(clicks_no_link) as clicks,
        SUM(conversoes) as conversions,
        SUM(valor_da_conversao) as roas_value
      FROM \`${s}\`.bd_google_ads
      WHERE data >= ? AND data <= ?
      GROUP BY id_campanha, campanha, tipo_campanha
      ORDER BY spend DESC
    `;
    const { rows } = await queryAds(sql, [startDate, endDate]);
    return rows;
  }
}
