import {COST_FIELDS,costKey,evaluateCosts} from './cost-model.mjs';
const $=id=>document.getElementById(id),storage='basealpha-route-costs-v1';
let profiles={};try{profiles=JSON.parse(sessionStorage.getItem(storage))||{};}catch{}
const key=()=>costKey($('cost-venue').value,$('cost-direction').value,Number($('chain-size').value));
export function rowCosts(row){return evaluateCosts(row,profiles[costKey(row.venue,row.direction,row.quantity)]);}
export function costSnapshot(){return profiles;}
export function initCosts(onChange){if(!$('cost-form'))return;
 const load=()=>{const p=profiles[key()]||{};for(const k of [...Object.keys(COST_FIELDS),'mode','route','source'])$('cost-'+k).value=p[k]??(k==='mode'?'direct':'');$('cost-scope').textContent=`${$('cost-venue').value} · ${$('cost-direction').selectedOptions[0].textContent} · ${$('chain-size').value} ETH`;$('cost-message').textContent=p.savedAt?'手动录入时间：'+new Date(p.savedAt).toLocaleString('zh-CN')+'；30分钟后需重新核验。':'尚未录入；空白费用不会按零处理。';};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-cost-venue]');if(!b)return;$('cost-venue').value=b.dataset.costVenue;$('cost-direction').value=b.dataset.costDirection;load();document.querySelector('.cost-panel').open=true;document.querySelector('.cost-panel').scrollIntoView({behavior:'smooth',block:'start'});});
 $('cost-venue').onchange=load;$('cost-direction').onchange=load;$('chain-size').addEventListener('change',load);
 $('cost-form').onsubmit=e=>{e.preventDefault();const p={savedAt:Date.now()};for(const k of Object.keys(COST_FIELDS)){const s=$('cost-'+k).value.trim();p[k]=s===''?null:Number(s);}for(const k of ['mode','route','source'])p[k]=$('cost-'+k).value.trim();profiles[key()]=p;let stored=true;try{sessionStorage.setItem(storage,JSON.stringify(profiles));}catch{stored=false;}load();$('cost-message').textContent+=' 已应用到对应行。'+(stored?'仅保存在当前浏览器会话。':'浏览器禁止保存，关闭页面后丢失。');onChange();};
 $('cost-clear').onclick=()=>{delete profiles[key()];try{sessionStorage.setItem(storage,JSON.stringify(profiles));}catch{}load();onChange();};load();}
