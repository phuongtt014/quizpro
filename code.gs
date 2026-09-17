// =================================================================
// HỆ THỐNG QUẢN LÝ ĐÀO TẠO HCNS - Code.gs v3
// =================================================================

function doGet(e) {
  try {
    var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : '';
    var id   = (e && e.parameter && e.parameter.id)   ? e.parameter.id   : '';
    if (page === 'checkin') {
      var tmpl = HtmlService.createTemplateFromFile('Checkin');
      tmpl.courseId = id;
      return tmpl.evaluate().setTitle('Điểm danh - HCNS').addMetaTag('viewport','width=device-width,initial-scale=1');
    }
    if (page === 'register') {
      var tmpl2 = HtmlService.createTemplateFromFile('Register');
      tmpl2.maForm = id;
      return tmpl2.evaluate().setTitle('Đăng ký tham gia - HCNS').addMetaTag('viewport','width=device-width,initial-scale=1');
    }
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Hệ thống Quản lý Đào tạo HCNS')
      .addMetaTag('viewport','width=device-width,initial-scale=1')
      ;
  } catch(err) {
    return HtmlService.createHtmlOutput('<h3>Lỗi: ' + err.message + '</h3>');
  }
}

function getSS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Không tìm thấy Google Sheet liên kết!');
  return ss;
}

function getSheet_(names, defName, defHeaders) {
  var ss = getSS();
  for (var i = 0; i < names.length; i++) { var s = ss.getSheetByName(names[i]); if (s) return s; }
  var ns = ss.insertSheet(defName);
  if (defHeaders && defHeaders.length) {
    ns.appendRow(defHeaders);
    ns.getRange(1,1,1,defHeaders.length).setBackground('#1a3a5c').setFontColor('#fff').setFontWeight('bold').setHorizontalAlignment('center');
    ns.setFrozenRows(1);
  }
  return ns;
}

function shLich()    { return getSheet_(['LichDaoTao','Lịch đào tạo','LichHoc'],    'LichDaoTao',   ['ID','Tên Khóa Học','Từ Ngày','Đến Ngày','Bắt Đầu','Kết Thúc','Danh Sách Mời','Link QR']); }
function shNS()      { return getSheet_(['NhanVien','NhanSu','Nhân sự','Nhân viên'], 'NhanVien',     ['MSNV','Họ tên','Đơn vị','Email','Mật khẩu','Phân quyền','Hiệu lực','Ghi chú']); }
function shTV()      { return getSheet_(['Thư viện','ThuVien','Tài liệu'],           'Thư viện',     ['Mã KH','Tên khóa học','Nội dung','Link tài liệu','Ngày cập nhật']); }
function shDiem()    { return getSheet_(['LichSuDiem','BangDiem','Điểm'],            'LichSuDiem',   ['Ngày tạo','MSNV','Họ tên','Khóa học','Phân loại','Số điểm','Lý do']); }
function shCfg()     { return getSheet_(['ThietLap','Thiết lập','CauHinh'],          'ThietLap',     ['Tên Cấu Hình','Giá Trị']); }
function shDD()      { return getSheet_(['DiemDanh','Điểm danh'],                    'DiemDanh',     ['Thời gian','Mã Khóa Học','Email','Trạng thái']); }
function shMauThu()  { return getSheet_(['MauThu','Mẫu thư'],                          'MauThu',       ['Mã mẫu','Tên mẫu','Chủ đề','Nội dung','Link đính kèm','Ngày cập nhật']); }
function shEmail()   { return getSheet_(['LichSuEmail','Lịch sử Email'],             'LichSuEmail',  ['Thời gian','Mã KH','Khóa học','Loại Email','Mô tả','Nội dung','Người nhận']); }
function shPQ()      { return getSheet_(['PhanQuyen','Phân quyền'],                  'PhanQuyen',    ['Vai trò','Tab','Xem','Sửa','Xóa']); }

function fmt_(v,f) {
  if (!v) return '';
  try { var d=(v instanceof Date)?v:new Date(v); if(isNaN(d.getTime())) return String(v); return Utilities.formatDate(d,Session.getScriptTimeZone(),f||'dd/MM/yyyy'); } catch(e) { return String(v); }
}

// ==========================================
// 1. THIẾT LẬP
// ==========================================
function getSettings() {
  try {
    var s = shCfg(), data = s.getDataRange().getValues();
    if (data.length <= 1) {
      var defs = [
        ['Đơn vị phòng','Phòng HCNS, Phòng Kế toán, Phòng Kinh doanh, Phòng Marketing, Phòng IT, Ban Giám đốc'],
        ['Phân quyền','Khách, Nhân viên, Trưởng phòng, Admin'],
        ['Hiệu lực','Đang làm việc, Đã nghỉ việc, Tạm hoãn'],
        ['Phân loại điểm','Điểm chuyên cần, Điểm kiểm tra, Điểm đóng góp, Điểm thưởng']
      ];
      defs.forEach(function(r){ s.appendRow(r); });
      data = s.getDataRange().getValues();
    }
    var out = {};
    for (var i = 1; i < data.length; i++) {
      var k = String(data[i][0]||'').trim();
      if (k) out[k] = String(data[i][1]||'').split(',').map(function(v){return v.trim();}).filter(Boolean);
    }
    return out;
  } catch(e) { return {}; }
}

function updateSetting(key, value) {
  try {
    var s = shCfg(), data = s.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(key).trim()) { s.getRange(i+1,2).setValue(value); return 'Đã cập nhật: ' + key; }
    }
    s.appendRow([key, value]); return 'Đã thêm: ' + key;
  } catch(e) { return 'Lỗi: ' + e.message; }
}

// ==========================================
// 2. PHÂN QUYỀN
// ==========================================
var TABS_     = ['dashboard','employees','courses','library','scores','settings'];
var ROLES_    = ['Khách','Nhân viên','Trưởng phòng','Admin'];
var DEF_PERM_ = {
  'Khách':        { dashboard:{x:1,s:0,d:0}, employees:{x:0,s:0,d:0}, courses:{x:0,s:0,d:0}, library:{x:1,s:0,d:0}, scores:{x:0,s:0,d:0}, settings:{x:0,s:0,d:0} },
  'Nhân viên':    { dashboard:{x:1,s:0,d:0}, employees:{x:1,s:0,d:0}, courses:{x:1,s:0,d:0}, library:{x:1,s:0,d:0}, scores:{x:1,s:0,d:0}, settings:{x:0,s:0,d:0} },
  'Trưởng phòng': { dashboard:{x:1,s:1,d:0}, employees:{x:1,s:1,d:0}, courses:{x:1,s:1,d:0}, library:{x:1,s:1,d:0}, scores:{x:1,s:1,d:0}, settings:{x:1,s:0,d:0} },
  'Admin':        { dashboard:{x:1,s:1,d:1}, employees:{x:1,s:1,d:1}, courses:{x:1,s:1,d:1}, library:{x:1,s:1,d:1}, scores:{x:1,s:1,d:1}, settings:{x:1,s:1,d:1} }
};

function getPhanQuyen() {
  try {
    var s = shPQ(), data = s.getDataRange().getValues();
    if (data.length <= 1) {
      // Ghi mặc định vào sheet
      ROLES_.forEach(function(role) {
        TABS_.forEach(function(tab) {
          var p = DEF_PERM_[role][tab]||{x:0,s:0,d:0};
          s.appendRow([role, tab, p.x?'TRUE':'FALSE', p.s?'TRUE':'FALSE', p.d?'TRUE':'FALSE']);
        });
      });
      data = s.getDataRange().getValues();
    }
    var out = {};
    for (var i = 1; i < data.length; i++) {
      var role = String(data[i][0]||'').trim(), tab = String(data[i][1]||'').trim();
      if (!role || !tab) continue;
      if (!out[role]) out[role] = {};
      out[role][tab] = {
        x: data[i][2]===true||data[i][2]==='TRUE'||data[i][2]===1,
        s: data[i][3]===true||data[i][3]==='TRUE'||data[i][3]===1,
        d: data[i][4]===true||data[i][4]==='TRUE'||data[i][4]===1
      };
    }
    return out;
  } catch(e) { Logger.log('Lỗi getPhanQuyen: '+e.message); return DEF_PERM_; }
}

function savePhanQuyen(matrix) {
  try {
    var s = shPQ(), last = s.getLastRow();
    if (last > 1) s.deleteRows(2, last-1);
    matrix.forEach(function(r){ s.appendRow([r.role, r.tab, r.x, r.s, r.d]); });
    return 'Đã lưu phân quyền thành công!';
  } catch(e) { return 'Lỗi: ' + e.message; }
}

