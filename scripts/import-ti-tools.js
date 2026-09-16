import { query } from '../backend/src/db/pool.js';
import { encryptSecret } from '../backend/src/utils/crypto.js';

const initialData = [
  { tool_name: "Active Campaign | Copygreen", tool_link: "https://copygreenl.activehosted.com/admin/", login: "copygreen@copygreen.com.br", password: "@ccess2511", auth_details: "Gmail", notes: "" },
  { tool_name: "Active Campaign | Cortel", tool_link: "https://spe-consorcio.activehosted.com/admin/", login: "guto.quiros@cortelsp.com.br", password: "V4Company2024$", auth_details: "", notes: "" },
  { tool_name: "API QuePasa", tool_link: "https://api.v4saman.com/", login: "chat@v4saman.com", password: "V4sa@1711", auth_details: "Azure", notes: "" },
  { tool_name: "Azure / BI BH", tool_link: "", login: "bi.bh@v4company.com", password: "V4@123!@#BiMs", auth_details: "Celular Giovani, e-mail Giovani, Authenticator Luiz", notes: "" },
  { tool_name: "Banco CRM V4", tool_link: "", login: "v4chat", password: "Rizek2606*v4", auth_details: "IP: 157.245.127.80", notes: "database: nomedainstancia\nBD - V4BH_DADOS\nServidor - v4seaserverusa02.database.windows.net" },
  { tool_name: "Bubble.io", tool_link: "https://bubble.io/login", login: "ti.bh@v4company.com", password: "V4ada24*10*76", auth_details: "Gmail", notes: "" },
  { tool_name: "CloudFlare | Fabrick", tool_link: "", login: "victor.gusmao@v4company.com", password: "Lopes100", auth_details: "", notes: "" }
];

async function run() {
  console.log("Importing TI Tools...");
  for (const item of initialData) {
    const encrypted = item.password ? encryptSecret(item.password) : null;
    await query(
      `INSERT INTO sa_tools_credentials 
        (tool_name, tool_link, login, password_encrypted, auth_details, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.tool_name, item.tool_link || null, item.login || null, encrypted, item.auth_details || null, item.notes || null]
    );
    console.log(`Imported: ${item.tool_name}`);
  }
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
