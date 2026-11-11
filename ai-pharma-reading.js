(()=>{'use strict';
const buyers={
model:[['买什么','用来检验模型和改进设计的实验结果，包括对照、失败样本及实验条件。','可能带来新的付费方；仍要验证预算规模。'],['收入在哪里','合成、蛋白表达、标准化检测与数据交付。','实验服务收入取决于真实采购，不取决于生成了多少序列。'],['谁能留下利润','交付快、可重复、难样品成功率高，且有稳定复购的供应商。','关注客户集中度、数据权益与扩产后的单次成本。']],
pharma:[['买什么','为具体药物项目购买制作、药效、安全性和开发服务。','可能是原有预算重新分配，并非全部是行业新增。'],['收入在哪里','早研合成与验证先发生；后续开发、临床和生产由项目推进拉动。','不存在所有项目统一的几个月传导时滞。'],['谁能留下利润','能减少客户后续失败，并在质量、周期和成本之间形成优势的团队。','看同口径订单、取消率、项目推进率与回款。']],
lab:[['买什么','设备、自动化集成、试剂耗材和实验管理软件。','自建实验室既创造设备需求，也可能分流外包服务。'],['收入在哪里','建设期设备与实施收入，运行期耗材、维保和软件订阅。','设备合同、交付验收和经常性收入要分开。'],['谁能留下利润','系统可靠、设备利用率高、耗材复购稳定的供应商。','设备台数不等于有效实验产出；折旧和运维也会增长。']],
quality:[['买什么','制造记录审核、质量追溯、申报材料初稿和系统集成。','主要价值来自节省工时、减少差错，而非增加实验次数。'],['收入在哪里','软件订阅、实施服务及持续支持。','客户节省的成本不等于软件公司的收入；需确认付费合同。'],['谁能留下利润','能嵌入实际工作流程、输出可追溯且部署成本可控的产品。','人工复核、验证与责任分工仍然存在，案例不能外推成审批提速。']]
};
const out=document.getElementById('buyer-result');
function render(key){out.replaceChildren(...buyers[key].map(([h,p,n])=>{const d=document.createElement('div');const a=document.createElement('h3');a.textContent=h;const b=document.createElement('p');b.textContent=p;const c=document.createElement('small');c.textContent=n;d.append(a,b,c);return d}));document.querySelectorAll('[data-buyer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.buyer===key)));}
document.querySelectorAll('[data-buyer]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.buyer)));render('model');
const target=document.getElementById('reading-updates');
fetch('data/research-topics.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{const t=data.topics.find(t=>t.id==='ai-pharma');if(!t)throw Error();target.replaceChildren();for(const n of [...t.updates].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)){const row=document.createElement('div');row.className='reading-update';const h=document.createElement('h3');h.textContent=n.title;const p=document.createElement('p');p.textContent=n.body;const meta=document.createElement('small');meta.textContent=`研究记录 ${n.date} · 观察期 ${n.source_period}`;row.append(h,p,meta);target.append(row)}}).catch(()=>{target.textContent='更新记录暂时无法读取；正文的来源日期仍可查阅，完整维护记录见下方入口。';target.className='reading-updates-error'});
})();
