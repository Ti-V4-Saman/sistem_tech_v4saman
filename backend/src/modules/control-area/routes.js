import { Router } from 'express';
import { query } from '../../db/pool.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { encryptSecret, decryptSecret } from '../../utils/crypto.js';

export const controlAreaRoutes = Router();

controlAreaRoutes.use(authenticate);
controlAreaRoutes.use(requireRole('super-admin'));

// ==========================================
// Tools Credentials
// ==========================================
controlAreaRoutes.get('/tools', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM sa_tools_credentials ORDER BY tool_name ASC');
    const items = rows.map(row => {
      const item = { ...row };
      if (item.password_encrypted) {
        try {
          item.password = decryptSecret(item.password_encrypted);
        } catch {
          item.password = '*** error decrypting ***';
        }
        delete item.password_encrypted;
      }
      return item;
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.post('/tools', async (req, res, next) => {
  try {
    const { tool_name, tool_link, login, password, auth_details, notes } = req.body;
    let encrypted = null;
    if (password) {
      encrypted = encryptSecret(password);
    }
    
    const { insertId } = await query(
      `INSERT INTO sa_tools_credentials 
        (tool_name, tool_link, login, password_encrypted, auth_details, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tool_name, tool_link || null, login || null, encrypted, auth_details || null, notes || null]
    );
    
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.put('/tools/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tool_name, tool_link, login, password, auth_details, notes } = req.body;
    
    // Check if password changed, if so, re-encrypt
    let updatePasswordQuery = '';
    const params = [tool_name, tool_link || null, login || null, auth_details || null, notes || null];
    
    if (password !== undefined) {
      updatePasswordQuery = ', password_encrypted = ?';
      params.push(password ? encryptSecret(password) : null);
    }
    
    params.push(id);
    
    await query(
      `UPDATE sa_tools_credentials 
       SET tool_name = ?, tool_link = ?, login = ?, auth_details = ?, notes = ? ${updatePasswordQuery}
       WHERE id = ?`,
      params
    );
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.delete('/tools/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sa_tools_credentials WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Financial Control
// ==========================================
controlAreaRoutes.get('/financial', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM sa_financial_control ORDER BY service_name ASC');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.post('/financial', async (req, res, next) => {
  try {
    const { service_name, monthly_cost, plan_details, renewal_date, due_date, payment_method, invoice_info, user_access } = req.body;
    
    const { insertId } = await query(
      `INSERT INTO sa_financial_control 
        (service_name, monthly_cost, plan_details, renewal_date, due_date, payment_method, invoice_info, user_access) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [service_name, monthly_cost || null, plan_details || null, renewal_date || null, due_date || null, payment_method || null, invoice_info || null, user_access || null]
    );
    
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.put('/financial/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { service_name, monthly_cost, plan_details, renewal_date, due_date, payment_method, invoice_info, user_access } = req.body;
    
    await query(
      `UPDATE sa_financial_control 
       SET service_name = ?, monthly_cost = ?, plan_details = ?, renewal_date = ?, due_date = ?, payment_method = ?, invoice_info = ?, user_access = ?
       WHERE id = ?`,
      [service_name, monthly_cost || null, plan_details || null, renewal_date || null, due_date || null, payment_method || null, invoice_info || null, user_access || null, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.delete('/financial/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sa_financial_control WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Access Base
// ==========================================
controlAreaRoutes.get('/access', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM sa_access_base ORDER BY platform ASC');
    const items = rows.map(row => {
      const item = { ...row };
      if (item.password_encrypted) {
        try {
          item.password = decryptSecret(item.password_encrypted);
        } catch {
          item.password = '*** error decrypting ***';
        }
        delete item.password_encrypted;
      }
      return item;
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.post('/access', async (req, res, next) => {
  try {
    const { platform, link, username, password, notes } = req.body;
    let encrypted = null;
    if (password) {
      encrypted = encryptSecret(password);
    }
    
    const { insertId } = await query(
      `INSERT INTO sa_access_base 
        (platform, link, username, password_encrypted, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [platform, link || null, username || null, encrypted, notes || null]
    );
    
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.put('/access/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { platform, link, username, password, notes } = req.body;
    
    // Check if password changed, if so, re-encrypt
    let updatePasswordQuery = '';
    const params = [platform, link || null, username || null, notes || null];
    
    if (password !== undefined) {
      updatePasswordQuery = ', password_encrypted = ?';
      params.push(password ? encryptSecret(password) : null);
    }
    
    params.push(id);
    
    await query(
      `UPDATE sa_access_base 
       SET platform = ?, link = ?, username = ?, notes = ? ${updatePasswordQuery}
       WHERE id = ?`,
      params
    );
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

controlAreaRoutes.delete('/access/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sa_access_base WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
