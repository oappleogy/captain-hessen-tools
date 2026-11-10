import {fill,fresh} from './market.mjs';
export function chainRows(chain,books,q,now=Date.now()){
 const chainOk=chain&&Number.isFinite(chain.blockTime)&&now-chain.blockTime>=-5000&&now-chain.blockTime<=60000&&Number.isFinite(chain.receivedAt)&&now-chain.receivedAt>=-5000&&now-chain.receivedAt<=45000;
 return ['Binance','OKX','Bybit','Bitget','Gate','Kraken'].flatMap(venue=>['dex-sell','dex-buy'].map(direction=>{
 const b=books.find(b=>b.venue===venue&&b.asset==='ETH'&&b.quote==='USDT');
 const row={venue,direction,quantity:q,valid:false,gross:null,bps:null,reason:''};
 if(!chainOk)return {...row,reason:'链上报价缺失 / 过期'};
 if(!b||!fresh(b,now))return {...row,reason:b?.error||'CEX 报价缺失 / 过期'};
 if(Math.abs((b.marketAt??b.receivedAt)-chain.blockTime)>30000)return {...row,reason:'两腿时间差超过 30 秒'};
 const sell=direction==='dex-sell',cex=fill(sell?b.asks:b.bids,q),dex=sell?chain.sell:chain.buy;
 if(!cex)return {...row,reason:'CEX 当前规模深度不足'};
 if(!dex||!Number.isFinite(dex.amount)||dex.amount<=0)return {...row,reason:'DEX 路由不可报价'};
 const input=sell?cex.total:dex.amount,output=sell?dex.amount:cex.total;
 return {...row,valid:true,input,output,gross:output-input,bps:(output/input-1)*10000,dexFee:dex.fee,block:chain.block,cexTime:b.marketAt??b.receivedAt,cexTimeKind:b.marketAt?'盘口时间':'接收时间（源时间未知）',reason:'费用 / 库存 / 通道待核'};
 }));
}
