const { getSupabase } = require('./db');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured. Please contact admin.' }) };
    }

    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username and password required' }) };

    const sb = getSupabase();
    const { data, error } = await sb
      .from('admin_users')
      .select('id, username, full_name')
      .eq('username', username.trim())
      .eq('password', password)
      .maybeSingle();

    if (error) throw error;
    if (!data)
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Account not found. Please register first or check your username.' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, user: data }) };
  } catch (e) {
    console.error('Login error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error: ' + e.message }) };
  }
};
