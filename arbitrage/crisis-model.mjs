// Deterministic, synthetic constant-product AMM exercise. Not a historical backtest,
// calibrated execution model, Uniswap V3 implementation, probability or trading signal.
export function scenario(p){
 const keys=['q','shock','liquidity','cexMove','cexFee','gas','rebalance','borrow','reserve','lag'];
 for(const k of keys)if(typeof p[k]!=='number'||!Number.isFinite(p[k]))throw Error('参数缺失或无效：'+k);
 if(p.q<=0||p.q>1000||p.shock<0||p.liquidity<=0||p.liquidity>1||p.cexMove<=-100||p.cexFee<0||p.cexFee>=10000||['gas','rebalance','borrow','reserve','lag'].some(k=>p[k]<0)||p.lag>=10000)throw Error('参数超出允许范围');
 if(!['buy','sell','none'].includes(p.kind))throw Error('未知冲击类型');
 const fee=.003, f=1-fee;let x=1000*p.liquidity,y=2000000*p.liquidity;
 if(p.kind==='buy'){const out=x*p.shock*f/(y+p.shock*f);x-=out;y+=p.shock;}
 if(p.kind==='sell'){const out=y*p.shock*f/(x+p.shock*f);y-=out;x+=p.shock;}
 const cexMid=2000*(1+p.cexMove/100),halfSpread=2/10000;
 // Synthetic finite CEX depth: 20 ETH per level, 2 bps worse per successive level.
 const fill=side=>{if(p.q>100)return null;let rest=p.q,total=0;for(let i=0;i<5&&rest>0;i++){const take=Math.min(20,rest);total+=take*cexMid*(1+side*(halfSpread+i*2/10000));rest-=take;}return total;};
 const cexBuy=fill(1),cexSell=fill(-1),dexSell=y*p.q*f/(x+p.q*f),dexBuy=p.q<x?y*p.q/((x-p.q)*f):null;
 function route(dir){
  const isSell=dir==='dex-sell',baseCex=isSell?cexBuy:cexSell,dex=isSell?dexSell:dexBuy;
  if(baseCex===null||dex===null)return {direction:dir,valid:false,reason:'模型内可用深度不足'};
  const delayedCex=baseCex*(1+(isSell?1:-1)*p.lag/10000);
  const input=isSell?delayedCex:dex,output=isSell?dex:delayedCex;
  const gross=output-input,cexFee=delayedCex*p.cexFee/10000;
  const costs=cexFee+p.gas+p.rebalance+p.borrow,net=gross-costs,buffered=net-p.reserve;
  return {direction:dir,valid:true,input,output,gross,cexFee,costs,net,buffered,lagLoss:Math.abs(delayedCex-baseCex),reserve:p.reserve,breakEvenBps:(costs+p.reserve)/input*10000,
  requiredInventory:isSell?`链上 ${p.q} ETH + CEX ${input.toFixed(2)} USDT，另留费用`:`链上 ${input.toFixed(2)} USDT + CEX ${p.q} ETH，另留费用`};
 }
 return {model:'synthetic_constant_product',dexSpot:y/x,cexMid,reserves:{eth:x,usdt:y},routes:[route('dex-sell'),route('dex-buy')],spotOnlyGapBps:(y/x/cexMid-1)*10000};
}
export function stressGrid(p){const base=scenario({...p,lag:0}),valid=base.routes.filter(r=>r.valid);if(!valid.length)return {direction:null,rows:[]};const direction=valid.sort((a,b)=>b.buffered-a.buffered)[0].direction;return {direction,rows:[0,25,100].map(lag=>({lag,values:[20,100,500].map(gas=>scenario({...p,lag,gas}).routes.find(r=>r.direction===direction).buffered)}))};}
export function healthStress(hf,collateralPct,debtPct){if(![hf,collateralPct,debtPct].every(Number.isFinite)||hf<=0||collateralPct<=-100||debtPct<=-100)return null;return hf*(1+collateralPct/100)/(1+debtPct/100);}
