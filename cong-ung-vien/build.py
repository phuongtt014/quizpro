#!/usr/bin/env python3
"""Tạo Index.html (bản triển khai) từ src/Index.source.html: chèn logo, lược đồ biểu mẫu và mã hoá base64 phần JavaScript."""
import base64, re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'src', 'Index.source.html'), encoding='utf-8').read()
schema = open(os.path.join(here, 'src', 'schema.js'), encoding='utf-8').read().strip()
src = re.sub(r'/\*SCHEMA-BEGIN\*/.*?/\*SCHEMA-END\*/', lambda m: '/*SCHEMA-BEGIN*/\n' + schema + '\n/*SCHEMA-END*/', src, flags=re.S)
open(os.path.join(here, 'src', 'Index.source.html'), 'w', encoding='utf-8').write(src)  # giữ nguồn đồng bộ lược đồ
code = open(os.path.join(here, 'Code.gs'), encoding='utf-8').read()
code = re.sub(r'/\*SCHEMA-BEGIN\*/.*?/\*SCHEMA-END\*/', lambda m: '/*SCHEMA-BEGIN*/\n' + schema + '\n/*SCHEMA-END*/', code, flags=re.S)
open(os.path.join(here, 'Code.gs'), 'w', encoding='utf-8').write(code)
open(os.path.join(here, 'Code-gs.txt'), 'w', encoding='utf-8').write(code)
logo = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(here, 'src', 'logo.png'), 'rb').read()).decode('ascii')
m = re.search(r'<script id="main-js">\n(.*)\n</script>\s*</body>', src, re.S)
if not m: sys.exit('Không tìm thấy <script id="main-js">')
js = m.group(1).replace('__LOGO_DATAURL__', logo)
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
    var s=document.createElement('script');s.text=new TextDecoder('utf-8').decode(bytes);document.body.appendChild(s);
  }catch(e){window.__errs.push('Loader: '+(e&&e.message));bootFail();}
})();
</script>
</body>''' % wrapped
out = src[:m.start()] + loader + src[m.end():].replace('</body>', '', 1)
open(os.path.join(here, 'Index.html'), 'w', encoding='utf-8').write(out)
print('OK Index.html', len(out), 'ký tự')
