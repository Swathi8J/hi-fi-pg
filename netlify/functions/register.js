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

    const { username, password, full_name } = JSON.parse(event.body || '{}');

    if (!username || !password || !full_name)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'All fields are required' }) };
    if (username.trim().length < 3)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username must be at least 3 characters' }) };
    if (password.length < 8)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    if (!/[A-Z]/.test(password))
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must contain at least 1 capital letter' }) };
    if (!/[0-9]/.test(password))
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must contain at least 1 number' }) };
    if (/[^A-Za-z0-9]/.test(password))
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must not contain special characters' }) };

    const sb = getSupabase();

    const { data: existing } = await sb
      .from('admin_users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existing)
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Username already taken. Choose another.' }) };

    const { error } = await sb
      .from('admin_users')
      .insert([{ username: username.trim(), password, full_name: full_name.trim() }]);

    if (error) throw error;

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Account created! You can now sign in.' }) };
  } catch (e) {
    console.error('Register error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error: ' + e.message }) };
  }
};
