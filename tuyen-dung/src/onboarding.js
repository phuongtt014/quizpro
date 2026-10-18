/* ===================== HỒ SƠ NHẬN VIỆC (BM.11) · BÀN GIAO CHO C&B ===================== */
const ONB_DEF_ITEMS=[
 ['Sơ yếu lý lịch','Có dán ảnh 4x6, xác nhận bởi chính quyền địa phương nơi cư trú (Thời hạn chứng thực không quá 06 tháng).','01 Bản sao công chứng'],
 ['Giấy khám sức khỏe','Có phân loại đủ điều kiện sức khỏe làm việc do cơ sở y tế cấp Xã/Phường trở lên cấp (thời hạn không quá 06 tháng).','01 Bản gốc'],
 ['Căn cước công dân','Bản sao có chứng thực từ bản chính (Thời hạn chứng thực không quá 06 tháng).','02 Bản sao công chứng'],
 ['Thông tin cư trú VNeID','Bản chụp hoặc bản in thông tin cư trú trích xuất từ ứng dụng VNeID.','01 Bản photo'],
 ['Văn bằng, Chứng chỉ','Bằng tốt nghiệp, bảng điểm hoặc các chứng chỉ chuyên môn liên quan theo vị trí chức danh (Bản sao công chứng không quá 06 tháng).','01 Bản sao công chứng'],
 ['Lý lịch tư pháp hoặc Giấy Xác nhận Hạnh kiểm','Phiếu Lý lịch tư pháp số 1 hoặc Giấy xác nhận hạnh kiểm do cơ quan Công an địa phương cấp.','01 Bản điện tử hoặc 01 Bản gốc'],
 ['Thông tin ứng viên','Ứng viên điền đầy đủ thông tin và ký rõ họ và tên (Mẫu BM.10/HN.QT.01).','01 Bản gốc'],
 ['Thông tin tài khoản ngân hàng','Hình ảnh hoặc bản photo thông tin tài khoản ngân hàng cá nhân. Yêu cầu rõ: Chủ TK, STK, Tên ngân hàng & Chi nhánh.','01 Bản photo'],
 ['Ảnh thẻ nhân sự','File ảnh thẻ kích thước 4x6 (Chụp rõ mặt, phông nền trắng theo đúng tiêu chuẩn làm hộ chiếu quốc tế).','01 File ảnh']];
const onbItemsFrom=arr=>arr.map((x,i)=>({id:'i'+(i+1),name:x[0],req:x[1]||'',qty:x[2]||''}));
function defaultOnbTpl(){return{id:'onb_default',code:'BM.11/HN.QT.01',issue:'01',effective:'2026-09-21',title:'PHIẾU TIẾP NHẬN HỒ SƠ NHÂN SỰ',sub:'(Áp dụng cho nhân sự mới khi gia nhập Hệ thống)',note:'Bản đầu tiên',createdAt:Date.now(),by:'',items:onbItemsFrom(ONB_DEF_ITEMS)}}
const onbTplList=()=>[...DB.lib.onbTpls].sort((a,b)=>(a.effective||'').localeCompare(b.effective||''));
function onbTplAt(at){const vs=onbTplList();if(!vs.length)return defaultOnbTpl();const d=new Date(at||Date.now()).toISOString().slice(0,10);let cur=vs[0];vs.forEach(v=>{if((v.effective||'')<=d)cur=v});return cur}
const onbCfg=()=>Object.assign({handoverDays:9,base:'start',sat:0,collectDays:7,portalUrl:'',defaultCnb:''},DB.cfg.onb||{});
const cnbUsers=()=>DB.cfg.users.filter(u=>roleHas(u,'onb.confirm')).sort((x,y)=>(x.roleId==='admin')-(y.roleId==='admin'));
const recUsers=()=>DB.cfg.users.filter(u=>roleHas(u,'onb.receive')).sort((x,y)=>(x.roleId==='admin')-(y.roleId==='admin'));
const hoList=()=>DB.lib.handovers;
function addWork(dIso,n,sat){let d=new Date(dIso+'T00:00:00Z'),k=0;while(k<n){d=new Date(d.getTime()+dayMs);const w=d.getUTCDay();if(w===0||(w===6&&!sat))continue;k++}return d.toISOString().slice(0,10)}
const onbStartDate=c=>c.offer&&c.offer.startDate?String(c.offer.startDate).slice(0,10):(c.hiredAt?new Date(c.hiredAt).toISOString().slice(0,10):'');
const onbFirstRecv=c=>Object.values((c.onb&&c.onb.items)||{}).filter(x=>x.got&&x.at).map(x=>x.at).sort()[0]||'';
function onbDue(c){const g=onbCfg(),b=g.base==='recv'?onbFirstRecv(c):onbStartDate(c);return b?addWork(b,+g.handoverDays||9,+g.sat):''}
function onbCollectDue(c){const s=onbStartDate(c);return s?new Date(new Date(s+'T00:00:00Z').getTime()+(+onbCfg().collectDays||7)*dayMs).toISOString().slice(0,10):''}
const onbEligible=c=>c.stage!=='rejected'&&((c.offer&&c.offer.status==='Chấp nhận')||c.stage==='hired');
const onbCands=()=>DB.cands.filter(c=>onbEligible(c)||c.onb);
function onbStart(c,owner,cnb){
  if(c.onb)return c.onb;const t=onbTplAt(Date.now());
  c.onb={tplId:t.id,snap:{code:t.code,issue:t.issue,effective:t.effective,title:t.title,sub:t.sub,items:t.items.map(x=>({...x}))},items:{},owner:owner||c.owner||(me().roleId==='admin'?'':me().id),cnb:cnb||onbCfg().defaultCnb||'',note:'',createdAt:Date.now()};
  return c.onb}
const onbItems=c=>c.onb?c.onb.snap.items:onbTplAt(Date.now()).items;
function itemHo(candId,itemId){let best=null;hoList().forEach(b=>{if((b.lines||[]).some(l=>l.candId===candId&&l.items.includes(itemId))&&(!best||b.createdAt>best.createdAt))best=b});return best}
const itemHs=(c,id)=>{const b=itemHo(c.id,id);return b?b.status:''};
function onbStats(c){
  const o=c.onb,items=onbItems(c);let got=0,done=0,pend=0,rej=0,avail=0;
  items.forEach(it=>{const g=!!(o&&o.items[it.id]&&o.items[it.id].got),hs=itemHs(c,it.id);if(g)got++;if(g&&hs==='dong_y')done++;else if(hs==='cho')pend++;else if(hs==='tu_choi')rej++;if(g&&(hs===''||hs==='tu_choi'))avail++});
  return{n:items.length,got,done,pend,rej,avail,redo:hoList().filter(b=>b.status==='tu_choi'&&b.lines.some(l=>l.candId===c.id)).length}}
function onbState(c){
  const s=onbStats(c);if(!c.onb||s.got===0)return['Chưa nhận','b-gray','new'];
  if(s.rej>0)return['Bị C&B từ chối – cần làm lại','b-bad','rej'];if(s.pend>0)return['Chờ C&B xác nhận','b-info','pend'];
  if(s.done===s.n)return['Hoàn tất','b-ok','done'];if(s.got<s.n)return['Đang thu hồ sơ','b-warn','collect'];return['Chờ bàn giao','b-vio','wait']}