// ==========================================
// 3. NHÂN SỰ
// ==========================================
function getEmployees() {
  try {
    var data = shNS().getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1).filter(function(r){ return r.join('').trim(); }).map(function(r,i){
      var msnv = String(r[0]||'').trim() || ('NV'+(1001+i));
      return { msnv:msnv, hoTen:String(r[1]||'Chưa nhập'), donVi:String(r[2]||''), email:String(r[3]||''), matKhau:String(r[4]||'123456'), phanQuyen:String(r[5]||'Nhân viên'), hieuLuc:String(r[6]||'Đang làm việc'), ghiChu:String(r[7]||'') };
    });
  } catch(e) { return []; }
}

function saveEmployee(d) {
  try {
    var s = shNS(), data = s.getDataRange().getValues(), row = -1;
    for (var i = 1; i < data.length; i++) { if (String(data[i][0]).trim()===String(d.msnv).trim()) { row=i+1; break; } }
    var rowData = [d.msnv,d.hoTen,d.donVi,d.email,d.matKhau,d.phanQuyen,d.hieuLuc,d.ghiChu];
    if (row>-1) { s.getRange(row,1,1,8).setValues([rowData]); return 'Cập nhật '+d.msnv+' thành công!'; }
    s.appendRow(rowData); return 'Thêm mới '+d.msnv+' thành công!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

function xoaNhanVien(msnv) {
  try {
    var s = shNS(), data = s.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim()===String(msnv).trim()) { s.deleteRow(i+1); return 'Đã xóa '+msnv; }
    }
    return 'Không tìm thấy ' + msnv;
  } catch(e) { return 'Lỗi: '+e.message; }
}

// ==========================================
// 4. LỊCH ĐÀO TẠO
// ==========================================
function getCourses() {
  try {
    var data = shLich().getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1).filter(function(r){ return r.join('').trim(); }).map(function(r,i){
      var id=String(r[0]||'').trim(), ten=String(r[1]||'').trim();
      if (!id&&!ten) return null;
      if (!id) id='KH-'+(100+i); if (!ten) { ten=id; id='KH-'+(100+i); }
      return { id:id, ten:ten, ngayStr:fmt_(r[2],'dd/MM/yyyy')||'Chưa xếp ngày', ngayRaw:fmt_(r[2],'yyyy-MM-dd'), batDau:String(r[4]||''), ketThuc:String(r[5]||''), emails:String(r[6]||''), qr:String(r[7]||'') };
    }).filter(Boolean);
  } catch(e) { return []; }
}

