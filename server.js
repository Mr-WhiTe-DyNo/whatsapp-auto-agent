const express=require("express");
const QRCode=require("qrcode");
const {Client,LocalAuth}=require("whatsapp-web.js");
const fs=require("fs"), path=require("path");
const app=express(), PORT=process.env.PORT||3000;
app.use(express.json({limit:"10mb"})); app.use(express.static(path.join(__dirname,"public")));
let qrData=null, ready=false, state="starting";
const DATA=path.join(__dirname,"data.json");
const seed={products:[
{id:1,name:"Netflix Premium",plans:[["1 Month",650],["3 Months",1800],["6 Months",3400],["12 Months",6200]]},
{id:2,name:"Prime Video",plans:[["1 Month",500],["3 Months",1400],["6 Months",2600],["12 Months",4800]]},
{id:3,name:"Premium IPTV",plans:[["1 Month",700],["3 Months",1900],["6 Months",3600],["12 Months",6800]]},
{id:4,name:"YouTube Premium",plans:[["1 Month",350],["3 Months",900],["12 Months",3200]]},
{id:5,name:"CapCut Pro",plans:[["1 Month",450],["6 Months",2400],["12 Months",4300]]}],
payment:{jazzcash:"03XX-XXXXXXX",easypaisa:"03XX-XXXXXXX",bank:"Bank Name | Account Title | IBAN"},orders:[]};
function load(){if(!fs.existsSync(DATA))fs.writeFileSync(DATA,JSON.stringify(seed,null,2));try{return JSON.parse(fs.readFileSync(DATA));}catch{return seed}}
function save(x){fs.writeFileSync(DATA,JSON.stringify(x,null,2))}
let db=load();

const client=new Client({authStrategy:new LocalAuth({dataPath:path.join(__dirname,".wwebjs_auth")}),puppeteer:{
  headless:true,args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"]
}});
client.on("qr",async qr=>{qrData=await QRCode.toDataURL(qr);ready=false;state="qr"});
client.on("authenticated",()=>{state="authenticated"});
client.on("ready",()=>{ready=true;state="ready";qrData=null});
client.on("auth_failure",m=>{ready=false;state="auth_failure"});
client.on("disconnected",()=>{ready=false;state="disconnected"; qrData=null});
client.initialize().catch(e=>{state="error";console.error(e)});

function menu(){return "👋 Welcome!\n\n📋 *Catalog*\nReply with a product number:\n\n"+db.products.map((p,i)=>`${i+1}️⃣ ${p.name}`).join("\n")}
function productMenu(i){const p=db.products[i];return `🛒 *${p.name}*\n\nChoose a plan:\n`+p.plans.map((x,j)=>`${j+1}️⃣ ${x[0]} — Rs. ${x[1]}`).join("\n")}
const sessions=new Map();
client.on("message",async msg=>{
  if(msg.fromMe||msg.from.endsWith("@g.us"))return;
  const text=(msg.body||"").trim().toLowerCase();
  let s=sessions.get(msg.from)||{};
  if(["hi","hello","hey","menu","start"].includes(text)){sessions.set(msg.from,{});return msg.reply(menu())}
  if(text==="payment"){return msg.reply(`💳 *Payment Details*\nJazzCash: ${db.payment.jazzcash}\nEasypaisa: ${db.payment.easypaisa}\nBank: ${db.payment.bank}\n\n📸 Send payment screenshot after payment.`)}
  if(!s.product && /^\\d+$/.test(text)){
    const n=Number(text)-1;
    if(n>=0&&n<db.products.length){sessions.set(msg.from,{product:n});return msg.reply(productMenu(n))}
  }
  if(s.product!==undefined && !s.plan && /^\\d+$/.test(text)){
    const n=Number(text)-1,p=db.products[s.product];
    if(n>=0&&n<p.plans.length){sessions.set(msg.from,{...s,plan:n});return msg.reply(`Quantity? Reply with a number, e.g. *1* or *2*.`)}
  }
  if(s.product!==undefined&&s.plan!==undefined&&/^\\d+$/.test(text)){
    const qty=Math.max(1,Math.min(99,Number(text))),p=db.products[s.product],pl=p.plans[s.plan],total=pl[1]*qty;
    const order={id:"ORD-"+Date.now(),customer:msg.from,product:p.name,plan:pl[0],quantity:qty,total,status:"Pending",createdAt:new Date().toISOString()};
    db.orders.unshift(order);save(db);sessions.delete(msg.from);
    return msg.reply(`🧾 *Order Summary*\nProduct: ${p.name}\nPlan: ${pl[0]}\nQuantity: ${qty}\nTotal: Rs. ${total}\n\n💳 *Payment*\nJazzCash: ${db.payment.jazzcash}\nEasypaisa: ${db.payment.easypaisa}\nBank: ${db.payment.bank}\n\n📸 Please send your payment screenshot.\nOrder ID: *${order.id}*`);
  }
  if(msg.hasMedia){return msg.reply("📸 Payment screenshot received. Your order is *Pending Verification*. Thank you!")}
  return msg.reply("Please type *menu* to see the catalog.");
});

app.get("/api/status",(req,res)=>res.json({state,ready,qr:qrData}));
app.get("/api/data",(req,res)=>res.json(db));
app.post("/api/payment",(req,res)=>{db.payment=req.body;save(db);res.json({ok:true})});
app.post("/api/products",(req,res)=>{db.products=req.body.products;save(db);res.json({ok:true})});
app.post("/api/orders/:id/status",(req,res)=>{const o=db.orders.find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:"not found"});o.status=req.body.status;save(db);res.json(o)});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("Agent running on "+PORT));