function onbFlags(c){const s=onbStats(c),t=iso(),due=onbDue(c),cd=onbCollectDue(c);return{collectLate:!!(s.got<s.n&&cd&&t>cd),handLate:!!(s.got>s.done&&due&&t>due),due,cd,s}}
const ownerName=c=>c.onb&&c.onb.owner?userName(c.onb.owner):'—';
const cnbName=c=>c.onb&&c.onb.cnb?userName(c.onb.cnb):'—';
const isLate=c=>{const f=onbFlags(c);return f.collectLate||f.handLate};
/* ---- mốc hoàn thành để chấm KPI ---- */
function onbCollectedAt(c){const o=c.onb;if(!o)return'';const its=onbItems(c);if(!its.every(i=>o.items[i.id]&&o.items[i.id].got))return'';return its.map(i=>o.items[i.id].at||'').sort().pop()}
function onbHandedAt(c){const its=onbItems(c);let mx='';for(const it of its){const b=itemHo(c.id,it.id);if(!b||b.status!=='dong_y')return'';if((b.date||'')>mx)mx=b.date}return mx}
/* ---- thao tác ---- */
const canRecv=()=>can('onb.receive'),canCnb=()=>can('onb.confirm');
function seqCode(prefix,list){const ym=iso().slice(2,4)+iso().slice(5,7);const n=list.filter(x=>(x.code||'').startsWith(`${prefix}-${ym}-`)).length+1;return`${prefix}-${ym}-${String(n).padStart(3,'0')}`}
const ONB_ACTS={
 openOnb:id=>{if(!can('onb.view'))return;openDrawer(()=>onbDrawer(id))},
 onbStartBtn:id=>{const c=DB.cands.find(x=>x.id===id);if(!c||!canRecv())return;const ow=$('#onb_pick_o')?$('#onb_pick_o').value:'',cn=$('#onb_pick_c')?$('#onb_pick_c').value:'';if(!ow){toast('Chọn nhân viên tuyển dụng chịu trách nhiệm thu hồ sơ','err');return}
   onbStart(c,ow,cn);log(c,`Bắt đầu tiếp nhận hồ sơ nhận việc (BM.11) – Tuyển dụng phụ trách: ${userName(ow)}${cn?` · C&B phụ trách: ${userName(cn)}`:''}`);commit()},
 onbTick:(id,el)=>{const[cid,iid]=id.split('~'),c=DB.cands.find(x=>x.id===cid);if(!c||!canRecv()){render();return}
   const o=onbStart(c),it=o.snap.items.find(x=>x.id===iid),on=el.checked;
   if(!on&&['cho','dong_y'].includes(itemHs(c,iid))){toast('Hồ sơ đã nằm trong một đợt bàn giao – không thể bỏ tích','err');render();return}
   if(on)o.items[iid]={got:1,at:iso(),by:me().id};else delete o.items[iid];
   log(c,`Tiếp nhận hồ sơ: ${it.name} – ${on?'ĐÃ NHẬN':'bỏ nhận'}`);commit()},
 onbNote:(id,el)=>{const c=DB.cands.find(x=>x.id===id);if(!c||!canRecv())return;onbStart(c).note=el.value;save()},
 onbOwner:(id,el)=>{const c=DB.cands.find(x=>x.id===id);if(!c||!canRecv()||!c.onb)return;c.onb.owner=el.value;log(c,'Đổi nhân viên tuyển dụng phụ trách thu hồ sơ → '+userName(el.value));commit()},
 onbCnb:(id,el)=>{const c=DB.cands.find(x=>x.id===id);if(!c||!canRecv()||!c.onb)return;const busy=hoList().some(b=>b.status==='cho'&&b.lines.some(l=>l.candId===c.id));if(busy){toast('Đang có đợt bàn giao chờ C&B xác nhận – chưa đổi được C&B phụ trách','err');render();return}c.onb.cnb=el.value;log(c,'Đổi nhân viên C&B phụ trách nhận bàn giao → '+(el.value?userName(el.value):'(chưa chọn)'));commit()},
 onbPrint:id=>{const c=DB.cands.find(x=>x.id===id);if(c)printHtml(onbDocHTML(c),'BM.11 – '+c.v.name)},
 onbF:id=>{ui.obf=id;render()},obTab:id=>{ui.ob=id;render()},
 hoNew:id=>hoModal(id?{candId:id}:null),
 hoRedo:id=>{const b=hoList().find(x=>x.id===id);if(b)hoModal({redo:b})},
 hoPrint:id=>{const b=hoList().find(x=>x.id===id);if(b)printHtml(hoDocHTML(b),'Biên bản bàn giao '+b.code)},
 hoChk:(id,el)=>{const[bid,key]=[id.split('#')[0],id.split('#')[1]];ui._hoChk=ui._hoChk||{};(ui._hoChk[bid]=ui._hoChk[bid]||{})[key]=el.checked;render()},
 hoOk:id=>{const b=hoList().find(x=>x.id===id);if(!b||!canCnb()||b.status!=='cho')return;
   if(!hoGuard(b))return;const keys=hoKeys(b),ck=(ui._hoChk||{})[id]||{};const miss=keys.filter(k=>!ck[k]);
   if(miss.length){toast(`Còn ${miss.length} hồ sơ chưa đối chiếu – hãy tích đủ hoặc chọn "Từ chối"`,'err');return}
   confirmBox(`Xác nhận đã <b>đối chiếu và nhận đủ ${keys.length} hồ sơ</b> của đợt ${esc(b.code)}? Sau khi xác nhận, bạn chịu trách nhiệm về hồ sơ đã nhận.`,()=>{
     b.status='dong_y';b.decidedAt=Date.now();b.decidedBy=me().id;b.mismatch=[];hoLog(b,`C&B ${me().name} đã XÁC NHẬN nhận bàn giao (${b.code})`);delete (ui._hoChk||{})[id];commit();toast('Đã xác nhận nhận bàn giao','ok')},'Xác nhận đã nhận')},
 hoNo:id=>{const b=hoList().find(x=>x.id===id);if(!b||!canCnb()||b.status!=='cho'||!hoGuard(b))return;
   const keys=hoKeys(b),ck=(ui._hoChk||{})[id]||{},miss=keys.filter(k=>!ck[k]);
   modal({title:'Từ chối nhận bàn giao '+b.code,html:`<p>Hãy ghi rõ lý do để nhân viên tuyển dụng kiểm tra lại và bàn giao lại. ${miss.length?`Có <b>${miss.length}</b> hồ sơ chưa tích sẽ được ghi nhận là <b>không khớp</b>.`:''}</p><label class="f">Lý do từ chối <i>*</i></label><textarea id="ho_why" style="min-height:110px" placeholder="VD: Thiếu bản gốc giấy khám sức khỏe; CCCD chưa công chứng…"></textarea>`,
     buttons:[modalCancel,{label:'Từ chối',cls:'bad',icon:'x',fn:()=>{const w=$('#ho_why').value.trim();if(!w){toast('Vui lòng nhập lý do','err');return false}
       b.status='tu_choi';b.decidedAt=Date.now();b.decidedBy=me().id;b.reason=w;b.mismatch=miss;hoLog(b,`C&B ${me().name} TỪ CHỐI nhận bàn giao (${b.code}): ${w}`);delete (ui._hoChk||{})[id];commit();toast('Đã từ chối – nhân viên tuyển dụng sẽ làm lại bàn giao','ok')}}]})},
 hoF:id=>{ui.hof=id;render()},kpiP:id=>{ui.obp=id;render()}
};
Object.entries(ONB_ACTS).forEach(([k,f])=>A[k]=f);
const hoKeys=b=>b.lines.flatMap(l=>l.items.map(i=>l.candId+'|'+i));
function hoGuard(b){if(me().roleId!=='admin'&&b.toId&&b.toId!==me().id){toast('Đợt bàn giao này gửi cho '+userName(b.toId),'err');return false}return true}
function hoLog(b,text){b.lines.forEach(l=>{const c=DB.cands.find(x=>x.id===l.candId);if(c)log(c,text)})}
/* ---- tạo đợt bàn giao ---- */
function hoModal(pre){
  if(!canRecv())return;
  const redo=pre&&pre.redo;
  const rec=cnbUsers();
  if(!rec.length){toast('Chưa có người dùng nào có quyền nhận bàn giao (C&B). Hãy gán vai trò ở Thiết lập.','err');return}
  const base=onbCands().filter(c=>c.onb&&onbStats(c).avail>0&&(!pre||!pre.candId||c.id===pre.candId)&&(!redo||redo.lines.some(l=>l.candId===c.id)));
  const first=(pre&&pre.candId&&(DB.cands.find(x=>x.id===pre.candId).onb||{}).cnb)||(redo&&redo.toId)||rec[0].id;
  const pool=base;
  if(!pool.length){toast('Không có hồ sơ nào đã nhận và chưa bàn giao','err');return}
  const pick=(c,id)=>{const hs=itemHs(c,id),g=c.onb.items[id]&&c.onb.items[id].got;return g&&(hs===''||hs==='tu_choi')};
  modal({title:redo?`Làm lại bàn giao (thay đợt ${redo.code})`:'Tạo đợt bàn giao hồ sơ cho C&B',wide:true,html:`
    ${redo?`<div class="alert warn" style="margin-bottom:12px">${ic('alert')}<div><b>C&B đã từ chối:</b> ${esc(redo.reason||'')}<br>Hãy <b>kiểm tra lại hồ sơ</b> theo lý do trên rồi bàn giao lại.</div></div>`:''}
    <label class="f">Nhân viên C&B nhận bàn giao <span class="muted small">(người chịu trách nhiệm kiểm tra khi nhận)</span></label><select id="ho_to">${rec.map(u=>`<option value="${u.id}" ${first===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select>
    <div id="ho_note_cnb" class="small muted" style="margin-top:6px"></div>
    <div style="margin-top:12px">${pool.map(c=>`<div class="card ho_card" data-c="${c.id}" data-cnb="${esc(c.onb.cnb||'')}" style="margin-bottom:10px;padding:12px"><b>${esc(c.v.name)}</b> <span class="muted small">· ${esc(posOf(c))} · nhận việc ${fmtD(onbStartDate(c))}${c.onb.cnb?` · C&B phụ trách: ${esc(userName(c.onb.cnb))}`:''}</span>
      ${c.onb.snap.items.filter(it=>pick(c,it.id)).map(it=>`<label style="display:flex;gap:8px;align-items:center;margin:5px 0"><input type="checkbox" class="chk ho_pick" data-c="${c.id}" data-i="${it.id}" checked> ${esc(it.name)} <span class="muted small">(${esc(it.qty)})</span></label>`).join('')}</div>`).join('')}</div>
    <label class="f">Ghi chú (tuỳ chọn)</label><input type="text" id="ho_note" placeholder="VD: Bàn giao đợt 1, còn thiếu giấy khám sức khỏe">`,
    after:()=>{const sync=()=>{const to=$('#ho_to').value;let hid=0;qa('.ho_card').forEach(cd=>{const bad=cd.dataset.cnb&&cd.dataset.cnb!==to;cd.style.display=bad?'none':'';qa('.ho_pick',cd).forEach(x=>{x.disabled=bad;if(bad)x.checked=false});if(bad)hid++});$('#ho_note_cnb').textContent=hid?`${hid} ứng viên do C&B khác phụ trách nên không hiển thị trong đợt này.`:''};$('#ho_to').addEventListener('change',sync);sync()},
    buttons:[modalCancel,{label:redo?'Bàn giao lại':'Tạo đợt bàn giao',cls:'pri',icon:'check',fn:()=>{
      const sel=qa('.ho_pick').filter(x=>x.checked&&!x.disabled);if(!sel.length){toast('Chọn ít nhất một hồ sơ','err');return false}
      const lines={};sel.forEach(x=>{(lines[x.dataset.c]=lines[x.dataset.c]||[]).push(x.dataset.i)});
      const b={id:uid('bg_'),code:seqCode('BG',hoList()),createdAt:Date.now(),date:iso(),by:me().id,toId:$('#ho_to').value,lines:Object.entries(lines).map(([candId,items])=>({candId,items})),note:$('#ho_note').value.trim(),status:'cho',attempt:redo?(redo.attempt||1)+1:1};
      if(redo)b.redoOf=redo.id;hoList().push(b);
      b.lines.forEach(l=>{const c=DB.cands.find(x=>x.id===l.candId);if(c&&c.onb&&!c.onb.cnb)c.onb.cnb=b.toId});
      b.lines.forEach(l=>{const c=DB.cands.find(x=>x.id===l.candId);log(c,`${redo?'Bàn giao lại':'Bàn giao'} hồ sơ cho C&B ${userName(b.toId)} (${b.code}): ${l.items.map(i=>c.onb.snap.items.find(x=>x.id===i).name).join(', ')}`)});
      ui.tab='onb';ui.ob='ho';closeDrawer();commit();toast('Đã tạo đợt bàn giao – chờ C&B xác nhận','ok')}}]});
}
/* ---- màn hình ---- */
const BG_ST={cho:['Chờ C&B xác nhận','b-info'],dong_y:['C&B đã nhận','b-ok'],tu_choi:['Bị từ chối','b-bad']};
function onbCounts(){const l=onbCands().filter(c=>c.onb||onbEligible(c));return{late:l.filter(isLate).length,pendMine:hoList().filter(b=>b.status==='cho'&&(me().roleId==='admin'||b.toId===me().id)).length,rejMine:hoList().filter(b=>b.status==='tu_choi'&&!hoList().some(x=>x.redoOf===b.id)).length}}
function vOnb(){
  const sub=ui.ob||'list',cn=onbCounts();
  const tabs=[['list','Tiếp nhận hồ sơ',cn.late?`${cn.late} quá hạn`:''],['ho','Bàn giao cho C&B',cn.pendMine?`${cn.pendMine} chờ xác nhận`:''],...(can('onb.report')?[['kpi','Báo cáo & đánh giá','']]:[])];
  if(!tabs.find(t=>t[0]===sub))ui.ob='list';
  const act=can('data.export')||can('onb.report')?`<button class="btn" data-act="exp" data-id="${sub==='ho'?'onbho':sub==='kpi'?'onbkpi':'onb'}">${ic('download')}Xuất CSV</button>`:'';
  const body=sub==='ho'?onbHoView():sub==='kpi'&&can('onb.report')?onbKpiView():onbListView();
  return pageH('Hồ sơ nhận việc','Theo dõi thu hồ sơ nhân sự mới (BM.11), bàn giao cho C&B và đánh giá tiến độ.',act+(sub==='ho'&&canRecv()?`<button class="btn pri" data-act="hoNew" data-id="">${ic('plus')}Tạo đợt bàn giao</button>`:''))+
   `<div class="row" style="margin-bottom:14px"><div class="seg">${tabs.map(t=>`<button class="${(ui.ob||'list')===t[0]?'on':''}" data-act="obTab" data-id="${t[0]}">${t[1]}${t[2]?`<span class="n">${t[2]}</span>`:''}</button>`).join('')}</div></div>${body}`}
function onbRows(){
  const q=(ui.obq||'').toLowerCase(),f=ui.obf||'all';
  return onbCands().filter(c=>{const st=onbState(c)[2];
    if(f==='late'&&!isLate(c))return false;if(f!=='all'&&f!=='late'&&st!==f)return false;
    return!q||(c.v.name+posOf(c)+ownerName(c)+cnbName(c)).toLowerCase().includes(q)}).sort((a,b)=>(onbStartDate(a)||'9').localeCompare(onbStartDate(b)||'9'))}
function onbListView(){
  const rows=onbRows(),fl=[['all','Tất cả'],['collect','Đang thu'],['wait','Chờ bàn giao'],['pend','Chờ C&B'],['rej','Bị từ chối'],['done','Hoàn tất'],['late','Quá hạn']];
  return`<div class="row" style="margin-bottom:12px"><div class="seg">${fl.map(t=>`<button class="${(ui.obf||'all')===t[0]?'on':''}" data-act="onbF" data-id="${t[0]}">${t[1]}</button>`).join('')}</div><div class="grow"></div>${searchBox('obq',ui.obq||'','Tìm ứng viên, vị trí, người phụ trách…')}</div>
  <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Ứng viên</th><th>Vị trí</th><th>Ngày nhận việc</th><th>Tuyển dụng phụ trách</th><th>C&B phụ trách</th><th>Đã thu</th><th>C&B đã nhận</th><th>Hạn thu đủ</th><th>Hạn bàn giao</th><th>Làm lại</th><th>Trạng thái</th></tr></thead><tbody>
  ${rows.map(c=>{const s=onbStats(c),f=onbFlags(c),st=onbState(c);return`<tr class="click" data-act="openOnb" data-id="${c.id}"><td><b>${esc(c.v.name)}</b></td><td>${esc(posOf(c))}</td><td>${fmtD(onbStartDate(c))}</td><td>${esc(ownerName(c))}</td><td>${esc(cnbName(c))}</td>
    <td>${c.onb?`<b>${s.got}</b>/${s.n}`:'—'}</td><td>${c.onb?`<b>${s.done}</b>/${s.n}`:'—'}</td><td>${f.cd?fmtD(f.cd):'—'}${f.collectLate?` ${badge('Quá hạn','b-bad')}`:''}</td><td>${f.due?fmtD(f.due):'—'}${f.handLate?` ${badge('Quá hạn','b-bad')}`:''}</td><td>${s.redo?badge(s.redo+' lần','b-bad'):'—'}</td><td>${badge(st[0],st[1])}</td></tr>`}).join('')||`<tr><td colspan="11"><div class="empty">Chưa có ứng viên nào chấp nhận thư mời.</div></td></tr>`}</tbody></table></div></div>
  <p class="muted small" style="margin-top:10px">Danh sách gồm ứng viên đã <b>chấp nhận thư mời</b> hoặc <b>đã nhận việc</b>. Hạn thu đủ = ngày nhận việc + ${onbCfg().collectDays} ngày; hạn bàn giao = ${onbCfg().handoverDays} ngày làm việc kể từ ${onbCfg().base==='recv'?'ngày nhận hồ sơ đầu tiên':'ngày nhận việc'} (thay đổi ở Thiết lập → Hồ sơ nhận việc).</p>`}
function onbDrawer(id){
  const c=DB.cands.find(x=>x.id===id);if(!c)return'';
  const o=c.onb,items=onbItems(c),s=onbStats(c),f=onbFlags(c),st=onbState(c),ed=canRecv();
  const owners=recUsers(),cnbs=cnbUsers();
  const hist=hoList().filter(b=>b.lines.some(l=>l.candId===c.id)).sort((a,b)=>b.createdAt-a.createdAt);
  return`<div class="dr-h"><div><h2>${esc(c.v.name)}</h2><div class="muted">${esc(posOf(c))} · Nhận việc ${fmtD(onbStartDate(c))}</div></div><button class="btn ghost" data-act="dclose">${ic('x')}</button></div>
  <div class="dr-b"><div class="row" style="margin-bottom:12px">${badge(st[0],st[1])}${f.collectLate?badge('Thu hồ sơ quá hạn','b-bad'):''}${f.handLate?badge('Bàn giao quá hạn','b-bad'):''}${s.redo?badge('Làm lại bàn giao: '+s.redo+' lần','b-bad'):''}</div>
  ${!o?`<div class="card sec"><p>Chưa bắt đầu tiếp nhận hồ sơ nhận việc cho ứng viên này.</p>${ed?`<div class="fgrid" style="margin:10px 0"><div><label class="f">Nhân viên tuyển dụng phụ trách thu hồ sơ <i>*</i></label><select id="onb_pick_o"><option value=""></option>${owners.map(u=>`<option value="${u.id}" ${(c.owner||(me().roleId==='admin'?'':me().id))===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div><div><label class="f">Nhân viên C&B phụ trách nhận bàn giao</label><select id="onb_pick_c"><option value=""></option>${cnbs.map(u=>`<option value="${u.id}" ${onbCfg().defaultCnb===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div></div><button class="btn pri" data-act="onbStartBtn" data-id="${c.id}">Bắt đầu tiếp nhận (theo ${esc(onbTplAt(Date.now()).code)})</button>`:''}</div>`:`
  <div class="card sec"><div class="sec-h"><h3>Thông tin</h3></div><dl class="kv"><dt>Tuyển dụng phụ trách<br><span class="muted small">chịu trách nhiệm thu hồ sơ bước đầu từ ứng viên</span></dt><dd>${ed?`<select data-onbo="${c.id}">${owners.map(u=>`<option value="${u.id}" ${o.owner===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}${owners.some(u=>u.id===o.owner)?'':`<option value="${esc(o.owner||'')}" selected>${esc(o.owner?userName(o.owner):'(chưa chọn)')}</option>`}</select>`:esc(o.owner?userName(o.owner):'—')}</dd>
    <dt>C&B phụ trách<br><span class="muted small">chịu trách nhiệm kiểm tra khi nhận bàn giao</span></dt><dd>${ed?`<select data-onbc="${c.id}"><option value=""></option>${cnbs.map(u=>`<option value="${u.id}" ${o.cnb===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select>`:esc(o.cnb?userName(o.cnb):'—')}</dd>
    <dt>Hạn thu đủ hồ sơ</dt><dd>${f.cd?fmtD(f.cd):'—'}</dd><dt>Hạn bàn giao C&B</dt><dd>${f.due?fmtD(f.due):'—'}</dd><dt>Biểu mẫu</dt><dd>${esc(o.snap.code)} · lần BH ${esc(o.snap.issue)}</dd></dl></div>
  <div class="card sec"><div class="sec-h"><h3>Danh mục hồ sơ (${s.got}/${s.n} đã nhận · ${s.done}/${s.n} C&B đã nhận)</h3><button class="btn sm" data-act="onbPrint" data-id="${c.id}">${ic('print')}In BM.11</button></div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:34px">Nhận</th><th>Hồ sơ</th><th>Ngày nhận</th><th>Bàn giao</th></tr></thead><tbody>${items.map((it,i)=>{const r=o.items[it.id],hs=itemHs(c,it.id),b=hs?BG_ST[hs]:null;
      return`<tr><td><input type="checkbox" class="chk" data-act="onbTick" data-id="${c.id}~${it.id}" ${r&&r.got?'checked':''} ${ed?'':'disabled'}></td><td><b>${i+1}. ${esc(it.name)}</b><div class="muted small">${esc(it.req)}</div><div class="small" style="color:var(--brand)">${esc(it.qty)}</div></td><td>${r&&r.got?fmtD(r.at):'—'}${r&&r.by?`<div class="muted small">${esc(userName(r.by))}</div>`:''}</td><td>${b?badge(b[0],b[1]):'<span class="muted">Chưa bàn giao</span>'}</td></tr>`}).join('')}</tbody></table></div>
    <label class="f" style="margin-top:12px">Ghi chú / hẹn ngày bổ sung hồ sơ còn thiếu</label><textarea data-onbn="${c.id}" ${ed?'':'disabled'} placeholder="VD: Hẹn bổ sung giấy khám sức khỏe trước ${fmtD(f.cd)}">${esc(o.note||'')}</textarea>
    <div class="row" style="margin-top:12px">${ed&&s.avail>0?`<button class="btn pri" data-act="hoNew" data-id="${c.id}">${ic('plus')}Bàn giao cho C&B (${s.avail} hồ sơ)</button>`:''}</div></div>
  <div class="card sec"><div class="sec-h"><h3>Các đợt bàn giao</h3></div>${hist.length?hist.map(b=>`<div style="padding:8px 0;border-top:1px solid var(--line)"><b>${esc(b.code)}</b> ${badge(BG_ST[b.status][0],BG_ST[b.status][1])}${b.attempt>1?` ${badge('Lần '+b.attempt,'b-warn')}`:''}<div class="muted small">${fmtD(b.date)} · ${esc(userName(b.by))} → ${esc(userName(b.toId))}${b.reason?` · Lý do từ chối: ${esc(b.reason)}`:''}</div></div>`).join(''):'<span class="muted">Chưa có đợt bàn giao nào.</span>'}</div>`}</div>`}
function onbHoView(){
  const f=ui.hof||'all',l=hoList().filter(b=>f==='all'||b.status===f).sort((a,b)=>b.createdAt-a.createdAt);
  const mine=b=>me().roleId==='admin'||b.toId===me().id;
  const fl=[['all','Tất cả'],['cho','Chờ C&B xác nhận'],['tu_choi','Bị từ chối'],['dong_y','C&B đã nhận']];
  return`<div class="row" style="margin-bottom:12px"><div class="seg">${fl.map(t=>`<button class="${f===t[0]?'on':''}" data-act="hoF" data-id="${t[0]}">${t[1]}</button>`).join('')}</div></div>
  ${l.map(b=>{const st=BG_ST[b.status],keys=hoKeys(b),ck=(ui._hoChk||{})[b.id]||{},canDecide=b.status==='cho'&&canCnb()&&mine(b),redone=hoList().some(x=>x.redoOf===b.id);
    return`<div class="card" style="margin-bottom:14px;padding:16px"><div class="row"><b style="font-size:16px">${esc(b.code)}</b>${badge(st[0],st[1])}${b.attempt>1?badge('Lần '+b.attempt+' (làm lại)','b-warn'):''}<div class="grow"></div><button class="btn sm" data-act="hoPrint" data-id="${b.id}">${ic('print')}In biên bản</button></div>
      <div class="muted small" style="margin:4px 0 10px">Ngày ${fmtD(b.date)} · Giao: <b>${esc(userName(b.by))}</b> → Nhận: <b>${esc(userName(b.toId))}</b>${b.note?` · ${esc(b.note)}`:''}${b.decidedAt?` · Quyết định ${fmtDT(b.decidedAt)} bởi ${esc(userName(b.decidedBy))}`:''}</div>
      ${b.lines.map(l=>{const c=DB.cands.find(x=>x.id===l.candId);return c?`<div style="margin:6px 0"><b>${esc(c.v.name)}</b> <span class="muted small">· ${esc(posOf(c))}</span>${l.items.map(i=>{const it=c.onb.snap.items.find(x=>x.id===i),k=c.id+'|'+i,bad=(b.mismatch||[]).includes(k);
        return`<label style="display:flex;gap:8px;align-items:center;margin:4px 0 4px 14px">${canDecide?`<input type="checkbox" class="chk" data-act="hoChk" data-id="${b.id}#${k}" ${ck[k]?'checked':''}>`:`<span>${b.status==='dong_y'?'✔':bad?'✖':'•'}</span>`}<span style="${bad?'color:var(--bad)':''}">${esc(it?it.name:i)}</span> <span class="muted small">${esc(it?it.qty:'')}</span></label>`}).join('')}</div>`:''}).join('')}
      ${b.status==='tu_choi'?`<div class="alert warn" style="margin-top:10px">${ic('alert')}<div><b>Lý do từ chối:</b> ${esc(b.reason||'')}${(b.mismatch||[]).length?`<br><span class="small">Không khớp: ${(b.mismatch||[]).length} hồ sơ (gạch đỏ ở trên)</span>`:''}</div></div>`:''}
      ${canDecide?`<div class="row" style="margin-top:12px"><span class="small muted">Tích từng hồ sơ sau khi đối chiếu với hồ sơ thực nhận (${keys.filter(k=>ck[k]).length}/${keys.length})</span><div class="grow"></div><button class="btn bad" data-act="hoNo" data-id="${b.id}">Từ chối…</button><button class="btn pri" data-act="hoOk" data-id="${b.id}">${ic('check')}Xác nhận đã nhận đủ</button></div>`:''}
      ${b.status==='tu_choi'&&canRecv()&&!redone?`<div class="row" style="margin-top:12px"><button class="btn pri" data-act="hoRedo" data-id="${b.id}">Kiểm tra lại & làm lại bàn giao</button></div>`:''}${b.status==='tu_choi'&&redone?`<div class="muted small" style="margin-top:8px">Đã được bàn giao lại ở đợt sau.</div>`:''}</div>`}).join('')||'<div class="empty">Chưa có đợt bàn giao nào.</div>'}`}
/* ---- KPI ---- */
function kpiRange(){const p=ui.obp||'month',d=new Date(),y=d.getFullYear(),m=d.getMonth(),pad=n=>String(n).padStart(2,'0'),mk=(a,b)=>[`${a.y}-${pad(a.m+1)}-01`,`${b.y}-${pad(b.m+1)}-01`];
  if(p==='all')return['0000','9999'];if(p==='month')return mk({y,m},{y:m==11?y+1:y,m:(m+1)%12});if(p==='prev')return mk({y:m?y:y-1,m:m?m-1:11},{y,m});
  if(p==='quarter'){const q=Math.floor(m/3)*3;return mk({y,m:q},{y:q+3>11?y+1:y,m:(q+3)%12})}return[`${y}-01-01`,`${y+1}-01-01`]}
function onbKpi(){
  const[a,b]=kpiRange(),t=iso(),g=new Map();
  onbCands().filter(c=>c.onb).forEach(c=>{const sd=onbStartDate(c);if(sd&&(sd<a||sd>=b))return;
    const k=c.onb.owner||'—',r=g.get(k)||{owner:k,n:0,full:0,fullOk:0,fullLate:0,miss:0,hOk:0,hLate:0,hPend:0,rej:0,days:[],batches:0,redo:0,cases:[]};g.set(k,r);
    const s=onbStats(c),cd=onbCollectDue(c),due=onbDue(c),ca=onbCollectedAt(c),ha=onbHandedAt(c);r.n++;r.cases.push(c);
    if(ca){r.full++;if(!cd||ca<=cd)r.fullOk++;else r.fullLate++;const sd2=onbStartDate(c);if(sd2)r.days.push(Math.round((new Date(ca)-new Date(sd2))/dayMs))}else if(cd&&t>cd)r.miss++;
    if(ha){if(!due||ha<=due)r.hOk++;else r.hLate++}else if(s.got>s.done&&due&&t>due)r.hPend++;});
  hoList().forEach(x=>{new Set(x.lines.map(l=>{const c=DB.cands.find(y=>y.id===l.candId);return c&&c.onb?c.onb.owner:null})).forEach(o=>{const r=o!=null&&g.get(o);if(!r)return;r.batches++;if(x.status==='tu_choi')r.redo++})});
  return[...g.values()].sort((x,y)=>y.n-x.n)}
function cnbKpi(){const[a,b]=kpiRange(),m=new Map();
  hoList().forEach(x=>{const d=new Date(x.createdAt).toISOString().slice(0,10);if(d<a||d>=b)return;const k=x.toId||'—',r=m.get(k)||{u:k,n:0,ok:0,no:0,pend:0,hrs:[]};m.set(k,r);r.n++;if(x.status==='dong_y')r.ok++;else if(x.status==='tu_choi')r.no++;else r.pend++;if(x.decidedAt)r.hrs.push((x.decidedAt-x.createdAt)/36e5)});
  return[...m.values()].sort((x,y)=>y.n-x.n)}
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
function onbKpiView(){
  const rows=onbKpi(),P=[['month','Tháng này'],['prev','Tháng trước'],['quarter','Quý này'],['year','Năm nay'],['all','Tất cả']],cur=ui.obp||'month';
  const tot=rows.reduce((s,r)=>{['n','full','fullOk','fullLate','miss','hOk','hLate','hPend','batches','redo'].forEach(k=>s[k]=(s[k]||0)+r[k]);return s},{});
  const late=onbCands().filter(c=>c.onb&&isLate(c));
  return`<div class="row" style="margin-bottom:12px"><div class="seg">${P.map(p=>`<button class="${cur===p[0]?'on':''}" data-act="kpiP" data-id="${p[0]}">${p[1]}</button>`).join('')}</div><span class="muted small">Tính theo ngày nhận việc của ứng viên</span></div>
  <div class="kpis" style="margin-bottom:14px">${[['Hồ sơ nhận việc',tot.n||0,'đang theo dõi'],['Thu đủ đúng hạn',pct(tot.fullOk||0,(tot.full||0)+(tot.miss||0)),`${tot.fullOk||0} đúng / ${(tot.fullLate||0)+(tot.miss||0)} trễ hoặc thiếu`],['Bàn giao đúng hạn',pct(tot.hOk||0,(tot.hOk||0)+(tot.hLate||0)+(tot.hPend||0)),`${tot.hOk||0} đúng / ${(tot.hLate||0)+(tot.hPend||0)} trễ`],['Bị C&B từ chối',tot.redo||0,`${pct(tot.redo||0,tot.batches||0)} số đợt bàn giao`]].map(k=>`<div class="card kpi"><div><div class="t">${k[0]}</div><b>${k[1]}</b><small>${k[2]}</small></div></div>`).join('')}</div>
  <div class="card"><div class="card-h"><span>Đánh giá theo nhân viên tuyển dụng phụ trách</span></div><div class="tbl-wrap"><table><thead><tr><th>Nhân viên</th><th>Số hồ sơ</th><th>Thu đủ đúng hạn</th><th>TB ngày thu đủ (so với ngày nhận việc)</th><th>Thiếu quá hạn</th><th>Bàn giao đúng hạn</th><th>Chờ bàn giao quá hạn</th><th>Số đợt</th><th>Bị từ chối</th><th>Tỷ lệ làm lại</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(userName(r.owner))}</b></td><td>${r.n}</td><td>${pct(r.fullOk,r.full+r.miss)} <span class="muted small">(${r.fullOk}/${r.full+r.miss})</span></td><td>${r.days.length?(r.days.reduce((a,b)=>a+b,0)/r.days.length).toFixed(1):'—'}</td><td>${r.miss?badge(r.miss,'b-bad'):0}</td><td>${pct(r.hOk,r.hOk+r.hLate+r.hPend)} <span class="muted small">(${r.hOk}/${r.hOk+r.hLate+r.hPend})</span></td><td>${r.hPend?badge(r.hPend,'b-bad'):0}</td><td>${r.batches}</td><td>${r.redo?badge(r.redo,'b-bad'):0}</td><td>${pct(r.redo,r.batches)}</td></tr>`).join('')||'<tr><td colspan="10"><div class="empty">Chưa có dữ liệu trong kỳ</div></td></tr>'}</tbody></table></div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><span>Đánh giá theo nhân viên C&B (người nhận bàn giao)</span></div><div class="tbl-wrap"><table><thead><tr><th>Nhân viên C&B</th><th>Số đợt nhận</th><th>Đã xác nhận</th><th>Từ chối</th><th>Tỷ lệ từ chối</th><th>Chờ xác nhận</th><th>Thời gian phản hồi TB</th></tr></thead><tbody>${cnbKpi().map(r=>`<tr><td><b>${esc(userName(r.u))}</b></td><td>${r.n}</td><td>${r.ok}</td><td>${r.no?badge(r.no,'b-bad'):0}</td><td>${pct(r.no,r.ok+r.no)}</td><td>${r.pend?badge(r.pend,'b-warn'):0}</td><td>${r.hrs.length?(()=>{const h=r.hrs.reduce((a,b)=>a+b,0)/r.hrs.length;return h<48?h.toFixed(1)+' giờ':(h/24).toFixed(1)+' ngày'})():'—'}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">Chưa có đợt bàn giao trong kỳ</div></td></tr>'}</tbody></table></div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><span>Cần xử lý ngay (${late.length})</span></div><div class="tbl-wrap"><table><thead><tr><th>Ứng viên</th><th>Tuyển dụng phụ trách</th><th>Ngày nhận việc</th><th>Đã thu</th><th>Vấn đề</th></tr></thead><tbody>${late.map(c=>{const f=onbFlags(c),s=f.s;return`<tr class="click" data-act="openOnb" data-id="${c.id}"><td><b>${esc(c.v.name)}</b></td><td>${esc(ownerName(c))}</td><td>${fmtD(onbStartDate(c))}</td><td>${s.got}/${s.n}</td><td>${f.collectLate?badge(`Thiếu ${s.n-s.got} hồ sơ, quá hạn thu ${fmtD(f.cd)}`,'b-bad')+' ':''}${f.handLate?badge(`${s.got-s.done} hồ sơ chưa bàn giao xong, hạn ${fmtD(f.due)}`,'b-bad'):''}</td></tr>`}).join('')||'<tr><td colspan="5"><div class="empty">Không có hồ sơ quá hạn 🎉</div></td></tr>'}</tbody></table></div></div>
  <p class="muted small" style="margin-top:10px">Cách tính: <b>thu đủ đúng hạn</b> = thu đủ danh mục trước hạn thu đủ (ngày nhận việc + ${onbCfg().collectDays} ngày), hồ sơ còn thiếu quá hạn tính là trễ; <b>bàn giao đúng hạn</b> = các hồ sơ được C&B nhận với ngày bàn giao không quá hạn (${onbCfg().handoverDays} ngày làm việc); <b>bị từ chối</b> = số đợt bàn giao có hồ sơ do nhân viên đó phụ trách bị C&B từ chối (tính cho nhân viên tuyển dụng phụ trách ứng viên, không phụ thuộc ai bấm tạo đợt).</p>`}
/* ---- in ấn ---- */
function printHtml(html,title){const w=window.open('','_blank');if(!w){toast('Trình duyệt chặn cửa sổ in','err');return}
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:12mm 14mm}body{margin:0;background:#fff;font-family:Times New Roman,Times,serif;font-size:13px;line-height:1.4;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}@media screen{body{max-width:820px;margin:24px auto}}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:5px 7px;vertical-align:top}th{background:#A91D3F;color:#fff;font-size:12.5px}tr{page-break-inside:avoid}.hd td{border:1px solid #A91D3F}.c{text-align:center}.t{color:#A91D3F}.sg td{border:0;text-align:center;padding-top:10px}</style></head><body>${html}<script>setTimeout(function(){print()},500)<\/script></body></html>`);w.document.close()}
function onbHead(code,issue,date,orgTitle,title,sub){const t=tplAt(Date.now());
  return`<table class="hd"><tr><td class="c" style="width:22%">${t.logoData?`<img src="${t.logoData}" style="max-height:62px;max-width:100%">`:''}</td><td class="c t" style="width:54%"><b style="font-size:13px">${esc(orgTitle)}</b></td><td class="c" style="width:24%;font-size:12px">MS: ${esc(code)}<br>Ngày BH: ${esc(date)}<br>Lần BH: ${esc(issue)}</td></tr></table>
  <h2 class="c t" style="margin:14px 0 2px;font-size:19px">${esc(title)}</h2><div class="c" style="font-style:italic;margin-bottom:10px">${esc(sub||'')}</div>`}
function onbDocHTML(c){
  const sn=c.onb?c.onb.snap:onbTplAt(Date.now()),s=onbStats(c),f=onbFlags(c),r=reqById(c.v.reqId);
  const missing=sn.items.filter(it=>!(c.onb&&c.onb.items[it.id]&&c.onb.items[it.id].got)),dept=r?(r.v.dept||''):'';
  const lastB=hoList().filter(b=>b.status==='dong_y'&&b.lines.some(l=>l.candId===c.id)).sort((a,b)=>b.decidedAt-a.decidedAt)[0];
  const note=(c.onb&&c.onb.note)||(missing.length?`Còn thiếu: ${missing.map(m=>m.name).join('; ')}${f.cd?` – hẹn bổ sung trước ngày ${fmtD(f.cd)}`:''}.`:'');
  return`${onbHead(sn.code,sn.issue,fmtD(sn.effective),(DB.cfg.company||'').toUpperCase(),sn.title,sn.sub)}
  <table style="margin-bottom:10px"><tr><td style="width:18%"><b>Họ và tên:</b></td><td style="width:34%">${esc(c.v.name)}</td><td style="width:18%"><b>Mã số nhân viên:</b></td><td></td></tr><tr><td><b>Chức danh:</b></td><td>${esc(posOf(c))}</td><td><b>Phòng ban/Cơ sở:</b></td><td>${esc(dept)}</td></tr><tr><td><b>Ngày nhận việc:</b></td><td colspan="3">${fmtD(onbStartDate(c))}</td></tr></table>
  <table><thead><tr><th style="width:36px">STT</th><th style="width:20%">Danh mục hồ sơ</th><th>Yêu cầu chi tiết &amp; Quy cách giấy tờ</th><th style="width:17%">Số lượng</th><th style="width:19%">Nhân viên HCNS nhận</th></tr></thead><tbody>
  ${sn.items.map((it,i)=>{const rc=c.onb&&c.onb.items[it.id],b=itemHo(c.id,it.id),done=b&&b.status==='dong_y';return`<tr><td class="c">${i+1}</td><td><b>${esc(it.name)}</b></td><td>${esc(it.req)}</td><td>${esc(it.qty)}<br><span style="font-size:11px;color:#555">${rc&&rc.got?'&#9746; Đã nhận '+fmtD(rc.at):'&#9744; Chưa nhận'}</span></td><td class="c">${done?'&#9746; '+fmtD(b.date):'&#9744;'}</td></tr>`}).join('')}</tbody></table>
  <p style="margin:12px 0 4px"><b>Ghi chú / Hẹn ngày bổ sung hồ sơ còn thiếu</b></p><div style="border:1px solid #999;min-height:46px;padding:6px 8px">${esc(note)}</div>
  <div style="border:1px solid #999;padding:8px 10px;margin-top:10px;text-align:justify"><b>Cam kết hoàn thành hồ sơ nhân sự:</b><br>Tôi cam kết bảo đảm tính chính xác, trung thực của toàn bộ hồ sơ đã nộp. Đối với các chứng từ còn thiếu được ghi nhận tại mục Ghi chú, tôi xin cam kết sẽ hoàn thành việc bổ sung cho Phòng HCNS trong vòng ${String(onbCfg().collectDays).padStart(2,'0')} ngày kể từ ngày nhận việc. Nếu quá thời hạn trên hoặc hồ sơ có sự sai lệch cố ý, tôi xin hoàn toàn chịu trách nhiệm theo Nội quy lao động và Quy định của Hệ thống trường Việt Mỹ.</div>
  <table class="sg" style="margin-top:6px"><tr><td><b>NGƯỜI NỘP HỒ SƠ</b><br><i>(Ký và ghi rõ họ tên)</i><br><br><br>${esc(c.v.name)}</td><td><b>NGƯỜI TIẾP NHẬN</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br>${esc(ownerName(c))}</td><td><b>NHÂN VIÊN HCNS TIẾP NHẬN</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br>${lastB?esc(userName(lastB.decidedBy)):(c.onb&&c.onb.cnb?esc(userName(c.onb.cnb)):'')}</td></tr></table>`}
function hoDocHTML(b){
  const st=BG_ST[b.status];
  return`${onbHead('BM.11/HN.QT.01 – Phụ lục','01',fmtD(b.date),(DB.cfg.company||'').toUpperCase(),'BIÊN BẢN BÀN GIAO HỒ SƠ NHÂN SỰ','Mã đợt: '+b.code+(b.attempt>1?' (lần '+b.attempt+')':''))}
  <table style="margin-bottom:10px"><tr><td style="width:20%"><b>Ngày bàn giao:</b></td><td>${fmtD(b.date)}</td><td style="width:20%"><b>Trạng thái:</b></td><td>${esc(st[0])}</td></tr><tr><td><b>Người bàn giao (Tuyển dụng):</b></td><td>${esc(userName(b.by))}</td><td><b>Người nhận (C&amp;B):</b></td><td>${esc(userName(b.toId))}</td></tr>${b.note?`<tr><td><b>Ghi chú:</b></td><td colspan="3">${esc(b.note)}</td></tr>`:''}</table>
  <table><thead><tr><th style="width:36px">STT</th><th>Ứng viên / Chức danh</th><th>Hồ sơ bàn giao</th><th style="width:16%">Kết quả đối chiếu</th></tr></thead><tbody>
  ${b.lines.flatMap((l,i)=>{const c=DB.cands.find(x=>x.id===l.candId);return l.items.map((iid,j)=>{const it=c&&c.onb?c.onb.snap.items.find(x=>x.id===iid):null,k=l.candId+'|'+iid;return`<tr><td class="c">${j===0?i+1:''}</td><td>${j===0&&c?`<b>${esc(c.v.name)}</b><br>${esc(posOf(c))}`:''}</td><td>${esc(it?it.name:iid)} <span style="font-size:11px;color:#555">(${esc(it?it.qty:'')})</span></td><td class="c">${b.status==='dong_y'?'&#9746; Khớp':b.status==='tu_choi'?((b.mismatch||[]).includes(k)?'&#9746; Không khớp':'—'):'&#9744;'}</td></tr>`})}).join('')}</tbody></table>
  ${b.status==='tu_choi'?`<p><b>Lý do từ chối:</b> ${esc(b.reason||'')}</p>`:''}${b.decidedAt?`<p style="font-size:12px"><i>${b.status==='dong_y'?'Đã xác nhận':'Đã từ chối'} trong hệ thống bởi ${esc(userName(b.decidedBy))} lúc ${fmtDT(b.decidedAt)}.</i></p>`:''}
  <table class="sg" style="margin-top:14px"><tr><td><b>NGƯỜI BÀN GIAO</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br>${esc(userName(b.by))}</td><td><b>NGƯỜI NHẬN BÀN GIAO (C&amp;B)</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br>${b.status==='dong_y'?esc(userName(b.decidedBy)):''}</td></tr></table>`}
/* ---- thư viện: danh mục hồ sơ (BM.11) ---- */
function onbLibView(){
  const ed=can('lib.edit'),vs=onbTplList().reverse(),cur=onbTplAt(Date.now());
  return`<div class="alert info" style="margin-bottom:14px">${ic('alert')}<div>Danh mục hồ sơ ứng viên cần nộp khi nhận việc theo <b>BM.11/HN.QT.01</b> (dùng chung cho mọi vị trí). Khi ban hành bản mới (đổi mục, yêu cầu hoặc lần ban hành), bản mới áp dụng cho hồ sơ <b>bắt đầu tiếp nhận sau ngày hiệu lực</b>; hồ sơ đang xử lý giữ nguyên danh mục đã chốt.</div></div>
  <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Số hiệu</th><th>Lần ban hành</th><th>Ngày hiệu lực</th><th>Trạng thái</th><th>Số mục</th><th>Nội dung thay đổi</th><th></th></tr></thead><tbody>${vs.map(t=>`<tr><td class="mono">${esc(t.code)}</td><td>${esc(t.issue)}</td><td>${fmtD(t.effective)}</td><td>${t===cur?badge('Đang áp dụng','b-ok'):(t.effective||'')>iso()?badge('Sắp hiệu lực','b-info'):badge('Hết hiệu lực','b-gray')}</td><td>${t.items.length}</td><td>${esc(t.note||'')}</td><td>${ed?`<button class="btn sm" data-act="onbTplEdit" data-id="${t.id}">${ic('edit')}Sửa</button>`:''}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><span>Danh mục đang áp dụng (${esc(cur.code)})</span></div><div class="tbl-wrap"><table><thead><tr><th>STT</th><th>Hồ sơ</th><th>Yêu cầu chi tiết</th><th>Số lượng / quy cách</th></tr></thead><tbody>${cur.items.map((it,i)=>`<tr><td>${i+1}</td><td><b>${esc(it.name)}</b></td><td>${esc(it.req)}</td><td>${esc(it.qty)}</td></tr>`).join('')}</tbody></table></div></div>`}
function onbTplModal(id){
  const old=id?DB.lib.onbTpls.find(x=>x.id===id):null,src=old||onbTplAt(Date.now());
  const meta=[{k:'code',l:'Số hiệu',t:'text',req:1},{k:'issue',l:'Lần ban hành',t:'text',req:1},{k:'effective',l:'Ngày hiệu lực',t:'date',req:1},{k:'note',l:'Nội dung thay đổi',t:'text',wide:1}];
  modal({title:old?'Sửa danh mục hồ sơ (BM.11)':'Ban hành danh mục hồ sơ mới (BM.11)',wide:true,html:formHTML(meta,old?{...old}:{code:src.code,issue:String(+src.issue+1).padStart(2,'0'),effective:iso(),note:''})+
    `<label class="f" style="margin-top:12px">Danh mục hồ sơ <span class="muted small">(mỗi dòng một hồ sơ: <b>Tên | Yêu cầu chi tiết | Số lượng / quy cách</b>)</span></label><textarea id="onb_items" style="min-height:300px;font-size:13px">${esc(src.items.map(i=>[i.name,i.req,i.qty].join(' | ')).join('\n'))}</textarea>`,
    buttons:[modalCancel,...(old&&onbTplList().length>1?[{label:'Xoá bản này',cls:'bad',icon:'trash',fn:()=>{DB.lib.onbTpls=DB.lib.onbTpls.filter(x=>x.id!==old.id);commit()}}]:[]),{label:'Lưu',cls:'pri',icon:'check',fn:()=>{
      const x=readForm($('#modal'),meta);if(!x)return false;
      const items=$('#onb_items').value.split(/\r?\n/).map(l=>l.split('|').map(s=>s.trim())).filter(a=>a[0]);if(!items.length){toast('Nhập ít nhất một hồ sơ','err');return false}
      const its=onbItemsFrom(items);
      if(old)Object.assign(old,x,{items:its});else DB.lib.onbTpls.push({id:uid('ot_'),title:src.title,sub:src.sub,...x,items:its,createdAt:Date.now(),by:me().name});
      commit();toast('Đã lưu danh mục hồ sơ','ok')}}]});
}
A.onbTplNew=()=>can('lib.edit')&&onbTplModal();A.onbTplEdit=id=>can('lib.edit')&&onbTplModal(id);
/* ---- thiết lập ---- */
function onbCfgView(){
  const G=onbCfg();
  return`<div class="card pad"><h3 style="margin-bottom:6px">Hồ sơ nhận việc & bàn giao cho C&B</h3><div class="alert info" style="margin:10px 0 14px">${ic('alert')}<div>Các mốc dùng để cảnh báo và chấm KPI cho nhân viên tuyển dụng. Quyền <b>tiếp nhận / bàn giao</b>, <b>xác nhận nhận bàn giao (C&B)</b> và <b>xem báo cáo</b> được cấp ở tab <b>Phân quyền</b> (có sẵn vai trò “Nhân viên C&B”).</div></div>
  <div class="fgrid"><div><label class="f">Hạn bàn giao cho C&B (ngày làm việc)</label><input type="number" min="1" data-cfg="onb.handoverDays" value="${esc(G.handoverDays)}"></div>
  <div><label class="f">Tính hạn bàn giao từ</label><select data-cfg="onb.base"><option value="start" ${G.base==='start'?'selected':''}>Ngày nhận việc</option><option value="recv" ${G.base==='recv'?'selected':''}>Ngày nhận hồ sơ đầu tiên từ ứng viên</option></select></div>
  <div><label class="f">Tính thứ Bảy là ngày làm việc</label><select data-cfg="onb.sat" data-bool="1"><option value="0" ${G.sat?'':'selected'}>Không (thứ 2 – thứ 6)</option><option value="1" ${G.sat?'selected':''}>Có</option></select></div>
  <div><label class="f">Hạn thu đủ hồ sơ (ngày, kể từ ngày nhận việc)</label><input type="number" min="0" data-cfg="onb.collectDays" value="${esc(G.collectDays)}"></div>
  <div><label class="f">C&B phụ trách mặc định (gán khi bắt đầu tiếp nhận hồ sơ)</label><select data-cfg="onb.defaultCnb"><option value="">(chọn khi tiếp nhận)</option>${cnbUsers().map(u=>`<option value="${u.id}" ${G.defaultCnb===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div class="wide"><label class="f">Đường dẫn điền Thông tin ứng viên BM.10 (cổng ứng viên) – chèn vào thư mời bằng biến <span class="mono">{{link_bm10}}</span></label><input type="text" data-cfg="onb.portalUrl" value="${esc(G.portalUrl)}" placeholder="https://script.google.com/macros/s/…/exec"></div></div>
  <p class="muted small" style="margin-top:12px">Ngày nghỉ lễ chưa được loại trừ khỏi ngày làm việc. Danh mục hồ sơ chỉnh ở <b>Thư viện → Hồ sơ nhận việc (BM.11)</b>.</p></div>`}
/* ---- xuất CSV ---- */
function onbExport(k){
  if(!(can('data.export')||can('onb.report'))){toast('Bạn không có quyền xuất dữ liệu','err');return}
  if(k==='onbho'){downloadCSV('ban-giao-ho-so',[['Mã đợt','Ngày','Người bàn giao','Người nhận (C&B)','Trạng thái','Lần','Ứng viên','Vị trí','Hồ sơ','Kết quả đối chiếu','Lý do từ chối','Thời điểm quyết định'],
    ...hoList().flatMap(b=>b.lines.flatMap(l=>{const c=DB.cands.find(x=>x.id===l.candId);return l.items.map(i=>{const it=c&&c.onb?c.onb.snap.items.find(x=>x.id===i):null;return[b.code,fmtD(b.date),userName(b.by),userName(b.toId),BG_ST[b.status][0],b.attempt||1,c?c.v.name:'',c?posOf(c):'',it?it.name:i,b.status==='dong_y'?'Khớp':b.status==='tu_choi'?((b.mismatch||[]).includes(l.candId+'|'+i)?'Không khớp':''):'',b.reason||'',b.decidedAt?fmtDT(b.decidedAt):'']})}))]);return}
  if(k==='onbkpi'){downloadCSV('danh-gia-thu-ho-so',[['Nhân viên','Số hồ sơ','Thu đủ đúng hạn','Thu đủ trễ','Thiếu quá hạn','Bàn giao đúng hạn','Bàn giao trễ','Chờ bàn giao quá hạn','Số đợt bàn giao','Bị C&B từ chối','TB ngày thu đủ'],
    ...onbKpi().map(r=>[userName(r.owner),r.n,r.fullOk,r.fullLate,r.miss,r.hOk,r.hLate,r.hPend,r.batches,r.redo,r.days.length?(r.days.reduce((a,b)=>a+b,0)/r.days.length).toFixed(1):''])]);return}
  const tpl=onbTplAt(Date.now());
  downloadCSV('ho-so-nhan-viec',[['Ứng viên','Vị trí','Ngày nhận việc','Tuyển dụng phụ trách','C&B phụ trách','Trạng thái','Đã thu','C&B đã nhận','Tổng mục','Hạn thu đủ','Hạn bàn giao','Quá hạn thu','Quá hạn bàn giao','Số lần làm lại',...tpl.items.map(i=>'Nhận: '+i.name),'Ghi chú'],
    ...onbRows().map(c=>{const s=onbStats(c),f=onbFlags(c);return[c.v.name,posOf(c),fmtD(onbStartDate(c)),ownerName(c),cnbName(c),onbState(c)[0],s.got,s.done,s.n,f.cd?fmtD(f.cd):'',f.due?fmtD(f.due):'',f.collectLate?'Có':'',f.handLate?'Có':'',s.redo,...tpl.items.map(i=>{const x=c.onb&&c.onb.items[(c.onb.snap.items.find(y=>y.name===i.name)||{}).id];return x&&x.got?fmtD(x.at):''}),c.onb?c.onb.note||'':'']})])}
/* thẻ tóm tắt trong hồ sơ ứng viên */
function onbCandCard(c){
  if(!can('onb.view')||!onbEligible(c))return'';const s=onbStats(c),st=onbState(c);
  return`<div class="card sec"><div class="sec-h"><h3>${ic('file')}4 · Hồ sơ nhận việc (BM.11)</h3><button class="btn sm" data-act="openOnb" data-id="${c.id}">Mở</button></div>${c.onb?`<div class="row">${badge(st[0],st[1])}<span>Đã thu <b>${s.got}/${s.n}</b> · C&B đã nhận <b>${s.done}/${s.n}</b></span>${isLate(c)?badge('Quá hạn','b-bad'):''}</div>`:'<span class="muted">Chưa bắt đầu tiếp nhận hồ sơ nhận việc.</span>'}</div>`}
const roleHas=(u,cap)=>{const r=DB.cfg.roles.find(x=>x.id===u.roleId);return!!r&&(r.id==='admin'||r.caps.includes(cap))};
