export const COST_FIELDS={cexBps:'CEX 手续费 bps',withdraw:'充提补足成本',bridge:'桥接费及到账损耗',gas:'自付 Gas',wrap:'包装与授权',funding:'借息与对冲',rebalance:'回程与再平衡',buffer:'额外价格变动余量'};
export function costKey(venue,direction,q){return `${venue}:${direction}:${q}`;}
export function evaluateCosts(row,p,now=Date.now()){
 const empty={total:null,net:null,netBps:null,stressNet:null};
 if(!p)return {...empty,status:'费用待录入'};
 if(!['direct','bridge','inventory'].includes(p.mode)||!p.route?.trim()||!p.source?.trim())return {...empty,status:'路径 / 费用依据不完整'};
 if(!Number.isFinite(p.savedAt)||now-p.savedAt<0||now-p.savedAt>1800000)return {...empty,status:'手动费用已过期，请重新核验'};
 for(const [k,label] of Object.entries(COST_FIELDS))if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<0)return {...empty,status:`待补：${label}`};
 if(p.cexBps>10000)return {...empty,status:'手续费超出有效范围'};
 if(p.mode==='direct'&&p.bridge!==0)return {...empty,status:'同链直达不应填桥费，请核对路径'};
 if(!row.valid)return {...empty,status:'等待有效双腿报价'};
 const cexNotional=row.direction==='dex-sell'?row.input:row.output;
 const trade=cexNotional*p.cexBps/10000;
 const total=trade+p.withdraw+p.bridge+p.gas+p.wrap+p.funding+p.rebalance;
 const net=row.gross-total;
 return {trade,total,net,netBps:net/row.input*10000,stressNet:net-p.buffer,status:'手动假设 · 通道与到账时间待核'};
}
