import { query } from '../backend/src/db/pool.js';
import { encryptSecret } from '../backend/src/utils/crypto.js';

const toolsData = [
  { tool_name: "Active Campaign | Copygreen", tool_link: "https://copygreenl.activehosted.com/admin/", login: "copygreen@copygreen.com.br", password: "@ccess2511", auth_details: "Gmail" },
  { tool_name: "Active Campaign | Cortel", tool_link: "https://spe-consorcio.activehosted.com/admin/", login: "guto.quiros@cortelsp.com.br", password: "V4Company2024$", auth_details: "" },
  { tool_name: "API QuePasa", tool_link: "https://api.v4saman.com/", login: "chat@v4saman.com", password: "V4sa@1711", auth_details: "Azure" },
  { tool_name: "Azure", tool_link: "", login: "bi.bh@v4company.com", password: "V4@123!@#BiMs", auth_details: "Celular Giovani, e-mail Giovani, Authenticator Luiz" },
  { tool_name: "Banco CRM V4", tool_link: "", login: "v4chat", password: "Rizek2606*v4", auth_details: "157.245.127.80", notes: "database: nomedainstancia BD - V4BH_DADOS Servidor - v4seaserverusa02.database.windows.net" },
  { tool_name: "Bubble.io", tool_link: "https://bubble.io/login", login: "ti.bh@v4company.com", password: "V4ada24*10*76", auth_details: "Gmail" },
  { tool_name: "CloudFlare | Fabrick", tool_link: "", login: "victor.gusmao@v4company.com", password: "Lopes100@" },
  { tool_name: "CPanel | OCCD", tool_link: "https://www.occdadvogados.com.br/cpanel", login: "httpsoccdadvogad", password: "ola10203040" },
  { tool_name: "Facebook - Kelvin", tool_link: "", login: "kelvin.araujo@v4company.com", password: "V4SA@kelvin!!", auth_details: "Codigos rec: 10643679, 20295415..." },
  { tool_name: "Github", tool_link: "", login: "ti.bh@v4company.com", password: "V4ada24*10*76@", auth_details: "Ti-V4-Saman" },
  { tool_name: "Gmail - Kelvin", tool_link: "", login: "kelvin.araujo@v4company.com", password: "V4SA@kelvin!!", auth_details: "Telefone P&P" },
  { tool_name: "Gmail - BI", tool_link: "", login: "bi.bh@v4company.com", password: "BI@BH25112025", auth_details: "Telefone Daividson e Giovani" },
  { tool_name: "Gmail - TI", tool_link: "", login: "ti.bh@v4company.com", password: "V4ada24*10*76!@#$", auth_details: "Telefone Bryan, Kelvin, Luiz, Giovani e Guerra" },
  { tool_name: "Gmail - Giovani", tool_link: "", login: "giovani.maia@v4company.com", password: "V4SA@Giovani!!!" },
  { tool_name: "Gmail - Luiz", tool_link: "", login: "luiz.fernandes@v4company.com", password: "V4SA@Luiz" },
  { tool_name: "Gmail - Criativo", tool_link: "", login: "criativo.bh@v4company.com", password: "V4SA@criativobh!@Saman_Criativo!@" },
  { tool_name: "GoDaddy", tool_link: "", login: "100664885", password: "V4SA@TIBH!@1234", notes: "Domínio Principal v4saman.com" },
  { tool_name: "Hostgator | Shopping", tool_link: "", login: "ullyssesfranco@hotmail.com", password: "Tech@mysystem2022", auth_details: "Gmail" },
  { tool_name: "LastPass", tool_link: "", login: "ti.bh@v4company.com", password: "@4100V41969@123ti", auth_details: "Gmail" },
  { tool_name: "Make", tool_link: "https://www.make.com/en/login", login: "kelvin.araujo@v4company.com", password: "V4SA@kelvin!" },
  { tool_name: "N8N Kelvin", tool_link: "", login: "kelvin.araujo@v4company.com", password: "V4SA@kelvinl!" },
  { tool_name: "Omie | V4", tool_link: "https://portal.omie.com.br/home", login: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { tool_name: "Pipedrive - Supera", tool_link: "", login: "marketing@franquiasupera.com.br", password: "lx&2aD82" },
  { tool_name: "Power BI", tool_link: "", login: "bi.bh@v4company.com", password: "V4@123!@#BiMs" },
  { tool_name: "RD Station | Fabrick", tool_link: "", login: "contato@fabrick.com.br", password: "Marcos1701*" },
  { tool_name: "Registro.br | V4", tool_link: "", login: "FAEMD", password: "drhank2961@" },
  { tool_name: "Registro.br | Victor Gusmão", tool_link: "", login: "VIGMO37", password: "Lopes100@" },
  { tool_name: "Servidor Task | Apoá", tool_link: "https://webmail.task.com.br/", login: "sac@apoa.com.br", password: "exDX019S-7" },
  { tool_name: "Servidor Task | Embol", tool_link: "https://webmail.task.com.br/", login: "faleconosco@embol.com.br", password: "Migracao@2022" },
  { tool_name: "Unbounce", tool_link: "https://app.unbounce.com/users/sign_in", login: "ti.bh@v4company.com", password: "Unbounce@v4saman" },
  { tool_name: "Zapier | Meu Locker", tool_link: "https://zapier.com/", login: "higor@meulocker.com.br", password: "Ilicitos2024@" },
  { tool_name: "Zapier | Saman & Co", tool_link: "https://zapier.com/", login: "kelvin.araujo@v4company.com", password: "V4SA@kelvinl!" },
  { tool_name: "N8N Ops | Luiz Fernandes", tool_link: "", login: "luiz.fernandes@v4company.com", password: "LuizV4n8n@123" },
  { tool_name: "Kommo | Cuide Bem", tool_link: "https://www.kommo.com/br/login/", login: "casaderepousocuidebem@gmail.com", password: "CuideBem#2019" },
  { tool_name: "Kommo | Hoff", tool_link: "", login: "Maicon.merlo@hoff.com.br", password: "Maicon01#" },
  { tool_name: "Kommo | Varios acessos", tool_link: "", login: "fabio.junior@v4company.com", password: "33120030@V4company" },
  { tool_name: "Wordpress", tool_link: "", login: "ti.bh@v4company.com", password: "V4Sa24*29*04" },
  { tool_name: "Hostinger", tool_link: "", login: "ti.bh@v4company.com", password: "V4Sa24*29*04!" },
  { tool_name: "Hostinger - EasyPainel", tool_link: "", login: "ti.bh@v4company.com", password: "V4Sa242&904@" },
  { tool_name: "WIX", tool_link: "", login: "ti.bh@v4company.com", password: "V4Ruiz&Co" }
];

const financialData = [
  { service_name: "Adobe - criativo.sjc@", monthly_cost: 165.00, plan_details: "Creative Cloud", renewal_date: null, due_date: 31, payment_method: "", invoice_info: "", user_access: "Ops" },
  { service_name: "Adobe - felipesamanbh@gmail.com", monthly_cost: 95.00, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Ops" },
  { service_name: "appwoot", monthly_cost: 200.00, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Azure", monthly_cost: 596.00, plan_details: "", renewal_date: null, due_date: 9, payment_method: "", invoice_info: "Pausada por Falta de Pagamento", user_access: "Tech" },
  { service_name: "Clicksign", monthly_cost: 30.00, plan_details: "Avançado", renewal_date: null, due_date: 21, payment_method: "", invoice_info: "", user_access: "Balboa" },
  { service_name: "DashGoo | MLabs", monthly_cost: 476.00, plan_details: "Completo", renewal_date: null, due_date: 30, payment_method: "", invoice_info: "", user_access: "Social" },
  { service_name: "Digital Ocean", monthly_cost: 3727.27, plan_details: "Premium", renewal_date: null, due_date: 1, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Envato", monthly_cost: 198.00, plan_details: "Premium Anual (USD)", renewal_date: null, due_date: 25, payment_method: "", invoice_info: "Cartão bloqueado para evitar cobranças - Cart. Final 1859", user_access: "Ops" },
  { service_name: "Figma", monthly_cost: 20.00, plan_details: "Profissional (USD)", renewal_date: null, due_date: null, payment_method: "", invoice_info: "Plano gratuito", user_access: "Ops" },
  { service_name: "FreePik", monthly_cost: 103.00, plan_details: "Premium", renewal_date: null, due_date: 1, payment_method: "", invoice_info: "Cart. Final 2669", user_access: "Ops" },
  { service_name: "GreatPages", monthly_cost: 309.30, plan_details: "Plano Agência", renewal_date: null, due_date: 30, payment_method: "", invoice_info: "", user_access: "Ops" },
  { service_name: "Hostinger", monthly_cost: 359.88, plan_details: "Web Empresarial (Anual)", renewal_date: null, due_date: 5, payment_method: "", invoice_info: "Cartão bloqueado - Cart. Final 3760", user_access: "Tech" },
  { service_name: "Maynchat", monthly_cost: 150.00, plan_details: "Por usuario", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Social" },
  { service_name: "Meetime", monthly_cost: 3280.00, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Balboa" },
  { service_name: "Meu Vono", monthly_cost: 302.80, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Balboa" },
  { service_name: "Microsoft Ferramenta", monthly_cost: 9.49, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Notion", monthly_cost: 440.00, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Ops" },
  { service_name: "OpenAI", monthly_cost: 17.00, plan_details: "Credito por Uso", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Rapid Api", monthly_cost: 0.00, plan_details: "Basico Free", renewal_date: null, due_date: 22, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Serasa", monthly_cost: 119.99, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Financeiro" },
  { service_name: "Stack V4", monthly_cost: 4000.00, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Unidade" },
  { service_name: "Unbounce", monthly_cost: 0.00, plan_details: "Free", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Ops" },
  { service_name: "v0", monthly_cost: 20.00, plan_details: "Premium (USD)", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Tech" },
  { service_name: "Vindi", monthly_cost: 166.65, plan_details: "", renewal_date: null, due_date: null, payment_method: "", invoice_info: "", user_access: "Financeiro" }
];

const accessData = [
  { platform: "Adobe", link: "", username: "criativo.sjc@v4company.com", password: "OnCaX$2j6jw$&0^8" },
  { platform: "Adobe", link: "", username: "criativo1.sjc@v4company.com", password: "@Ana1cla2ra3" },
  { platform: "Adobe", link: "", username: "felipesamanbh@gmail.com", password: "CVAqlRl79sVU" },
  { platform: "Azure", link: "https://portal.azure.com/", username: "bi.bh@v4company.com", password: "V4@123!@#BiMs" },
  { platform: "Canva", link: "https://www.canva.com/", username: "criativo.bh@V4company.com", password: "Canva@V4Saman&Co" },
  { platform: "Clicksign", link: "https://app.clicksign.com/", username: "felipe@v4company.com", password: "V4s&co1300" },
  { platform: "Copybase", link: "https://app.baseworks.com.br/dashboard", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "Dashgoo", link: "https://appsocial.mlabs.io/", username: "criativo.bh@v4company.com", password: "47:&j{6P1$dl" },
  { platform: "Databox", link: "https://auth.databox.com/", username: "fabio.junior@v4company.com", password: "0F5tx$O3l98xoLhy" },
  { platform: "Digital Ocean", link: "https://cloud.digitalocean.com/", username: "ti.bh@v4company.com", password: "LuizV4@123!@#s" },
  { platform: "Envato", link: "https://elements.envato.com/", username: "criativo.bh@v4company.com", password: "Envato@V4Saman&Co" },
  { platform: "Figma", link: "https://www.figma.com/", username: "criativo.bh@v4company.com", password: "V4SAMAN0505" },
  { platform: "Figma Pro", link: "", username: "gilberto@v4company.com", password: "o@Agesn8Hh5kQt$3" },
  { platform: "Freepik", link: "https://id.freepikcompany.com/", username: "criativo.bh@v4company.com", password: "V4SA@criativobh@" },
  { platform: "Greatpages", link: "https://app.greatpages.com.br/", username: "gilbertomacieladm@gmail.com", password: "eUrri21Lxjcc" },
  { platform: "Hostinger", link: "", username: "ti.bh@v4company.com", password: "LuizV4@123!@#s" },
  { platform: "Intexfy", link: "", username: "lorena.bovo@v4company.com", password: "V4SA@lorena!" },
  { platform: "Memberkit", link: "https://v4-saman-assossiados.memberkit.com.br/", username: "ti.bh@v4company.com", password: "52vFykijdsPpNdX" },
  { platform: "Meu Vono", link: "https://meuvono.com.br/minha-conta", username: "priscila.saman@v4company.com", password: "PLvVcTMa72hd8@Q" },
  { platform: "Miro", link: "https://miro.com/pt/login/", username: "victor@v4company.com", password: "b39Qu3TWtqE*" },
  { platform: "Moskit", link: "https://app.moskitcrm.com/?/login", username: "igor.maia@v4company.com", password: "1q2w3e4r" },
  { platform: "Net2Phone", link: "", username: "felipe@v4company.com", password: "Dinfo4-nupbuz-texrev" },
  { platform: "Notion", link: "https://www.notion.so/", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "Omie", link: "https://portal.omie.com.br/", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "OpenAI", link: "https://platform.openai.com/", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "Pipefy", link: "https://app-auth.pipefy.com/", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "Pulses", link: "https://www.pulses.com.br/app/engage/", username: "analitico.bh5@v4company.com", password: "37312095Lh#" },
  { platform: "Rapid API", link: "https://rapidapi.com/hub", username: "ti.bh@v4company.com", password: "j%4Rj0u4c8RE" },
  { platform: "Stape.io", link: "https://app.stape.io/billing", username: "ti.bh@v4company.com", password: "@EntrarV4" },
  { platform: "TL:DV", link: "", username: "ti.bh@v4company.com", password: "V4ada24*10*75" },
  { platform: "Unbounce", link: "https://app.unbounce.com/", username: "ti.bh@v4company.com", password: "Unbounce@v4saman" },
  { platform: "Viax", link: "", username: "felipe@v4company.com", password: "ADm+fPQ25!Hc3@5" },
  { platform: "Eduzz", link: "https://accounts.eduzz.com/", username: "ti.bh@v4company.com", password: "V4Sa24*29*04" },
  { platform: "appwoot", link: "", username: "priscila.saman@v4company.com", password: "96b9831db4f509cd705ec1d79fbbd124" },
  { platform: "GitBook", link: "https://app.gitbook.com/", username: "ti.bh@v4company.com", password: "V4SA25*15*07@ti." }
];

async function run() {
  console.log("Limpar tabelas...");
  await query('TRUNCATE TABLE sa_tools_credentials');
  await query('TRUNCATE TABLE sa_financial_control');
  await query('TRUNCATE TABLE sa_access_base');

  console.log("Importing Tools...");
  for (const item of toolsData) {
    const encrypted = item.password ? encryptSecret(item.password) : null;
    await query(
      `INSERT INTO sa_tools_credentials (tool_name, tool_link, login, password_encrypted, auth_details, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [item.tool_name, item.tool_link || null, item.login || null, encrypted, item.auth_details || null, item.notes || null]
    );
  }

  console.log("Importing Financial...");
  for (const item of financialData) {
    await query(
      `INSERT INTO sa_financial_control (service_name, monthly_cost, plan_details, due_date, invoice_info, user_access) VALUES (?, ?, ?, ?, ?, ?)`,
      [item.service_name, item.monthly_cost, item.plan_details || null, item.due_date || null, item.invoice_info || null, item.user_access || null]
    );
  }

  console.log("Importing Access...");
  for (const item of accessData) {
    const encrypted = item.password ? encryptSecret(item.password) : null;
    await query(
      `INSERT INTO sa_access_base (platform, link, username, password_encrypted, notes) VALUES (?, ?, ?, ?, ?)`,
      [item.platform, item.link || null, item.username || null, encrypted, item.notes || null]
    );
  }

  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
