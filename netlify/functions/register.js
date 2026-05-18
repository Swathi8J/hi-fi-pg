const { getSupabase } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { username, password, full_name } = JSON.parse(event.body);

    if (!username || !password || !full_name)
      return { statusCode: 400, body: JSON.stringify({ error: 'All fields are required' }) };
    if (username.trim().length < 3)
      return { statusCode: 400, body: JSON.stringify({ error: 'Username must be at least 3 characters' }) };
    if (password.length < 8)
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    if (!/[A-Z]/.test(password))
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must contain at least 1 capital letter' }) };
    if (!/[0-9]/.test(password))
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must contain at least 1 number' }) };
    if (/[^A-Za-z0-9]/.test(password))
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must not contain special characters' }) };

    const sb = getSupabase();

    // Check if username exists
    const { data: existing } = await sb
      .from('admin_users')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existing)
      return { statusCode: 409, body: JSON.stringify({ error: 'Username already taken. Choose another.' }) };

    const { error } = await sb
      .from('admin_users')
      .insert([{ username: username.trim(), password, full_name: full_name.trim() }]);

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Account created! You can now sign in.' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
