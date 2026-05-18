const { getSupabase } = require('./db');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured.' }) };
  }

  const sb    = getSupabase();
  const parts = event.path.replace('/.netlify/functions/students', '').split('/').filter(Boolean);

  try {
    // GET /students/location/pgType
    if (event.httpMethod === 'GET' && parts.length === 2) {
      const [location, pgType] = parts;
      const { data, error } = await sb
        .from('students')
        .select('*')
        .eq('location', decodeURIComponent(location))
        .eq('pg_type', pgType)
        .order('id', { ascending: false });

      if (error) throw error;

      const result = (data || []).map(s => {
        if (s.id_proof_data && s.id_proof_type) {
          s.id_proof_data = 'data:' + s.id_proof_type + ';base64,' + s.id_proof_data;
        }
        return s;
      });
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // DELETE /students/id
    if (event.httpMethod === 'DELETE' && parts.length === 1) {
      const { error } = await sb.from('students').delete().eq('id', +parts[0]);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // POST /students
    if (event.httpMethod === 'POST') {
      const contentType = event.headers['content-type'] || '';
      let body = {};
      let fileData = null, fileName = null, fileType = null;

      if (contentType.includes('application/json')) {
        body = JSON.parse(event.body || '{}');
      } else if (contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (boundary) {
          const raw = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('binary')
            : event.body;
          const parts2 = raw.split('--' + boundary);
          for (const part of parts2) {
            if (!part.includes('Content-Disposition')) continue;
            const [hdrs, ...rest] = part.split('\r\n\r\n');
            const value = rest.join('\r\n\r\n').replace(/\r\n$/, '');
            const nameMatch = hdrs.match(/name="([^"]+)"/);
            const fileMatch = hdrs.match(/filename="([^"]+)"/);
            if (!nameMatch) continue;
            if (fileMatch) {
              fileName = fileMatch[1];
              const ctMatch = hdrs.match(/Content-Type: (.+)/);
              fileType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream';
              fileData = Buffer.from(value, 'binary').toString('base64');
            } else {
              body[nameMatch[1]] = value;
            }
          }
        }
      }

      const { data, error } = await sb.from('students').insert([{
        location:          body.location || 'Tumkur',
        pg_type:           body.pg_type,
        name:              body.name,
        phone:             body.phone,
        address:           body.address,
        room_number:       body.room_number,
        joining_date:      body.joining_date,
        duration:          +body.duration,
        rent:              +body.rent,
        advance:           +(body.advance)          || 0,
        advance_return:    +(body.advance_return)    || 0,
        rent_paid:         +(body.rent_paid)         || 0,
        rent_remainder:    +(body.rent_remainder)    || 0,
        outstanding:       +(body.outstanding)       || 0,
        total_outstanding: +(body.total_outstanding) || 0,
        id_proof_name:     fileName || null,
        id_proof_type:     fileType || null,
        id_proof_data:     fileData || null,
        admitted_on:       new Date().toLocaleDateString('en-IN')
      }]).select('id').single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (e) {
    console.error('Students error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
