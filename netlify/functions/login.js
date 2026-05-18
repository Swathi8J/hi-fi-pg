const { getSupabase } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { username, password } = JSON.parse(event.body);
    if (!username || !password)
      return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required' }) };

    const sb = getSupabase();
    const { data, error } = await sb
      .from('admin_users')
      .select('id, username, full_name')
      .eq('username', username.trim())
      .eq('password', password)
      .single();

    if (error || !data)
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid username or password' }) };

    return { statusCode: 200, body: JSON.stringify({ success: true, user: data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
