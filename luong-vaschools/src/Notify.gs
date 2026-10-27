/**
 * Thông báo: luôn ghi thông báo trong ứng dụng (bảng NOTIFY) và gửi email nếu bật cấu hình email_bat.
 * Email chỉ gửi sau khi giao dịch ghi xong (flush) để không giữ khóa lâu.
 */
var Notify = {
  _mail: [],

  /** Gọi trong Db.tx(). o = { to: [email], title, body, link (vd 'dean'), type }. */
  queue: function (o) {
    var to = Util.uniq((o.to || []).map(function (e) { return String(e).toLowerCase(); }));
    if (!to.length) return;
    Db.insertMany('NOTIFY', to.map(function (e) {
      return { email: e, tieu_de: o.title, noi_dung: o.body || '', link: o.link || '', loai: o.type || 'Thông báo', da_doc: 'Không' };
    }), 'system');
    if (Settings.get('email_bat', 'Có') === 'Có') {
      to.forEach(function (e) { Notify._mail.push({ to: e, title: o.title, body: o.body || '', link: o.link || '' }); });
    }
  },

  /** Gửi các email đang chờ. Lỗi/hạn mức hết được ghi nhật ký, không làm hỏng thao tác chính. */
  flush: function () {
    var jobs = Notify._mail;
    Notify._mail = [];
    if (!jobs.length) return { sent: 0, failed: 0 };
    var quota = 0, sent = 0, errs = [];
    try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { errs.push('Không đọc được hạn mức email: ' + e.message); }
    var base = Db.all('SETTINGS').length ? Settings.get('app_url', '') : '';
    jobs.forEach(function (j, i) {
      if (i >= quota) { errs.push('Hết hạn mức email, bỏ qua ' + j.to); return; }
      try {
        var link = base ? base + '#' + j.link : '';
        var html = '<div style="font-family:Arial,sans-serif;font-size:14px"><p><b>' + Util.escapeHtml(j.title) + '</b></p>' +
          (j.body ? '<p>' + Util.escapeHtml(j.body).replace(/\n/g, '<br>') + '</p>' : '') +
          (link ? '<p><a href="' + Util.escapeHtml(link) + '">Mở hệ thống</a></p>' : '') +
          '<p style="color:#888;font-size:12px">Email tự động từ Hệ thống Lương VASchools.</p></div>';
        MailApp.sendEmail({ to: j.to, subject: '[Hệ thống Lương VAS] ' + j.title, htmlBody: html, name: 'Hệ thống Lương VASchools' });
        sent++;
      } catch (e) { errs.push(j.to + ': ' + e.message); }
    });
    if (errs.length) Db.tx(function () { Audit.log(null, 'EMAIL_LOI', 'NOTIFY', '', errs); });
    return { sent: sent, failed: errs.length };
  },

  discard: function () { Notify._mail = []; },

  list: function (mail, limit) {
    var rows = Db.filter('NOTIFY', function (r) { return r.email === mail; });
    rows.sort(function (a, b) { return a.created_at < b.created_at ? 1 : (a.created_at > b.created_at ? -1 : b.__row - a.__row); });
    return rows.slice(0, limit || 30).map(function (r) {
      return { id: r.id, title: r.tieu_de, body: r.noi_dung, link: r.link, type: r.loai, read: r.da_doc === 'Có', at: r.created_at };
    });
  },

  unread: function (mail) {
    return Db.filter('NOTIFY', function (r) { return r.email === mail && r.da_doc !== 'Có'; }).length;
  },

  markRead: function (mail, ids) {
    Db.tx(function () {
      var set = {};
      (ids || []).forEach(function (i) { set[i] = true; });
      var ups = Db.filter('NOTIFY', function (r) { return r.email === mail && r.da_doc !== 'Có' && (!ids || set[r.id]); })
        .map(function (r) { return { id: r.id, patch: { da_doc: 'Có' } }; });
      Db.updateMany('NOTIFY', ups, mail);
    });
  }
};
