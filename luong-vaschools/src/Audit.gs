/** Nhật ký hệ thống: chỉ thêm, không sửa/xóa. Gọi trong Db.tx(). */
var Audit = {
  log: function (user, action, table, rowId, detail) {
    var text = typeof detail === 'string' ? detail : JSON.stringify(detail || {});
    if (text.length > 40000) text = text.slice(0, 40000) + '…[cắt bớt]';
    Db.insertMany('AUDIT_LOG', [{
      ts: Util.nowIso(), email: user ? user.email : 'system', hanh_dong: action,
      bang: table || '', row_id: rowId || '', chi_tiet: text
    }], user ? user.email : 'system');
  }
};
