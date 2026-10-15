#!/usr/bin/env python3
"""Chèn src/mailrender.js vào Code.gs và src/Index.source.html (giữa cặp dấu MR-BEGIN / MR-END)."""
import re,sys
d=__file__.rsplit('/',2)[0]
mr=open(d+'/src/mailrender.js',encoding='utf-8').read().strip()
for f in ['Code.gs','src/Index.source.html']:
    p=d+'/'+f;s=open(p,encoding='utf-8').read()
    blk='/*MR-BEGIN*/\n'+mr+'\n/*MR-END*/'
    if '/*MR-BEGIN*/' in s: s=re.sub(r'/\*MR-BEGIN\*/.*?/\*MR-END\*/',lambda m:blk,s,flags=re.S)
    else: print('thiếu dấu trong',f);continue
    open(p,'w',encoding='utf-8').write(s);print('ok',f)
