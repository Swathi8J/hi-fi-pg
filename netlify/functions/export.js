const { getSupabase } = require('./db');
const ExcelJS = require('exceljs');

exports.handler = async (event) => {
  const parts = event.path.replace('/.netlify/functions/export', '').split('/').filter(Boolean);
  if (parts.length < 2) return { statusCode: 400, body: 'Missing location/pgType' };

  const [location, pgType] = parts;
  const sb = getSupabase();

  try {
    const { data: list, error } = await sb
      .from('students')
      .select('*')
      .eq('location', location)
      .eq('pg_type', pgType)
      .order('id', { ascending: true });

    if (error) throw error;

    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'Hi-Fi PG Management';
    const label = (pgType === 'girls' ? 'Girls' : 'Boys') + ' PG';
    const ws    = wb.addWorksheet(label);
    const color = pgType === 'girls' ? 'FF6B21A8' : 'FF1E40AF';

    ws.mergeCells('A1:N1');
    const t = ws.getCell('A1');
    t.value = 'HI-FI ' + location.toUpperCase() + ' - ' + (pgType === 'girls' ? 'GIRLS' : 'BOYS') + ' PG STUDENT RECORDS';
    t.font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 34;

    ws.mergeCells('A2:N2');
    const d2 = ws.getCell('A2');
    d2.value = 'Generated: ' + new Date().toLocaleString('en-IN');
    d2.font  = { italic: true, size: 10, color: { argb: 'FF555555' } };
    d2.alignment = { horizontal: 'center' };
    ws.getRow(2).height = 18;

    const hdrs = ['#','Name','Phone','Address','Room','Joining Date','Duration (mo)',
                  'Rent/mo (Rs)','Advance (Rs)','Adv.Return (Rs)','Rent Paid (Rs)',
                  'Rent Remainder (Rs)','Outstanding (Rs)','Total Due (Rs)'];
    const hr = ws.addRow(hdrs);
    hr.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
    });
    ws.getRow(3).height = 24;

    (list || []).forEach((s, i) => {
      const row = ws.addRow([
        i+1, s.name, s.phone, s.address, s.room_number,
        s.joining_date, +s.duration, +s.rent, +s.advance,
        +s.advance_return, +s.rent_paid, +s.rent_remainder,
        +s.outstanding, +s.total_outstanding
      ]);
      row.eachCell((cell, col) => {
        cell.fill      = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0 ? 'FFF0F4FF' : 'FFFFFFFF' } };
        cell.border    = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
        cell.alignment = { vertical:'middle', wrapText: col===4 };
        if (col >= 8) cell.numFmt = '#,##0.00';
        if (col === 14 && +s.total_outstanding > 0) cell.font = { bold:true, color:{ argb:'FFCC0000' } };
      });
      row.height = 18;
    });

    if (list && list.length) {
      ws.addRow([]);
      const sum = ws.addRow([
        '', 'TOTALS', '', '', '', '', '',
        list.reduce((a,s)=>a+(+s.rent),0),
        list.reduce((a,s)=>a+(+s.advance),0),
        list.reduce((a,s)=>a+(+s.advance_return),0),
        list.reduce((a,s)=>a+(+s.rent_paid),0),
        list.reduce((a,s)=>a+(+s.rent_remainder),0),
        list.reduce((a,s)=>a+(+s.outstanding),0),
        list.reduce((a,s)=>a+(+s.total_outstanding),0)
      ]);
      sum.eachCell((cell, col) => {
        cell.font   = { bold:true, size:11 };
        cell.fill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF3CD' } };
        cell.border = { top:{style:'medium'}, bottom:{style:'medium'} };
        if (col >= 8) cell.numFmt = '#,##0.00';
      });
    }

    ws.columns = [
      {width:5},{width:22},{width:14},{width:32},{width:8},
      {width:14},{width:13},{width:14},{width:14},{width:15},
      {width:13},{width:17},{width:17},{width:13}
    ];

    const buf = await wb.xlsx.writeBuffer();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=HiFi_${location}_${pgType}_PG.xlsx`
      },
      body: buf.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
