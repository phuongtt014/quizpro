#!/usr/bin/env python3
"""Chèn src/onboarding.js vào src/Index.source.html (giữa MR... ONB-BEGIN / ONB-END)."""
import re,os
d=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b=open(d+'/src/onboarding.js',encoding='utf-8').read().strip()
p=d+'/src/Index.source.html';s=open(p,encoding='utf-8').read()
s=re.sub(r'/\*ONB-BEGIN\*/.*?/\*ONB-END\*/',lambda m:'/*ONB-BEGIN*/\n'+b+'\n/*ONB-END*/',s,flags=re.S)
open(p,'w',encoding='utf-8').write(s);print('ok')
