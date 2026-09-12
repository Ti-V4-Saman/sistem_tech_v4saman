import { AdsRepository } from './ads.repository.js';

const repo = new AdsRepository();

function safeDiv(a, b) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return numB === 0 ? 0 : numA / numB;
}

export class AdsService {
  async getClients(organizationId) {
    return repo.getClientsWithAds(organizationId);
  }

  async getOverview(clientId, organizationId, startDate, endDate) {
    const source = await repo.getClientAdsSource(clientId, organizationId);
    if (!source) {
      return { mapped: false };
    }

    let meta = null;
    let google = null;

    if (source.meta_enabled) {
      const data = await repo.getMetaOverview(source.schema_name, startDate, endDate);
      meta = {
        spend: Number(data.spend) || 0,
        impressions: Number(data.impressions) || 0,
        clicks: Number(data.clicks) || 0,
        leads: Number(data.leads) || 0,
        messages: Number(data.messages) || 0,
        purchases: Number(data.purchases) || 0,
        purchaseValue: Number(data.purchase_value) || 0
      };
      
      meta.ctr = safeDiv(meta.clicks, meta.impressions) * 100;
      meta.cpc = safeDiv(meta.spend, meta.clicks);
      meta.cpm = safeDiv(meta.spend, meta.impressions) * 1000;
      meta.cpl = safeDiv(meta.spend, meta.leads);
      meta.cpmessage = safeDiv(meta.spend, meta.messages);
      meta.roas = safeDiv(meta.purchaseValue, meta.spend);
      meta.results = meta.leads + meta.messages;
    }

    if (source.google_enabled) {
      const data = await repo.getGoogleOverview(source.schema_name, startDate, endDate);
      google = {
        spend: Number(data.spend) || 0,
        impressions: Number(data.impressions) || 0,
        clicks: Number(data.clicks) || 0,
        conversions: Number(data.conversions) || 0,
        conversionValue: Number(data.conversion_value) || 0,
        purchases: Number(data.purchases) || 0,
        purchaseValue: Number(data.purchase_value) || 0
      };
      
      google.ctr = safeDiv(google.clicks, google.impressions) * 100;
      google.cpc = safeDiv(google.spend, google.clicks);
      google.cpa = safeDiv(google.spend, google.conversions);
      google.roas = safeDiv(google.conversionValue || google.purchaseValue, google.spend);
      google.results = google.conversions;
    }

    const totalSpend = (meta?.spend || 0) + (google?.spend || 0);
    const totalImpressions = (meta?.impressions || 0) + (google?.impressions || 0);
    const totalClicks = (meta?.clicks || 0) + (google?.clicks || 0);
    const totalResults = (meta?.results || 0) + (google?.results || 0);
    const totalRoasValue = (meta?.purchaseValue || 0) + (google?.conversionValue || google?.purchaseValue || 0);

    return {
      mapped: true,
      clientName: source.name,
      metaEnabled: Boolean(source.meta_enabled),
      googleEnabled: Boolean(source.google_enabled),
      overview: {
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        results: totalResults,
        roasValue: totalRoasValue,
        roas: safeDiv(totalRoasValue, totalSpend),
        cpc: safeDiv(totalSpend, totalClicks)
      },
      meta,
      google
    };
  }

  async getDailyData(clientId, organizationId, platform, startDate, endDate) {
    const source = await repo.getClientAdsSource(clientId, organizationId);
    if (!source) return [];

    if (platform === 'meta' && source.meta_enabled) {
      const raw = await repo.getMetaDaily(source.schema_name, startDate, endDate);
      return raw.map(r => ({
        date: r.date,
        spend: Number(r.spend) || 0,
        leads: Number(r.leads) || 0,
        messages: Number(r.messages) || 0,
        results: (Number(r.leads) || 0) + (Number(r.messages) || 0)
      }));
    }

    if (platform === 'google' && source.google_enabled) {
      const raw = await repo.getGoogleDaily(source.schema_name, startDate, endDate);
      return raw.map(r => ({
        date: r.date,
        spend: Number(r.spend) || 0,
        conversions: Number(r.conversions) || 0,
        results: Number(r.conversions) || 0
      }));
    }

    return [];
  }

  async getCampaigns(clientId, organizationId, platform, startDate, endDate) {
    const source = await repo.getClientAdsSource(clientId, organizationId);
    if (!source) return [];

    if (platform === 'meta' && source.meta_enabled) {
      const raw = await repo.getMetaCampaigns(source.schema_name, startDate, endDate);
      return raw.map(r => ({
        id: r.id_campanha,
        name: r.campanha,
        spend: Number(r.spend) || 0,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        leads: Number(r.leads) || 0,
        messages: Number(r.messages) || 0,
        roasValue: Number(r.roas_value) || 0,
        results: (Number(r.leads) || 0) + (Number(r.messages) || 0),
        cpl: safeDiv(r.spend, r.leads),
        cpmessage: safeDiv(r.spend, r.messages),
        cpa: safeDiv(r.spend, (Number(r.leads) || 0) + (Number(r.messages) || 0)),
        roas: safeDiv(r.roas_value, r.spend)
      }));
    }

    if (platform === 'google' && source.google_enabled) {
      const raw = await repo.getGoogleCampaigns(source.schema_name, startDate, endDate);
      return raw.map(r => ({
        id: r.id_campanha,
        name: r.campanha,
        type: r.tipo_campanha,
        spend: Number(r.spend) || 0,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        conversions: Number(r.conversions) || 0,
        roasValue: Number(r.roas_value) || 0,
        results: Number(r.conversions) || 0,
        cpa: safeDiv(r.spend, r.conversions),
        roas: safeDiv(r.roas_value, r.spend)
      }));
    }

    return [];
  }
}
