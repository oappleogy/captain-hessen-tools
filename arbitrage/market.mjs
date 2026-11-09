export const ASSETS=[{id:'BTC',q:.1},{id:'ETH',q:1},{id:'SOL',q:10},{id:'TRX',q:10000},{id:'UNI',q:100},{id:'LINK',q:100},{id:'AAVE',q:10},{id:'PEPE',q:100000000}];
export const VENUES=['Binance','OKX','Bybit','Bitget','Gate','Kraken','Coinbase'];
const cool=new Map();
export function endpoint(v,a){
 switch(v){
 case 'Binance':return `https://data-api.binance.vision/api/v3/depth?symbol=${a}USDT&limit=100`;
 case 'OKX':return `https://www.okx.com/api/v5/market/books?instId=${a}-USDT&sz=100`;
 case 'Bybit':return `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${a}USDT&limit=50`;
 case 'Bitget':return `https://api.bitget.com/api/v2/spot/market/orderbook?symbol=${a}USDT&type=step0&limit=100`;
 case 'Gate':return `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${a}_USDT&limit=100&with_id=true`;
 case 'Kraken':return `https://api.kraken.com/0/public/Depth?pair=${a==='BTC'?'XBT':a}USDT&count=100`;
 case 'Coinbase':return `https://api.exchange.coinbase.com/products/${a}-USD/book?level=2`;
 default:throw Error('Unknown venue');
 }
}
export function normalize(v,d,receivedAt){
 let b=d,time=null;
 if(v==='OKX'){if(d.code!=='0')throw Error(`API ${d.code}`);b=d.data?.[0];time=Number(b?.ts);}
 if(v==='Bybit'){if(d.retCode!==0)throw Error(`API ${d.retCode}`);b={asks:d.result?.a,bids:d.result?.b};time=Number(d.result?.ts);}
 if(v==='Bitget'){if(d.code!=='00000')throw Error(`API ${d.code}`);b=d.data;time=Number(b?.ts);}
 if(v==='Gate')time=Number(d.update);
 if(v==='Kraken'){if(d.error?.length)throw Error('交易对或接口不可用');b=Object.values(d.result||{})[0];}
 if(v==='Coinbase'&&d.message)throw Error('交易对或接口不可用');
 const parse=(rows,asc)=>{if(!Array.isArray(rows)||!rows.length)throw Error('缺少盘口');const x=rows.map(r=>[Number(r[0]),Number(r[1])]);if(x.some(r=>!r.every(Number.isFinite)||r[0]<=0||r[1]<=0))throw Error('无效盘口');return x.sort((a,b)=>asc?a[0]-b[0]:b[0]-a[0]);};
 const asks=parse(b?.asks,true),bids=parse(b?.bids,false);if(bids[0][0]>asks[0][0])throw Error('交叉盘口待核');
 return {asks,bids,marketAt:Number.isFinite(time)&&time>0?time:null,receivedAt,quote:v==='Coinbase'?'USD':'USDT'};
}
export async function loadBook(venue,asset,fetcher=fetch){
 const url=endpoint(venue,asset),host=new URL(url).host,gate=cool.get(host),receivedAt=Date.now();
 try{
 if(gate&&gate.until>Date.now())throw Error(`${gate.reason}；冷却至 ${new Date(gate.until).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}`);
 const res=await fetcher(url,{signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(!res.ok){if([401,403,451,429].includes(res.status))cool.set(host,{until:Date.now()+(res.status===429?60000:3600000),reason:`HTTP ${res.status}`});throw Error(`HTTP ${res.status}`);}
 const data=await res.json();return {venue,asset,url,status:'ok',...normalize(venue,data,Date.now())};
 }catch(e){return {venue,asset,url,status:'error',receivedAt,quote:venue==='Coinbase'?'USD':'USDT',error:e.name==='TimeoutError'?'8 秒超时':e.message==='Failed to fetch'?'网络 / CORS 不可达':String(e.message).slice(0,100)};}
}
export function fill(levels,q){if(!Number.isFinite(q)||q<=0||!Array.isArray(levels))return null;let remain=q,total=0;for(const [p,size] of levels){if(!Number.isFinite(p)||p<=0||!Number.isFinite(size)||size<=0)return null;const take=Math.min(remain,size);total+=take*p;remain-=take;if(remain<=q*1e-10)return {total,average:total/q};}return null;}
export function fresh(b,now=Date.now()){const t=b.marketAt??b.receivedAt;return b.status==='ok'&&Number.isFinite(t)&&now-t>=-5000&&now-t<=45000&&now-b.receivedAt<=45000;}
export function compare(books,q,now=Date.now()){
 let best=null;for(const buy of books)for(const sell of books){if(buy.venue===sell.venue||buy.quote!==sell.quote||buy.quote!=='USDT'||!fresh(buy,now)||!fresh(sell,now)||Math.abs((buy.marketAt??buy.receivedAt)-(sell.marketAt??sell.receivedAt))>20000)continue;
 const input=fill(buy.asks,q),output=fill(sell.bids,q);if(!input||!output)continue;const gross=output.total-input.total,bps=gross/input.total*10000;if(!best||bps>best.bps)best={buy:buy.venue,sell:sell.venue,gross,bps,input:input.total,output:output.total};}
 return best;
}
