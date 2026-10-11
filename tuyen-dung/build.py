#!/usr/bin/env python3
"""Tạo Index.html (bản triển khai) từ src/Index.source.html.
Phần JavaScript chính được mã hoá base64 để Apps Script không thể làm sai lệch
(ví dụ các ký hiệu $', $&, $$ hoặc dấu backtick)."""
import base64, re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'src', 'Index.source.html'), encoding='utf-8').read()
m = re.search(r'<script id="main-js">\n(.*)\n</script>\s*</body>', src, re.S)
if not m:
    sys.exit('Không tìm thấy <script id="main-js"> trong file nguồn')
js = m.group(1)
b64 = base64.b64encode(js.encode('utf-8')).decode('ascii')
wrapped = '\n'.join(b64[i:i + 120] for i in range(0, len(b64), 120))
loader = '''<script type="text/plain" id="hr-payload">
%s
</script>
<script>
(function(){
  try{
    var t=document.getElementById('hr-payload').textContent.replace(/\\s+/g,'');
    var bin=atob(t),bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    var js=new TextDecoder('utf-8').decode(bytes);
    window.__JS=js;
    var s=document.createElement('script');s.text=js;document.body.appendChild(s);
  }catch(e){window.__errs.push('Loader: '+(e&&e.message));bootFail();}
})();
</script>
</body>''' % wrapped
out = src[:m.start()] + loader + src[m.end():].replace('</body>', '', 1)
open(os.path.join(here, 'Index.html'), 'w', encoding='utf-8').write(out)
print('OK Index.html', len(out), 'ký tự')