function taoLichDaoTao(d) {
  try {
    var s = shLich();
    var id = 'LD-'+Math.floor(1000+Math.random()*9000);
    var url = ScriptApp.getService().getUrl();
    var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+encodeURIComponent(url+'?page=checkin&id='+id);
    s.appendRow([id,d.ten,d.ngay,d.ngayKetThuc||d.ngay,d.batDau,d.ketThuc,d.emails,qr]);

    // Google Calendar
    try {
      var cal=CalendarApp.getDefaultCalendar();
      var sD=d.ngay.split('-'), sT=(d.batDau||'08:00').split(':');
      var eD=(d.ngayKetThuc||d.ngay).split('-'), eT=(d.ketThuc||'17:00').split(':');
      cal.createEvent('[ĐÀO TẠO] '+d.ten,
        new Date(sD[0],sD[1]-1,sD[2],sT[0],sT[1]),
        new Date(eD[0],eD[1]-1,eD[2],eT[0],eT[1]),
        {description:d.customMessage, guests:d.emails, sendInvites:true});
    } catch(ce){}

    var vEmails=(d.emails||'').split(',').map(function(e){return e.trim();}).filter(Boolean);
    if (!vEmails.length) return 'Tạo khóa đào tạo thành công!';

    // Định dạng ngày hiển thị
    var ngayBD = d.ngay.split('-').reverse().join('/');
    var ngayKT = (d.ngayKetThuc||d.ngay).split('-').reverse().join('/');
    var ngayDisplay = ngayBD === ngayKT ? ngayBD : ngayBD + ' – ' + ngayKT;
    var thoiGian = (d.batDau||'') + (d.ketThuc ? ' – '+d.ketThuc : '');

    // Fix xuống dòng trong nội dung
    var bodyHtml = (d.customMessage||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .split(String.fromCharCode(10)).join('<br>');

    // Xây dựng card link đính kèm (nếu có)
    var linkSection = '';
    if (d.links && d.links.trim()) {
      var lArr = d.links.split(String.fromCharCode(10)).filter(function(l){return l.trim();});
      var lCards = lArr.map(function(l){
        var lc = l.trim();
        var u = lc.indexOf('http')===0 ? lc : 'https://'+lc;
        var lu = u.toLowerCase();
        var icon='🔗', color='#16a34a', bg='#f0fdf4', type='Liên kết';
        if(lu.indexOf('docs.google.com/document')>-1||lu.indexOf('/document')>-1){icon='📝';color='#1d4ed8';bg='#dbeafe';type='Google Docs';}
        else if(lu.indexOf('spreadsheet')>-1){icon='📊';color='#15803d';bg='#dcfce7';type='Google Sheets';}
        else if(lu.indexOf('presentation')>-1){icon='📑';color='#d97706';bg='#fef3c7';type='Google Slides';}
        else if(lu.indexOf('forms')>-1){icon='📋';color='#7c3aed';bg='#f3e8ff';type='Google Forms';}
        else if(lu.indexOf('drive.google.com')>-1){icon='📁';color='#0ea5e9';bg='#e0f2fe';type='Google Drive';}
        else if(lu.indexOf('youtube')>-1||lu.indexOf('youtu.be')>-1){icon='▶';color='#dc2626';bg='#fee2e2';type='YouTube';}
        else if(lu.match(/\.pdf($|\?)/)){icon='📕';color='#dc2626';bg='#fee2e2';type='PDF';}
        else if(lu.match(/\.(doc|docx)($|\?)/)){icon='📝';color='#1d4ed8';bg='#dbeafe';type='Word';}
        else if(lu.match(/\.(xls|xlsx)($|\?)/)){icon='📊';color='#15803d';bg='#dcfce7';type='Excel';}
        var lbl = lc.length > 60 ? lc.substring(0,57)+'...' : lc;
        if(lu.indexOf('docs.google.com/document')>-1) lbl='Google Docs';
        else if(lu.indexOf('spreadsheet')>-1) lbl='Google Sheets';
        else if(lu.indexOf('presentation')>-1) lbl='Google Slides';
        else if(lu.indexOf('drive.google.com')>-1) lbl='Google Drive';
        else if(lu.indexOf('youtube')>-1||lu.indexOf('youtu.be')>-1) lbl='YouTube Video';
        return '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">'
          +'<tr><td style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 14px">'
          +'<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
          +'<td style="width:36px;vertical-align:middle"><div style="width:32px;height:32px;background:'+bg+';border-radius:7px;text-align:center;line-height:32px;font-size:16px">'+icon+'</div></td>'
          +'<td style="padding-left:10px;vertical-align:middle">'
          +'<a href="'+u+'" target="_blank" style="font-size:13px;font-weight:700;color:'+color+';text-decoration:none">'+lbl+'</a>'
          +'<div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-top:2px">'+type+'</div>'
          +'</td>'
          +'<td style="width:70px;text-align:right;vertical-align:middle">'
          +'<a href="'+u+'" target="_blank" style="background:'+color+';color:#fff;padding:5px 12px;border-radius:5px;font-size:11px;font-weight:700;text-decoration:none">Mở →</a>'
          +'</td></tr></table></td></tr></table>';
      }).join('');
      linkSection = '<div style="padding:0 28px 20px">'
        +'<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">📎 TÀI LIỆU ĐÍNH KÈM</div>'
        + lCards + '</div>';
    }

    // Chủ đề email
    var subject = (d.subject && d.subject.trim()) ? d.subject.trim() : '[MỜI ĐÀO TẠO] ' + d.ten;

    // HTML email chuyên nghiệp
    var hb = '<div style="font-family:Arial,sans-serif;background:#f0f4f8;padding:24px 16px;color:#334155">'
      +'<div style="max-width:620px;margin:0 auto">'
      // Header brand
      +'<div style="text-align:center;margin-bottom:16px">'
      +'<div style="display:inline-block;background:#1a3a5c;padding:8px 20px;border-radius:8px">'
      +'<span style="color:#c9a84c;font-weight:900;font-size:15px">HCNS</span>'
      +'<span style="color:rgba(255,255,255,.7);font-size:12px;margin-left:6px">EduManager</span>'
      +'</div></div>'
      // Card chính
      +'<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(26,58,92,.1)">'
      // Top banner
      +'<div style="background:linear-gradient(135deg,#1a3a5c 0%,#234d7a 100%);padding:28px 28px 24px;position:relative">'
      +'<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,.6);text-transform:uppercase;margin-bottom:8px">THƯ MỜI THAM GIA ĐÀO TẠO</div>'
      +'<h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;line-height:1.3">'+d.ten+'</h1>'
      +'</div>'
      // Info bar
      +'<div style="display:flex;background:#f8fafc;border-bottom:1px solid #e2e8f0">'
      +(ngayDisplay ? '<div style="flex:1;padding:14px 18px;border-right:1px solid #e2e8f0"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Ngày</div><div style="font-size:14px;font-weight:800;color:#1a3a5c">'+ngayDisplay+'</div></div>' : '')
      +(thoiGian ? '<div style="flex:1;padding:14px 18px;border-right:1px solid #e2e8f0"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Thời gian</div><div style="font-size:14px;font-weight:800;color:#1a3a5c">'+thoiGian+'</div></div>' : '')
      +(d.diaDiem ? '<div style="flex:1;padding:14px 18px"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Địa điểm</div><div style="font-size:14px;font-weight:800;color:#1a3a5c">'+d.diaDiem+'</div></div>' : '')
      +'</div>'
      // Nội dung
      +'<div style="padding:24px 28px 20px">'
      +'<div style="font-size:14px;line-height:1.8;color:#334155">'+bodyHtml+'</div>'
      +'</div>'
      // Link section
      + linkSection
      // Footer trong card
      +'<div style="background:#1a3a5c;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">'
      +'<div><div style="font-size:12px;font-weight:700;color:#c9a84c">PHÒNG HÀNH CHÍNH – NHÂN SỰ</div>'
      +'<div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">HCNS EduManager</div></div>'
      +'<div style="font-size:11px;color:rgba(255,255,255,.4)">Email tự động – vui lòng không phản hồi</div>'
      +'</div>'
      +'</div>'
      +'</div></div>';

    vEmails.forEach(function(e){ try{MailApp.sendEmail({to:e, subject:subject, htmlBody:hb});}catch(me){} });
    shEmail().appendRow([new Date(),id,d.ten,'Thư Mời','Gửi '+vEmails.length+' người',hb,d.emails]);
    return 'Tạo khóa đào tạo thành công!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

function xoaKhoaHoc(id) {
  try {
    var s=shLich(), data=s.getDataRange().getValues();
    for (var i=1;i<data.length;i++) { if (String(data[i][0])===String(id)) { s.deleteRow(i+1); return 'Đã xóa khóa học!'; } }
    return 'Không tìm thấy ' + id;
  } catch(e) { return 'Lỗi: '+e.message; }
}

function capNhatEmailKhoaHoc(id, emailsMoi, guiMail) {
  try {
    var s=shLich(), data=s.getDataRange().getValues(), row=-1, name='';
    for (var i=1;i<data.length;i++) { if (String(data[i][0])===String(id)) { row=i+1; name=String(data[i][1]||''); break; } }
    if (row===-1) return 'Không tìm thấy khóa học!';
    var oldA=String(data[row-1][6]||'').split(',').map(function(e){return e.trim().toLowerCase();}).filter(Boolean);
    var newA=String(emailsMoi||'').split(',').map(function(e){return e.trim().toLowerCase();}).filter(Boolean);
    var merged=[]; oldA.concat(newA).forEach(function(e){if(merged.indexOf(e)===-1)merged.push(e);});
    s.getRange(row,7).setValue(merged.join(', '));
    if (guiMail) {
      var added=newA.filter(function(e){return oldA.indexOf(e)===-1;});
      if (added.length) {
        var hb='<div style="font-family:Arial;padding:20px"><h3 style="color:#1a3a5c">BỔ SUNG THƯ MỜI</h3><p>Bạn được thêm vào: <b>'+name+'</b></p><p style="font-size:12px;color:#666">Phòng HCNS</p></div>';
        added.forEach(function(e){ try{MailApp.sendEmail({to:e,subject:'[MỜI BỔ SUNG] '+name,htmlBody:hb});}catch(me){} });
        shEmail().appendRow([new Date(),id,name,'Bổ Sung Email','Thêm '+added.length+' người',hb,added.join(', ')]);
      }
    }
    return 'Cập nhật email thành công!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

function checkInThuCong(maKhoa, email, trangThai) {
  try {
    var e=String(email||'').toLowerCase().trim(); if(!e) return 'Vui lòng nhập Email/MSNV!';
    shDD().appendRow([new Date(),maKhoa,e,trangThai||'Có mặt']); return 'Ghi nhận điểm danh cho '+e;
  } catch(e) { return 'Lỗi: '+e.message; }
}

function getAttendanceByCourse(maKhoa) {
  try {
    var data=shDD().getDataRange().getValues(), list=[];
    for (var i=1;i<data.length;i++) { if (String(data[i][1])===String(maKhoa)) list.push({thoiGian:fmt_(data[i][0],'dd/MM/yyyy HH:mm:ss'),email:String(data[i][2]||''),trangThai:String(data[i][3]||'Có mặt')}); }
    return list.reverse();
  } catch(e) { return []; }
}

// ==========================================
// 5. THƯ VIỆN — CRUD ĐẦY ĐỦ
// ==========================================
function getAllLibrary() {
  try {
    var data=shTV().getDataRange().getValues(); if(data.length<=1) return [];
    return data.slice(1).filter(function(r){return r.join('').trim();}).map(function(r,i){
      return { rowIndex:i+2, courseId:String(r[0]||''), courseName:String(r[1]||''), body:String(r[2]||''), links:String(r[3]||''), lastUpdate:fmt_(r[4],'dd/MM/yyyy HH:mm') };
    });
  } catch(e) { return []; }
}

// Nhận diện loại tài liệu và xây dựng card link cho email
function getDocMeta_(url) {
  var u = (url||'').toLowerCase();
  if (u.indexOf('docs.google.com/document') > -1 || u.indexOf('drive.google.com') > -1 && u.indexOf('/document') > -1) return {icon:'📝',color:'#1d4ed8',bg:'#dbeafe',type:'Google Docs'};
  if (u.indexOf('docs.google.com/spreadsheets') > -1 || u.indexOf('spreadsheet') > -1) return {icon:'📊',color:'#15803d',bg:'#dcfce7',type:'Google Sheets'};
  if (u.indexOf('docs.google.com/presentation') > -1 || u.indexOf('presentation') > -1) return {icon:'📑',color:'#d97706',bg:'#fef3c7',type:'Google Slides'};
  if (u.indexOf('docs.google.com/forms') > -1) return {icon:'📋',color:'#7c3aed',bg:'#f3e8ff',type:'Google Forms'};
  if (u.indexOf('drive.google.com') > -1) return {icon:'📁',color:'#0ea5e9',bg:'#e0f2fe',type:'Google Drive'};
  if (u.indexOf('youtube.com') > -1 || u.indexOf('youtu.be') > -1) return {icon:'▶',color:'#dc2626',bg:'#fee2e2',type:'YouTube'};
  if (u.match(/\.pdf($|\?)/)) return {icon:'📕',color:'#dc2626',bg:'#fee2e2',type:'PDF'};
  if (u.match(/\.(doc|docx)($|\?)/)) return {icon:'📝',color:'#1d4ed8',bg:'#dbeafe',type:'Word'};
  if (u.match(/\.(xls|xlsx|csv)($|\?)/)) return {icon:'📊',color:'#15803d',bg:'#dcfce7',type:'Excel'};
  if (u.match(/\.(ppt|pptx)($|\?)/)) return {icon:'📑',color:'#d97706',bg:'#fef3c7',type:'PowerPoint'};
  if (u.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/)) return {icon:'🖼',color:'#7c3aed',bg:'#f3e8ff',type:'Hình ảnh'};
  if (u.match(/\.(zip|rar|7z)($|\?)/)) return {icon:'📦',color:'#475569',bg:'#f1f5f9',type:'File nén'};
  if (u.match(/\.(mp4|mov|avi)($|\?)/)) return {icon:'🎬',color:'#dc2626',bg:'#fee2e2',type:'Video'};
  return {icon:'🔗',color:'#16a34a',bg:'#f0fdf4',type:'Liên kết'};
}

function getShortLabel_(url) {
  var u = url || '';
  var maps = [
    {re:/docs\.google\.com\/document/,   lbl:'Google Docs'},
    {re:/docs\.google\.com\/spreadsheets/,lbl:'Google Sheets'},
    {re:/docs\.google\.com\/presentation/,lbl:'Google Slides'},
    {re:/docs\.google\.com\/forms/,       lbl:'Google Forms'},
    {re:/drive\.google\.com\/file/,       lbl:'Google Drive File'},
    {re:/drive\.google\.com\/drive/,      lbl:'Google Drive Folder'},
    {re:/youtube\.com\/watch/,            lbl:'YouTube Video'},
    {re:/youtu\.be\//,                    lbl:'YouTube Video'},
  ];
  for (var m=0;m<maps.length;m++) { if (maps[m].re.test(u)) return maps[m].lbl; }
  var clean = u.replace(/^https?:\/\//,'').replace(/^www\./,'');
  return clean.length > 60 ? clean.substring(0,57)+'...' : clean;
}

// Dựng HTML email "Tài liệu đào tạo" dùng chung cho gửi tự động và gửi chọn lọc
function buildTaiLieuEmailHtml_(courseName, body, links) {
  var bodyHtml = String(body||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');

  var lArr = String(links||'').split(String.fromCharCode(10)).filter(function(l){ return l.trim(); });
  var lHtml = lArr.map(function(l){
    var lClean = l.trim();
    var u = lClean.indexOf('http')===0 ? lClean : 'https://'+lClean;
    var meta = getDocMeta_(u);
    var label = getShortLabel_(u);
    // Card dạng table (tương thích email client)
    return '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px">'
      +'<tr>'
      +'<td style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px">'
      +'<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
      // Icon box
      +'<td style="width:40px;vertical-align:middle">'
      +'<div style="width:36px;height:36px;background:'+meta.bg+';border-radius:8px;text-align:center;line-height:36px;font-size:18px">'+meta.icon+'</div>'
      +'</td>'
      // Label + type
      +'<td style="padding-left:12px;vertical-align:middle">'
      +'<a href="'+u+'" target="_blank" style="display:block;font-size:14px;font-weight:700;color:'+meta.color+';text-decoration:none;margin-bottom:3px">'+label+'</a>'
      +'<span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px">'+meta.type+'</span>'
      +'</td>'
      // Arrow button
      +'<td style="width:80px;text-align:right;vertical-align:middle">'
      +'<a href="'+u+'" target="_blank" style="display:inline-block;background:'+meta.color+';color:#fff;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">Mở →</a>'
      +'</td>'
      +'</tr></table>'
      +'</td></tr></table>';
  }).join('');

  return '<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:20px;color:#334155">'
    +'<div style="max-width:650px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">'
    // Header
    +'<div style="background:#1a3a5c;color:#fff;padding:22px 28px">'
    +'<div style="font-size:11px;font-weight:700;letter-spacing:1.2px;opacity:.7;margin-bottom:4px">TÀI LIỆU ĐÀO TẠO</div>'
    +'<h2 style="margin:0;font-size:18px;font-weight:800">'+courseName.toUpperCase()+'</h2>'
    +'</div>'
    // Body
    +'<div style="padding:24px 28px">'
    +'<div style="font-size:14px;line-height:1.8;color:#334155;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0">'+bodyHtml+'</div>'
    // Section tài liệu
    +'<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">📎 DANH SÁCH TÀI LIỆU</div>'
    + lHtml
    +'</div>'
    // Footer
    +'<div style="background:#f8fafc;padding:14px 28px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0">'
    +'<strong style="color:#1a3a5c">PHÒNG HÀNH CHÍNH – NHÂN SỰ</strong>'
    +'</div></div></div>';
}

// Lưu tài liệu + gửi email (chỉ gửi cho người CÓ MẶT trong buổi học)
function guiTaiLieu(courseId, courseName, links, body) {
  try {
    // 1. Lưu vào thư viện
    var s=shTV(), data=s.getDataRange().getValues(), row=-1;
    for (var i=1;i<data.length;i++) { if (String(data[i][0])===String(courseId)||String(data[i][1])===String(courseName)) { row=i+1; break; } }
    var ts=fmt_(new Date(),'dd/MM/yyyy HH:mm:ss');
    if (row>-1) s.getRange(row,3,1,3).setValues([[body,links,ts]]); else s.appendRow([courseId,courseName,body,links,ts]);

    // 2. Lấy danh sách NGƯỜI CÓ MẶT từ sheet DiemDanh
    var ddData=shDD().getDataRange().getValues();
    var presentEmails=[];
    for (var k=1;k<ddData.length;k++) {
      if (String(ddData[k][1]).trim()!==String(courseId).trim()) continue;
      var ts2=String(ddData[k][3]||'Có mặt');
      // Chỉ lấy Có mặt và Đi muộn, BỎ các trạng thái Vắng mặt
      if (ts2.indexOf('Vắng')===-1) {
        var em=String(ddData[k][2]||'').toLowerCase().trim();
        if (em && presentEmails.indexOf(em)===-1) presentEmails.push(em);
      }
    }

    // 3. Nếu chưa có điểm danh nào → fallback dùng danh sách mời
    var emailList='';
    var nguon='';
    if (presentEmails.length>0) {
      emailList = presentEmails.join(',');
      nguon = 'Gửi ' + presentEmails.length + ' người có mặt';
    } else {
      // Không có điểm danh → lấy toàn bộ danh sách mời
      var dataL=shLich().getDataRange().getValues();
      for (var j=1;j<dataL.length;j++) {
        if (String(dataL[j][0])===String(courseId)||String(dataL[j][1])===String(courseName)) {
          emailList=String(dataL[j][6]||''); break;
        }
      }
      nguon = 'Gửi danh sách mời (chưa có điểm danh)';
    }

    if (!emailList.trim()) return 'Đã lưu vào Thư viện. (Chưa có người có mặt hoặc email trong khóa học).';

    var hb = buildTaiLieuEmailHtml_(courseName, body, links);
    MailApp.sendEmail({to:emailList, subject:'[TÀI LIỆU] '+courseName.toUpperCase(), htmlBody:hb});
    shEmail().appendRow([new Date(),courseId,courseName,'Gửi Tài Liệu',nguon,hb,emailList]);
    return 'Đã lưu và gửi Email thành công! (' + nguon + ')';
  } catch(e) { return 'Lỗi: '+e.message; }
}

// Gửi tài liệu ĐÃ LƯU trong Thư viện cho một danh sách email tự chọn (không cần gửi hết người tham gia)
function guiTaiLieuChonEmail(rowIndex, emailsStr) {
  try {
    var row = shTV().getRange(rowIndex,1,1,4).getValues()[0];
    var courseId = String(row[0]||''), courseName = String(row[1]||''), body = String(row[2]||''), links = String(row[3]||'');
    if (!courseName) return 'Không tìm thấy tài liệu!';

    var emails = String(emailsStr||'').split(',').map(function(e){return e.trim().toLowerCase();}).filter(function(e){return e.indexOf('@')>-1;});
    var uniq = []; emails.forEach(function(e){ if (uniq.indexOf(e)===-1) uniq.push(e); });
    if (!uniq.length) return 'Vui lòng chọn hoặc nhập ít nhất 1 email hợp lệ!';

    var hb = buildTaiLieuEmailHtml_(courseName, body, links);
    var emailList = uniq.join(',');
    MailApp.sendEmail({to:emailList, subject:'[TÀI LIỆU] '+courseName.toUpperCase(), htmlBody:hb});
    shEmail().appendRow([new Date(),courseId,courseName,'Gửi Tài Liệu','Gửi chọn lọc '+uniq.length+' người',hb,emailList]);
    return 'Đã gửi tài liệu cho '+uniq.length+' người!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

// Thêm thủ công (không gửi email)
function themTaiLieuThuCong(courseId, courseName, links, body) {
  try {
    var s=shTV(), data=s.getDataRange().getValues(), row=-1;
    for (var i=1;i<data.length;i++) { if (String(data[i][0])===String(courseId)) { row=i+1; break; } }
    var ts=fmt_(new Date(),'dd/MM/yyyy HH:mm:ss');
    if (row>-1) s.getRange(row,3,1,3).setValues([[body,links,ts]]);
    else s.appendRow([courseId||('TV-'+Date.now().toString().slice(-6)),courseName,body,links,ts]);
    return 'Đã lưu tài liệu thành công!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

// Cập nhật theo rowIndex
function capNhatTaiLieu(rowIndex, courseId, courseName, links, body) {
  try {
    shTV().getRange(rowIndex,1,1,5).setValues([[courseId,courseName,body,links,fmt_(new Date(),'dd/MM/yyyy HH:mm:ss')]]);
    return 'Đã cập nhật tài liệu!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

// Xóa theo rowIndex
function xoaTaiLieu(rowIndex) {
  try { shTV().deleteRow(rowIndex); return 'Đã xóa tài liệu!'; }
  catch(e) { return 'Lỗi: '+e.message; }
}

// ==========================================
// 6. BẢNG ĐIỂM
// ==========================================
function addScoreHistory(d) {
  try { shDiem().appendRow([new Date(),d.msnv,d.hoTen,d.khoaHoc,d.phanLoai,parseFloat(d.soDiem)||0,d.lyDo]); return 'Đã ghi nhận điểm!'; }
  catch(e) { return 'Lỗi: '+e.message; }
}

function getScoreData() {
  try {
    var data=shDiem().getDataRange().getValues(); if(data.length<=1) return {history:[],scoreboard:[]};
    var history=[], map={};
    data.slice(1).forEach(function(r){
      if (!r.join('').trim()) return;
      var msnv=String(r[1]||'').trim(), hoTen=String(r[2]||'').trim(), pts=parseFloat(r[5])||0;
      if (!msnv&&!hoTen) return;
      history.push({ngay:fmt_(r[0],'dd/MM/yyyy HH:mm'),ngayRaw:fmt_(r[0],'yyyy-MM-dd'),msnv:msnv,hoTen:hoTen,khoaHoc:String(r[3]||''),phanLoai:String(r[4]||''),soDiem:pts,lyDo:String(r[6]||'')});
      var k=msnv||hoTen; if(!map[k]) map[k]={msnv:msnv,hoTen:hoTen,tongDiem:0,courses:[]};
      map[k].tongDiem+=pts;
      var kk=String(r[3]||'Chung'); if(map[k].courses.indexOf(kk)===-1) map[k].courses.push(kk);
    });
    return { history:history.reverse(), scoreboard:Object.values(map).sort(function(a,b){return b.tongDiem-a.tongDiem;}) };
  } catch(e) { return {history:[],scoreboard:[]}; }
}

function checkIn(maKhoa, email) {
  try { shDD().appendRow([new Date(),maKhoa,String(email).toLowerCase().trim(),'Có mặt']); return 'Thành công'; }
  catch(e) { return 'Lỗi: '+e.message; }
}

// ==========================================
// 7. DASHBOARD
// ==========================================
function getDashboardData() {
  try {
    var sL=shLich(),sN=shNS(),sT=shTV(),sD=shDiem(),sA=shDD();
    var tC=Math.max(0,sL.getLastRow()-1), tE=Math.max(0,sN.getLastRow()-1), tDoc=Math.max(0,sT.getLastRow()-1), tS=Math.max(0,sD.getLastRow()-1), tA=Math.max(0,sA.getLastRow()-1);
    var dept={};
    if (tE>0) { var nd=sN.getDataRange().getValues(); for(var i=1;i<nd.length;i++){var dv=String(nd[i][2]||'Chưa phân loại').trim();if(dv)dept[dv]=(dept[dv]||0)+1;} }
    var cScore={};
    if (tS>0) { var dd=sD.getDataRange().getValues(); for(var j=1;j<dd.length;j++){var kh=String(dd[j][3]||'Chung').trim();if(!cScore[kh])cScore[kh]=0;cScore[kh]+=parseFloat(dd[j][5])||0;} }
    var csL=Object.keys(cScore).slice(0,6), csD=csL.map(function(k){return cScore[k];});
    var att={'Có mặt':0,'Đi muộn':0,'Vắng mặt':0};
    if (tA>0) { var ad=sA.getDataRange().getValues(); for(var k=1;k<ad.length;k++){var ts=String(ad[k][3]||'Có mặt');if(ts.indexOf('muộn')>-1)att['Đi muộn']++;else if(ts.indexOf('Vắng')>-1)att['Vắng mặt']++;else att['Có mặt']++;} }
    var hl={'Đang làm việc':0,'Đã nghỉ việc':0,'Tạm hoãn':0};
    if (tE>0) { var nd2=sN.getDataRange().getValues(); for(var m=1;m<nd2.length;m++){var h=String(nd2[m][6]||'Đang làm việc');if(hl[h]!==undefined)hl[h]++;else hl['Đang làm việc']++;} }
    var dL=Object.keys(dept), dD=dL.map(function(k){return dept[k];});
    return { totalCourses:tC,totalEmployees:tE,totalDocs:tDoc,totalScores:tS,totalAttendance:tA,
      deptLabels:dL.length?dL:['Chưa có'],deptData:dD.length?dD:[0],
      courseScoreLabels:csL.length?csL:['Chưa có'],courseScoreData:csD.length?csD:[0],
      attendanceLabels:Object.keys(att),attendanceData:Object.values(att),
      statusLabels:Object.keys(hl),statusData:Object.values(hl) };
  } catch(e) {
    return {totalCourses:0,totalEmployees:0,totalDocs:0,totalScores:0,totalAttendance:0,
      deptLabels:['Lỗi'],deptData:[0],courseScoreLabels:['Lỗi'],courseScoreData:[0],
      attendanceLabels:['Có mặt','Đi muộn','Vắng mặt'],attendanceData:[0,0,0],
      statusLabels:['Đang làm việc','Đã nghỉ việc','Tạm hoãn'],statusData:[0,0,0]};
  }
}

// ==========================================
// 8. XÁC THỰC ĐĂNG NHẬP
// ==========================================

/**
 * Xác thực email + mật khẩu từ sheet NhanVien
 * Trả về object user nếu thành công, null nếu sai
 */
function dangNhap(email, matKhau) {
  try {
    // Debug ping — trả về false thay vì crash
    if (String(email||'').trim() === '__debug__ping__') {
      return { success: false, msg: 'Kết nối OK — hàm dangNhap hoạt động bình thường.' };
    }
    var data = shNS().getDataRange().getValues();
    var emailClean = String(email||'').trim().toLowerCase();
    var pwClean    = String(matKhau||'').trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = String(row[3]||'').trim().toLowerCase();
      var rowPw    = String(row[4]||'').trim();
      var rowHL    = String(row[6]||'').trim();

      if (rowEmail === emailClean && rowPw === pwClean) {
        if (rowHL === 'Đã nghỉ việc') {
          return { success: false, msg: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ HCNS.' };
        }
        return {
          success: true,
          msnv:      String(row[0]||'').trim(),
          hoTen:     String(row[1]||'').trim(),
          donVi:     String(row[2]||'').trim(),
          email:     rowEmail,
          phanQuyen: String(row[5]||'Nhân viên').trim(),
          hieuLuc:   rowHL
        };
      }
    }
    return { success: false, msg: 'Email hoặc mật khẩu không đúng.' };
  } catch(e) {
    return { success: false, msg: 'Lỗi hệ thống: ' + e.message };
  }
}

/**
 * Lấy URL Web App hiện tại (để gửi trong email tài khoản)
 */
function getWebAppUrl() {
  try { return ScriptApp.getService().getUrl(); }
  catch(e) { return ''; }
}

/**
 * Gửi email thông báo tài khoản cho một hoặc nhiều nhân viên
 * msnvList: mảng msnv, hoặc ['__ALL__'] để gửi tất cả
 */
function guiEmailTaiKhoan(msnvList) {
  try {
    var data  = shNS().getDataRange().getValues();
    var webUrl = getWebAppUrl();
    var sent = 0, skipped = 0, errors = [];

    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var msnv = String(row[0]||'').trim();
      if (!msnv) continue;
      if (msnvList[0] === '__ALL__' || msnvList.indexOf(msnv) > -1) {
        rows.push(row);
      }
    }

    if (!rows.length) return { sent:0, skipped:0, msg:'Không tìm thấy nhân viên để gửi.' };

    rows.forEach(function(row) {
      var msnv   = String(row[0]||'').trim();
      var hoTen  = String(row[1]||'').trim();
      var email  = String(row[3]||'').trim();
      var pw     = String(row[4]||'123456').trim();
      var quyen  = String(row[5]||'Nhân viên').trim();
      var donVi  = String(row[2]||'').trim();

      if (!email || email.indexOf('@') < 0) { skipped++; return; }

      var htmlBody = '<div style="font-family:Arial,sans-serif;background:#f0f4f8;padding:30px 20px">'
        + '<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">'
        + '<div style="background:#1a3a5c;padding:28px 30px;text-align:center">'
        + '<div style="width:52px;height:52px;background:#c9a84c;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#1a3a5c;margin-bottom:12px">E</div>'
        + '<h2 style="color:#fff;margin:0;font-size:18px;letter-spacing:.5px">HCNS EduManager</h2>'
        + '<p style="color:rgba(255,255,255,.7);font-size:12px;margin:4px 0 0">Hệ thống Quản lý Đào tạo Nội bộ</p>'
        + '</div>'
        + '<div style="padding:28px 30px">'
        + '<p style="font-size:15px;color:#1e293b;margin-bottom:20px">Xin chào <strong>' + hoTen + '</strong>,</p>'
        + '<p style="color:#64748b;line-height:1.6;margin-bottom:22px">Bạn đã được cấp tài khoản để truy cập <strong>Hệ thống Quản lý Đào tạo HCNS</strong>. Vui lòng sử dụng thông tin bên dưới để đăng nhập.</p>'
        + '<div style="background:#f8fafc;border-radius:10px;padding:20px 22px;border:1px solid #e2e8f0;margin-bottom:22px">'
        + '<div style="display:flex;align-items:center;margin-bottom:12px">'
        + '<span style="width:28px;height:28px;background:#1a3a5c;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;margin-right:10px">👤</span>'
        + '<div><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tên đăng nhập (Email)</div>'
        + '<div style="font-size:15px;font-weight:700;color:#1a3a5c;margin-top:2px">' + email + '</div></div></div>'
        + '<div style="height:1px;background:#e2e8f0;margin:12px 0"></div>'
        + '<div style="display:flex;align-items:center;margin-bottom:12px">'
        + '<span style="width:28px;height:28px;background:#c9a84c;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#1a3a5c;font-size:12px;margin-right:10px">🔑</span>'
        + '<div><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Mật khẩu</div>'
        + '<div style="font-size:15px;font-weight:700;color:#1a3a5c;margin-top:2px;letter-spacing:1px">' + pw + '</div></div></div>'
        + '<div style="height:1px;background:#e2e8f0;margin:12px 0"></div>'
        + '<div style="display:flex;align-items:center">'
        + '<span style="width:28px;height:28px;background:#16a34a;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;margin-right:10px">🏢</span>'
        + '<div><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Đơn vị · Vai trò</div>'
        + '<div style="font-size:13px;font-weight:600;color:#1a3a5c;margin-top:2px">' + donVi + ' · ' + quyen + '</div></div></div>'
        + '</div>'
        + (webUrl ? '<div style="text-align:center;margin-bottom:22px"><a href="' + webUrl + '" style="display:inline-block;background:#1a3a5c;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.3px">🚀 Truy cập hệ thống</a></div>' : '')
        + '<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0">⚠️ Vui lòng bảo mật thông tin đăng nhập, không chia sẻ với người khác. Liên hệ phòng HCNS nếu cần hỗ trợ.</p>'
        + '</div>'
        + '<div style="background:#f8fafc;padding:14px 30px;text-align:center;border-top:1px solid #e2e8f0">'
        + '<p style="font-size:12px;color:#94a3b8;margin:0">PHÒNG HÀNH CHÍNH – NHÂN SỰ &nbsp;|&nbsp; HCNS EduManager</p>'
        + '</div></div></div>';

      try {
        MailApp.sendEmail({
          to: email,
          subject: '[HCNS EduManager] Thông tin tài khoản đăng nhập hệ thống',
          htmlBody: htmlBody
        });
        sent++;
      } catch(me) {
        errors.push(email + ': ' + me.message);
      }
    });

    var msg = 'Đã gửi thành công ' + sent + ' email tài khoản.';
    if (skipped > 0) msg += ' (' + skipped + ' bỏ qua do thiếu email)';
    if (errors.length > 0) msg += ' Lỗi: ' + errors.join('; ');
    return { sent: sent, skipped: skipped, msg: msg };
  } catch(e) {
    return { sent:0, skipped:0, msg:'Lỗi: ' + e.message };
  }
}

// ==========================================
// 9. ĐIỂM DANH ĐẦY ĐỦ (có mặt + vắng)
// ==========================================

/**
 * Trả về danh sách điểm danh đầy đủ cho một khóa học:
 * - Lấy danh sách email được mời từ LichDaoTao
 * - Đối chiếu với sheet DiemDanh
 * - Người không check-in → trạng thái "Vắng mặt"
 * - Trả về { summary, list }
 */
function getAttendanceFullByCourse(maKhoa) {
  try {
    // 1. Lấy thông tin khóa học (tên + danh sách email mời)
    var lichData = shLich().getDataRange().getValues();
    var courseEmails = [];
    var courseName   = '';
    for (var i = 1; i < lichData.length; i++) {
      if (String(lichData[i][0]) === String(maKhoa)) {
        courseName   = String(lichData[i][1] || '');
        courseEmails = String(lichData[i][6] || '')
          .split(',')
          .map(function(e){ return e.trim().toLowerCase(); })
          .filter(Boolean);
        break;
      }
    }

    // 2. Lấy dữ liệu điểm danh đã check-in
    var ddData   = shDD().getDataRange().getValues();
    // Map: email → { thoiGian, trangThai } (lấy lần mới nhất)
    var checkinMap = {};
    for (var j = 1; j < ddData.length; j++) {
      if (String(ddData[j][1]) !== String(maKhoa)) continue;
      var em = String(ddData[j][2] || '').toLowerCase().trim();
      if (!em) continue;
      // Ghi đè để lấy lần check-in mới nhất (sheet đã sắp theo thứ tự thêm vào)
      checkinMap[em] = {
        thoiGian: fmt_(ddData[j][0], 'dd/MM/yyyy HH:mm'),
        trangThai: String(ddData[j][3] || 'Có mặt')
      };
    }

    // 3. Ghép thông tin nhân sự (để lấy họ tên, đơn vị)
    var nsData = shNS().getDataRange().getValues();
    var nsMap  = {}; // email → { hoTen, donVi, msnv }
    for (var k = 1; k < nsData.length; k++) {
      var nsEmail = String(nsData[k][3] || '').toLowerCase().trim();
      if (nsEmail) nsMap[nsEmail] = {
        hoTen: String(nsData[k][1] || ''),
        donVi: String(nsData[k][2] || ''),
        msnv:  String(nsData[k][0] || '')
      };
    }

    // 4. Xây dựng danh sách đầy đủ
    var list = [];

    // Những người đã được mời
    var invitedSet = {};
    courseEmails.forEach(function(em) {
      invitedSet[em] = true;
      var ns  = nsMap[em] || { hoTen: '', donVi: '', msnv: '' };
      var ci  = checkinMap[em];
      list.push({
        email:     em,
        hoTen:     ns.hoTen || em,
        donVi:     ns.donVi,
        msnv:      ns.msnv,
        thoiGian:  ci ? ci.thoiGian : '',
        trangThai: ci ? ci.trangThai : 'Vắng mặt',
        invited:   true
      });
    });

    // Những người check-in nhưng KHÔNG có trong danh sách mời (bổ sung)
    Object.keys(checkinMap).forEach(function(em) {
      if (invitedSet[em]) return; // đã xử lý
      var ns = nsMap[em] || { hoTen: '', donVi: '', msnv: '' };
      list.push({
        email:     em,
        hoTen:     ns.hoTen || em,
        donVi:     ns.donVi,
        msnv:      ns.msnv,
        thoiGian:  checkinMap[em].thoiGian,
        trangThai: checkinMap[em].trangThai,
        invited:   false
      });
    });

    // 5. Sắp xếp: Có mặt trước, sau đó Vắng mặt
    list.sort(function(a, b) {
      var order = { 'Có mặt': 0, 'Đi muộn': 1, 'Vắng mặt (Có lý do)': 2, 'Vắng mặt (Không lý do)': 3, 'Vắng mặt': 4 };
      var oa = (order[a.trangThai] !== undefined) ? order[a.trangThai] : 5;
      var ob = (order[b.trangThai] !== undefined) ? order[b.trangThai] : 5;
      return oa - ob;
    });

    // 6. Thống kê tổng hợp
    var coMat      = list.filter(function(r){ return r.trangThai === 'Có mặt'; }).length;
    var diMuon     = list.filter(function(r){ return r.trangThai === 'Đi muộn'; }).length;
    var vangCoLydo = list.filter(function(r){ return r.trangThai === 'Vắng mặt (Có lý do)'; }).length;
    var vangKoLydo = list.filter(function(r){ return r.trangThai === 'Vắng mặt (Không lý do)'; }).length;
    var vangThuong = list.filter(function(r){ return r.trangThai === 'Vắng mặt'; }).length;
    var tongVang   = vangCoLydo + vangKoLydo + vangThuong;
    var tongCoMat  = coMat + diMuon;
    var tongMoi    = courseEmails.length;
    var tyleCoMat  = tongMoi > 0 ? Math.round(tongCoMat / tongMoi * 100) : 0;

    return {
      courseName:   courseName,
      tongMoi:      tongMoi,
      tongCoMat:    tongCoMat,
      tongVang:     tongVang,
      coMat:        coMat,
      diMuon:       diMuon,
      vangCoLydo:   vangCoLydo,
      vangKoLydo:   vangKoLydo,
      tyleCoMat:    tyleCoMat,
      list:         list
    };
  } catch(e) {
    Logger.log('Lỗi getAttendanceFullByCourse: ' + e.message);
    return { courseName:'', tongMoi:0, tongCoMat:0, tongVang:0, coMat:0, diMuon:0, vangCoLydo:0, vangKoLydo:0, tyleCoMat:0, list:[] };
  }
}

// ==========================================
// 10. FORM ĐĂNG KÝ ĐỘC LẬP
// ==========================================

function shForm()  { return getSheet_(['FormDangKy','Form Đăng Ký'], 'FormDangKy',
  ['Mã Form','Tên Sự Kiện','Mô Tả','Ngày','Giờ BĐ','Giờ KT','Địa Điểm',
   'Tiêu Đề NT','Nội Dung NT','Câu Hỏi Thêm','Giới Hạn','Trạng Thái','Link Đăng Ký']); }

function shDK()    { return getSheet_(['DangKy','Đăng Ký'], 'DangKy',
  ['Thời Gian','Mã Form','Tên Sự Kiện','Họ Tên','Email','SĐT','Đơn Vị','Trả Lời','Trạng Thái','Email XN']); }

/* ---------- Lấy danh sách form ---------- */
function getAllForms() {
  try {
    var data = shForm().getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1).filter(function(r){ return r.join('').trim(); }).map(function(r, i) {
      return {
        rowIndex: i + 2,
        maForm:   String(r[0]||'').trim(),
        tenSK:    String(r[1]||'').trim(),
        moTa:     String(r[2]||'').trim(),
        ngay:     fmt_(r[3],'dd/MM/yyyy'),
        ngayRaw:  fmt_(r[3],'yyyy-MM-dd'),
        gioBD:    String(r[4]||'').trim(),
        gioKT:    String(r[5]||'').trim(),
        diaDiem:  String(r[6]||'').trim(),
        tieuDeNT: String(r[7]||'').trim(),
        noiDungNT:String(r[8]||'').trim(),
        cauHoi:   String(r[9]||'').trim(),
        gioiHan:  r[10] ? parseInt(r[10]) : 0,
        trangThai:String(r[11]||'Đang mở').trim(),
        link:     String(r[12]||'').trim()
      };
    });
  } catch(e) { return []; }
}

/* ---------- Tạo form mới ---------- */
function taoForm(d) {
  try {
    var s = shForm();
    var ma = 'F-' + Math.floor(1000 + Math.random() * 9000);
    var url = ScriptApp.getService().getUrl();
    var link = url + '?page=register&id=' + ma;
    s.appendRow([
      ma, d.tenSK, d.moTa, d.ngay, d.gioBD, d.gioKT, d.diaDiem,
      d.tieuDeNT, d.noiDungNT, d.cauHoi,
      d.gioiHan ? parseInt(d.gioiHan) : '',
      d.trangThai || 'Đang mở', link
    ]);
    return { ok: true, ma: ma, link: link, msg: 'Tạo form thành công!' };
  } catch(e) { return { ok: false, msg: 'Lỗi: ' + e.message }; }
}

/* ---------- Cập nhật form ---------- */
function capNhatForm(rowIndex, d) {
  try {
    var s = shForm();
    var row = s.getRange(rowIndex, 1, 1, 13).getValues()[0];
    var link = String(row[12]||'').trim();
    s.getRange(rowIndex, 1, 1, 13).setValues([[
      row[0], d.tenSK, d.moTa, d.ngay, d.gioBD, d.gioKT, d.diaDiem,
      d.tieuDeNT, d.noiDungNT, d.cauHoi,
      d.gioiHan ? parseInt(d.gioiHan) : '',
      d.trangThai || 'Đang mở', link
    ]]);
    return 'Cập nhật form thành công!';
  } catch(e) { return 'Lỗi: ' + e.message; }
}

/* ---------- Xóa form ---------- */
function xoaForm(rowIndex) {
  try { shForm().deleteRow(rowIndex); return 'Đã xóa form!'; }
  catch(e) { return 'Lỗi: ' + e.message; }
}

/* ---------- Đổi trạng thái ---------- */
function doiTrangThaiForm(rowIndex, trangThai) {
  try {
    shForm().getRange(rowIndex, 12).setValue(trangThai);
    return 'Đã ' + (trangThai === 'Đang mở' ? 'mở' : 'đóng') + ' form!';
  } catch(e) { return 'Lỗi: ' + e.message; }
}

/* ---------- Danh sách đăng ký theo form ---------- */
function getDanhSachDangKy(maForm) {
  try {
    var data = shDK().getDataRange().getValues();
    if (data.length <= 1) return [];
    return data.slice(1)
      .filter(function(r){ return String(r[1]).trim() === String(maForm).trim(); })
      .map(function(r, i) {
        return {
          stt:      i + 1,
          thoiGian: fmt_(r[0], 'dd/MM/yyyy HH:mm'),
          maForm:   String(r[1]||''),
          tenSK:    String(r[2]||''),
          hoTen:    String(r[3]||''),
          email:    String(r[4]||''),
          sdt:      String(r[5]||''),
          donVi:    String(r[6]||''),
          traLoi:   String(r[7]||''),
          trangThai:String(r[8]||'Đã đăng ký'),
          emailXN:  String(r[9]||'')
        };
      });
  } catch(e) { return []; }
}

/* ---------- Thống kê nhanh tất cả form ---------- */
function getFormStats() {
  try {
    var dkData = shDK().getDataRange().getValues();
    var stats = {};
    for (var i = 1; i < dkData.length; i++) {
      var ma = String(dkData[i][1]||'').trim();
      if (!ma) continue;
      if (!stats[ma]) stats[ma] = 0;
      stats[ma]++;
    }
    return stats;
  } catch(e) { return {}; }
}

/* ---------- Export CSV ---------- */
function exportDanhSachCSV(maForm) {
  try {
    var list = getDanhSachDangKy(maForm);
    if (!list.length) return { ok: false, msg: 'Chưa có người đăng ký.' };
    var header = 'STT,Thời gian,Họ tên,Email,SĐT,Đơn vị,Trả lời,Trạng thái\n';
    var rows = list.map(function(r) {
      return [r.stt, r.thoiGian, '"'+r.hoTen+'"', r.email, r.sdt, '"'+r.donVi+'"', '"'+r.traLoi+'"', r.trangThai].join(',');
    }).join('\n');
    return { ok: true, csv: header + rows, count: list.length };
  } catch(e) { return { ok: false, msg: 'Lỗi: ' + e.message }; }
}

/* ---------- Học viên gửi form (public) ---------- */
function dangKyThamGia(maForm, hoTen, email, sdt, donVi, traLoi) {
  try {
    // Lấy thông tin form
    var formData = shForm().getDataRange().getValues();
    var form = null;
    for (var i = 1; i < formData.length; i++) {
      if (String(formData[i][0]).trim() === String(maForm).trim()) {
        form = formData[i]; break;
      }
    }
    if (!form) return { ok: false, msg: 'Không tìm thấy form đăng ký.' };

    var trangThai = String(form[11]||'').trim();
    if (trangThai === 'Đã đóng') return { ok: false, msg: 'Form đăng ký đã đóng.' };

    // Kiểm tra giới hạn
    var gioiHan = form[10] ? parseInt(form[10]) : 0;
    if (gioiHan > 0) {
      var dkData = shDK().getDataRange().getValues();
      var count = 0;
      for (var j = 1; j < dkData.length; j++) {
        if (String(dkData[j][1]).trim() === String(maForm).trim()) count++;
      }
      if (count >= gioiHan) return { ok: false, msg: 'Đã đủ số lượng đăng ký (' + gioiHan + ' người). Vui lòng liên hệ Ban tổ chức.' };
    }

    // Kiểm tra trùng email
    var dkSheet = shDK();
    var existData = dkSheet.getDataRange().getValues();
    var existRow = -1;
    for (var k = 1; k < existData.length; k++) {
      if (String(existData[k][1]).trim() === String(maForm).trim() &&
          String(existData[k][4]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
        existRow = k + 1; break;
      }
    }

    var tenSK = String(form[1]||'').trim();
    var ngay  = fmt_(form[3], 'dd/MM/yyyy');
    var gioBD = String(form[4]||'').trim();
    var gioKT = String(form[5]||'').trim();
    var diaD  = String(form[6]||'').trim();

    if (existRow > -1) {
      // Cập nhật bản ghi cũ
      dkSheet.getRange(existRow, 1, 1, 10).setValues([[
        new Date(), maForm, tenSK, hoTen, email, sdt, donVi, traLoi, 'Đã đăng ký', 'Chưa gửi'
      ]]);
    } else {
      dkSheet.appendRow([new Date(), maForm, tenSK, hoTen, email, sdt, donVi, traLoi, 'Đã đăng ký', 'Chưa gửi']);
    }

    // Gửi email xác nhận
    try {
      var thoiGian = (gioBD && gioKT) ? (gioBD + ' – ' + gioKT) : '';
      var htmlXN = '<div style="font-family:Arial,sans-serif;background:#f0f4f8;padding:30px 20px">'
        + '<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">'
        + '<div style="background:#1a3a5c;padding:28px 30px;text-align:center">'
        + '<div style="width:52px;height:52px;background:#c9a84c;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#1a3a5c;margin-bottom:12px">✓</div>'
        + '<h2 style="color:#fff;margin:0;font-size:18px">ĐĂNG KÝ THÀNH CÔNG</h2>'
        + '</div>'
        + '<div style="padding:28px 30px">'
        + '<p style="font-size:15px;color:#1e293b;margin-bottom:16px">Xin chào <strong>' + hoTen + '</strong>,</p>'
        + '<p style="color:#64748b;margin-bottom:20px">Bạn đã đăng ký tham gia thành công. Dưới đây là thông tin chi tiết:</p>'
        + '<div style="background:#f8fafc;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;margin-bottom:20px">'
        + '<p style="margin:0 0 8px;font-size:14px"><span style="color:#64748b">Sự kiện:</span> <strong style="color:#1a3a5c">' + tenSK + '</strong></p>'
        + (ngay ? '<p style="margin:0 0 8px;font-size:14px"><span style="color:#64748b">Ngày:</span> <strong>' + ngay + '</strong></p>' : '')
        + (thoiGian ? '<p style="margin:0 0 8px;font-size:14px"><span style="color:#64748b">Thời gian:</span> <strong>' + thoiGian + '</strong></p>' : '')
        + (diaD ? '<p style="margin:0;font-size:14px"><span style="color:#64748b">Địa điểm:</span> <strong>' + diaD + '</strong></p>' : '')
        + '</div>'
        + '<p style="font-size:12px;color:#94a3b8">Vui lòng đến đúng giờ và tuân thủ các nguyên tắc đã xác nhận khi đăng ký.</p>'
        + '</div>'
        + '<div style="background:#f8fafc;padding:14px 30px;text-align:center;border-top:1px solid #e2e8f0">'
        + '<p style="font-size:12px;color:#94a3b8;margin:0">PHÒNG HÀNH CHÍNH – NHÂN SỰ &nbsp;|&nbsp; HCNS EduManager</p>'
        + '</div></div></div>';

      MailApp.sendEmail({ to: email.trim(), subject: '[XÁC NHẬN] Đăng ký tham gia: ' + tenSK, htmlBody: htmlXN });

      // Cập nhật trạng thái email XN
      var newData = dkSheet.getDataRange().getValues();
      for (var m = 1; m < newData.length; m++) {
        if (String(newData[m][1]).trim() === String(maForm).trim() &&
            String(newData[m][4]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
          dkSheet.getRange(m+1, 10).setValue('Đã gửi'); break;
        }
      }
    } catch(mailErr) { /* Im lặng nếu lỗi mail */ }

    return { ok: true, msg: 'Đăng ký thành công!', ten: hoTen, tenSK: tenSK, ngay: ngay, thoiGian: thoiGian, diaDiem: diaD };
  } catch(e) {
    return { ok: false, msg: 'Lỗi hệ thống: ' + e.message };
  }
}

/* ---------- Lấy thông tin form cho trang đăng ký public ---------- */
function getFormPublic(maForm) {
  try {
    var data = shForm().getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(maForm).trim()) {
        var gioiHan = data[i][10] ? parseInt(data[i][10]) : 0;
        var dkData = shDK().getDataRange().getValues();
        var soDK = 0;
        for (var j = 1; j < dkData.length; j++) {
          if (String(dkData[j][1]).trim() === String(maForm).trim()) soDK++;
        }
        return {
          ok: true,
          maForm:    String(data[i][0]||'').trim(),
          tenSK:     String(data[i][1]||'').trim(),
          moTa:      String(data[i][2]||'').trim(),
          ngay:      fmt_(data[i][3],'dd/MM/yyyy'),
          gioBD:     String(data[i][4]||'').trim(),
          gioKT:     String(data[i][5]||'').trim(),
          diaDiem:   String(data[i][6]||'').trim(),
          tieuDeNT:  String(data[i][7]||'').trim(),
          noiDungNT: String(data[i][8]||'').trim(),
          cauHoi:    String(data[i][9]||'').trim(),
          gioiHan:   gioiHan,
          soDK:      soDK,
          conLai:    gioiHan > 0 ? Math.max(0, gioiHan - soDK) : -1,
          trangThai: String(data[i][11]||'Đang mở').trim()
        };
      }
    }
    return { ok: false, msg: 'Không tìm thấy form đăng ký.' };
  } catch(e) {
    return { ok: false, msg: 'Lỗi: ' + e.message };
  }
}

// ==========================================
// 11. QUẢN LÝ MẪU THƯ
// ==========================================

function getAllMauThu() {
  try {
    var s = shMauThu(), data = s.getDataRange().getValues();
    if (data.length <= 1) {
      // Tạo mẫu mặc định
      var defaults = [
        ['MT-001','Thư mời chung','[MỜI ĐÀO TẠO] {ten_khoa_hoc}',
         'Kính gửi Anh/Chị,\n\nPhòng Hành chính – Nhân sự trân trọng kính mời Anh/Chị tham gia khóa đào tạo nội bộ.\n\nĐây là cơ hội quý giá để nâng cao kiến thức và kỹ năng chuyên môn. Rất mong Anh/Chị sắp xếp thời gian tham dự đầy đủ.\n\nMọi thắc mắc vui lòng liên hệ Phòng HCNS để được hỗ trợ.','',
         new Date()],
        ['MT-002','Đào tạo bắt buộc','[BẮT BUỘC] Đào tạo: {ten_khoa_hoc}',
         'Kính gửi Anh/Chị,\n\nTheo kế hoạch đào tạo năm, Phòng HCNS thông báo lịch đào tạo BẮT BUỘC dành cho toàn thể Anh/Chị.\n\nĐề nghị Anh/Chị tham dự đúng giờ và đầy đủ. Trường hợp vắng mặt phải có lý do và được phê duyệt trước bởi Trưởng đơn vị.','',
         new Date()],
        ['MT-003','Hội thảo – Workshop','[WORKSHOP] {ten_khoa_hoc}',
         'Xin chào,\n\nChúng tôi trân trọng kính mời bạn tham dự Workshop/Hội thảo được tổ chức bởi Phòng HCNS.\n\nBuổi workshop sẽ mang đến nhiều kiến thức thực tiễn và cơ hội giao lưu giữa các đồng nghiệp. Sự tham gia của bạn sẽ là động lực lớn cho chương trình.\n\nHẹn gặp bạn tại sự kiện!','',
         new Date()]
      ];
      defaults.forEach(function(r){ s.appendRow(r); });
      data = s.getDataRange().getValues();
    }
    return data.slice(1).filter(function(r){ return r.join('').trim(); }).map(function(r, i){
      return {
        rowIndex: i + 2,
        maMau:    String(r[0]||'').trim(),
        tenMau:   String(r[1]||'').trim(),
        chuDe:    String(r[2]||'').trim(),
        noiDung:  String(r[3]||'').trim(),
        links:    String(r[4]||'').trim(),
        ngayCapNhat: fmt_(r[5],'dd/MM/yyyy HH:mm')
      };
    });
  } catch(e) { Logger.log('Lỗi getAllMauThu: '+e.message); return []; }
}

function saveMauThu(d) {
  try {
    var s = shMauThu(), data = s.getDataRange().getValues();
    var ts = new Date();
    if (d.rowIndex && parseInt(d.rowIndex) > 1) {
      var ri = parseInt(d.rowIndex);
      s.getRange(ri,1,1,6).setValues([[d.maMau, d.tenMau, d.chuDe, d.noiDung, d.links||'', ts]]);
      return 'Đã cập nhật mẫu thư!';
    }
    var ma = 'MT-' + (100 + Math.max(0, s.getLastRow() - 1)).toString();
    s.appendRow([ma, d.tenMau, d.chuDe, d.noiDung, d.links||'', ts]);
    return 'Đã lưu mẫu thư mới!';
  } catch(e) { return 'Lỗi: '+e.message; }
}

function xoaMauThu(rowIndex) {
  try { shMauThu().deleteRow(rowIndex); return 'Đã xóa mẫu thư!'; }
  catch(e) { return 'Lỗi: '+e.message; }
}