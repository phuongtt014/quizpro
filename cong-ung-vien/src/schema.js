/* ---- Lược đồ biểu mẫu BM.10/HN.QT.01 (dùng chung cho giao diện và Code.gs) ---- */
var FORM_META = { code: 'BM.10/HN.QT.01', date: '21/09/2026', issue: '01', title: 'THÔNG TIN ỨNG VIÊN', sub: '(Dùng cho cán bộ quản lý, giáo viên và nhân viên văn phòng)' };
var PF_DEFAULT = [
  { k: 'viTri', l: 'Vị trí ứng tuyển', t: 'text', req: 1, max: 120, wide: 1 },
  { k: 'hoTen', l: 'Họ và tên', t: 'text', req: 1, max: 80 },
  { k: 'gioiTinh', l: 'Giới tính', t: 'radio', opts: ['Nam', 'Nữ'], req: 1 },
  { k: 'ngaySinh', l: 'Ngày sinh', t: 'date', req: 1, birth: 1 },
  { k: 'noiSinh', l: 'Nơi sinh', t: 'text', req: 1, max: 100 },
  { k: 'quocTich', l: 'Quốc tịch', t: 'text', max: 60 },
  { k: 'cccd', l: 'Số CCCD', t: 'cccd', req: 1 },
  { k: 'ngayCap', l: 'Ngày cấp', t: 'date', req: 1 },
  { k: 'noiCap', l: 'Nơi cấp', t: 'text', req: 1, max: 100 },
  { k: 'danToc', l: 'Dân tộc', t: 'text', max: 40 },
  { k: 'tonGiao', l: 'Tôn giáo', t: 'text', max: 40 },
  { k: 'honNhan', l: 'Tình trạng hôn nhân', t: 'radio', opts: ['Độc thân', 'Có gia đình'] },
  { k: 'dienThoai', l: 'Điện thoại di động', t: 'tel', req: 1 },
  { k: 'thuongTru', l: 'Địa chỉ thường trú (sau sáp nhập)', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'tamTru', l: 'Địa chỉ tạm trú / hiện nay', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'mangThai', l: 'Đang mang thai', t: 'radio', opts: ['Có', 'Không'], wide: 1 },
  { k: 'email', l: 'Email', t: 'email', req: 1, max: 120, wide: 1 },
  { k: 'doanDang', l: 'Đoàn/Đảng', t: 'text', max: 60 },
  { k: 'nvqs', l: 'Nghĩa vụ quân sự', t: 'check', cb: 'Đã hoàn thành' },
  { k: 'khanCap', l: 'Người liên hệ khẩn cấp', t: 'text', req: 1, max: 80, wide: 1 },
  { k: 'quanHe', l: 'Mối quan hệ', t: 'text', req: 1, max: 40 },
  { k: 'sdtKhanCap', l: 'SĐT người liên hệ khẩn cấp', t: 'tel', req: 1 },
  { k: 'diaChiLienLac', l: 'Địa chỉ liên lạc', t: 'text', req: 1, max: 250, wide: 1 },
  { k: 'ngayNhanViec', l: 'Ngày nhận việc chính thức', t: 'date', wide: 1, future: 1 },
  { k: 'nguon', l: 'Bạn biết thông tin tuyển dụng này thông qua', t: 'multi', opts: ['Website VA Schools', 'Fanpage VA Schools Tuyển dụng', 'Khác'], wide: 1 },
  { k: 'luong', l: 'Mức lương mong muốn', t: 'text', max: 60, wide: 1 }
];
var PF = PF_DEFAULT;
var FIELD_TYPES = { text: 'Văn bản ngắn', textarea: 'Văn bản dài', number: 'Số', date: 'Ngày', tel: 'Điện thoại', email: 'Email', select: 'Danh sách chọn (dropdown)', radio: 'Chọn một (nút tròn)', multi: 'Chọn nhiều (ô tích)' };
var LOCKED_FIELDS = { viTri: 1, hoTen: 1, ngaySinh: 1, cccd: 1, dienThoai: 1, email: 1 }; /* không ẩn, không đổi kiểu */
var TBL_OPTS = { bangCap: [], heDaoTao: [], ngoaiNgu: [] }; /* danh mục (dropdown) cho các cột của bảng; để trống = ô nhập tự do */
/** Gộp cấu hình đã lưu (danh sách trường theo thứ tự) với trường mặc định. */
function mergeFields(saved) {
  var def = {}, out = [], seen = {};
  PF_DEFAULT.forEach(function (f) { def[f.k] = f; });
  (Array.isArray(saved) ? saved : []).forEach(function (s) {
    if (!s || !s.k || seen[s.k]) return;
    var d = def[s.k], f;
    if (d) {
      f = {}; Object.keys(d).forEach(function (x) { f[x] = d[x]; });
      if (s.l) f.l = String(s.l); if (s.req != null) f.req = s.req ? 1 : 0; f.hide = s.hide ? 1 : 0; if (s.wide != null) f.wide = s.wide ? 1 : 0;
      if (!LOCKED_FIELDS[s.k] && d.t !== 'check' && s.t && FIELD_TYPES[s.t]) f.t = s.t;
      if (Array.isArray(s.opts) && s.opts.length) f.opts = s.opts.slice();
      if (LOCKED_FIELDS[s.k]) f.hide = 0;
    } else if (s.custom && /^c_[a-z0-9_]{1,24}$/.test(s.k)) {
      var t = FIELD_TYPES[s.t] ? s.t : 'text';
      f = { k: s.k, l: String(s.l || s.k), t: t, req: s.req ? 1 : 0, opts: Array.isArray(s.opts) ? s.opts.slice() : [], wide: s.wide ? 1 : 0, custom: 1, hide: s.hide ? 1 : 0 };
    } else return;
    if (f.t === 'text' && !f.max) f.max = 120;
    if (f.t === 'textarea') f.max = 500;
    if (f.t === 'number') f.max = 20;
    seen[f.k] = 1; out.push(f);
  });
  PF_DEFAULT.forEach(function (d) { if (!seen[d.k]) { var f = {}; Object.keys(d).forEach(function (x) { f[x] = d[x]; }); out.push(f); } });
  return out;
}
/* các hàng của mục II khi in (theo đúng biểu mẫu) */
var PRINT_II = [['hoTen', 'gioiTinh'], ['ngaySinh', 'noiSinh'], ['quocTich', 'cccd'], ['ngayCap', 'noiCap'], ['danToc', 'tonGiao'], ['honNhan', 'dienThoai'], ['thuongTru'], ['tamTru'], ['mangThai'], ['email'], ['doanDang', 'nvqs'], ['khanCap'], ['quanHe', 'sdtKhanCap'], ['diaChiLienLac'], ['ngayNhanViec'], ['nguon'], ['luong']];
var HV_LEVELS = ['Trung học', 'Cao đẳng', 'Đại học', 'Thạc Sĩ', 'Tiến Sĩ', 'Khác'];
var HV_COLS = [['truong', 'Tên trường', 100], ['nam', 'Năm tốt nghiệp', 4], ['chuyenNganh', 'Chuyên ngành', 100], ['bangCap', 'Bằng cấp', 80], ['heDaoTao', 'Hệ đào tạo', 60]];
var TABLES = {
  khoaHoc: { title: 'IV. CÁC KHÓA ĐÀO TẠO KHÁC', rows: 4, maxRows: 8, cols: [['truong', 'Tên trường / trung tâm', 'text', 100], ['noiDung', 'Nội dung khóa học', 'text', 150], ['tu', 'Từ', 'month', 7], ['den', 'Đến', 'month', 7], ['tt', 'Trạng thái', 'tt', 10]] },
  ngoaiNgu: { title: 'V. CHỨNG CHỈ NGOẠI NGỮ', rows: 3, maxRows: 6, cols: [['ngoaiNgu', 'Ngoại ngữ', 'text', 60], ['chungChi', 'Chứng chỉ / văn bằng', 'text', 100], ['nam', 'Năm đạt chứng chỉ / văn bằng', 'year', 4]] },
  kinhNghiem: { title: 'VI. KINH NGHIỆM LÀM VIỆC (liệt kê từ gần đây nhất về trước)', rows: 5, maxRows: 10, cols: [['tu', 'Từ (tháng/năm)', 'month', 7], ['den', 'Đến (tháng/năm)', 'month', 7], ['congTy', 'Tên Công ty - Địa điểm, Người tham khảo, chức vụ, SĐT', 'text', 250], ['chucDanh', 'Chức danh công việc', 'text', 100], ['lyDo', 'Lý do thôi việc', 'text', 150]] }
};
var HR_STATUS = ['Mới nộp', 'Đã xem', 'Đã liên hệ', 'Đã nhận việc', 'Không tiếp tục'];
var COMMIT_TEXT = ['Tôi cam đoan những thông tin cung cấp trên đây là chính xác. Tôi chấp nhận việc Công ty xác minh những thông tin trên và cam kết không kiện tổ chức hoặc những cá nhân cung cấp thông tin cho Công ty. Nếu các thông tin trên không đúng sự thật thì tôi chấp nhận việc Công ty chấm dứt HĐLĐ trước thời hạn mà không cần báo trước, đồng thời bồi thường thiệt hại cho Công ty (nếu có).', 'Tôi cam kết bảo mật thông tin của hệ thống Trường Việt Mỹ - VA Schools.', 'Tôi đồng thuận cho VA Schools sử dụng các thông tin cá nhân do tôi cung cấp để phục vụ công tác tuyển dụng, quản lý nhân sự và các nghiệp vụ liên quan của Phòng Hành chính - Nhân sự theo quy định.'];
