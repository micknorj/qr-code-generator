"use strict";

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={category:"link",type:"url",values:{},qr:null,logo:null,lastPayload:"",dirty:false,timer:null,appearance:"system",selected:{link:"url",message:"text",contact:"vcard",wifi:"wifi",place:"geo",custom:"raw"}};

/* Appearance */
const media=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(){const theme=state.appearance==="system"?(media.matches?"dark":"light"):state.appearance;document.documentElement.dataset.theme=theme;$("#appearance").textContent=`Appearance · ${{system:"System",light:"Light",dark:"Dark"}[state.appearance]}`}
$("#appearance").onclick=()=>{const m=["system","light","dark"];state.appearance=m[(m.indexOf(state.appearance)+1)%m.length];applyTheme()};
media.addEventListener?.("change",()=>state.appearance==="system"&&applyTheme());

/* Dynamic fields */
const I=(k,l,p="",t="text",x="")=>`<div class="field"><label for="f-${k}">${l}</label><input id="f-${k}" class="input" type="${t}" data-field="${k}" placeholder="${p}" autocomplete="off" ${x}></div>`;
const T=(k,l,p="",x="")=>`<div class="field"><label for="f-${k}">${l}</label><textarea id="f-${k}" class="textarea" data-field="${k}" placeholder="${p}" ${x}></textarea></div>`;
const S=(k,l,o)=>`<div class="field"><label for="f-${k}">${l}</label><select id="f-${k}" class="select" data-field="${k}">${o.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></div>`;
const G=(...x)=>`<div class="field-grid">${x.join("")}</div>`;

const types={
  url:{label:"Website",html:I("url","Website","https://example.com","text",'spellcheck="false"')+'<span class="hint">HTTPS is added automatically when no protocol is entered.</span>'},
  whatsapp:{label:"WhatsApp",html:I("phone","Phone number","+66 81 234 5678","tel")+T("message","Message","Optional message...")},
  text:{label:"Plain text",html:T("text","Text","Enter text...")},
  email:{label:"Email",html:I("email","Email address","name@example.com","email")+I("subject","Subject","Optional")+T("body","Message","Optional message...")},
  phone:{label:"Phone call",html:I("phone","Phone number","+66 81 234 5678","tel")},
  sms:{label:"SMS",html:I("phone","Phone number","+66 81 234 5678","tel")+T("message","Message","Optional message...")},
  wifi:{label:"Wi-Fi network",html:I("ssid","Network name","Wi-Fi name")+G(S("security","Security",[["WPA","WPA / WPA2 / WPA3"],["WEP","WEP"],["nopass","Open network"]]),I("password","Password","Wi-Fi password"))+`<div class="setting compact"><strong>Hidden network</strong><label class="switch"><input type="checkbox" data-field="hidden"><span class="track"></span></label></div><div class="notice warning">Anyone who can read the QR code can obtain the Wi-Fi password.</div>`},
  vcard:{label:"Contact card",html:G(I("firstName","First name"),I("lastName","Last name"))+G(I("company","Company"),I("title","Job title"))+G(I("phone","Phone","","tel"),I("email","Email","","email"))+I("url","Website","https://example.com")+I("street","Street")+G(I("city","City"),I("region","State / Province"))+G(I("postal","Postal code"),I("country","Country"))+T("note","Note","Optional...")},
  geo:{label:"Location",html:G(I("latitude","Latitude","13.7563","number",'step="any" min="-90" max="90"'),I("longitude","Longitude","100.5018","number",'step="any" min="-180" max="180"'))+I("label","Name","Optional location name")},
  event:{label:"Calendar event",html:I("title","Event name","Event name")+G(I("start","Start","","datetime-local"),I("end","End","","datetime-local"))+I("location","Location","Optional")+T("description","Description","Optional...")},
  raw:{label:"Raw data",html:T("raw","QR data","Enter any QR-compatible data...",'data-large="true"')}
};
const categories={link:["url","whatsapp"],message:["text","email","phone","sms"],contact:["vcard"],wifi:["wifi"],place:["geo","event"],custom:["raw"]};

function render(){
  const t=types[state.type],opts=categories[state.category],s=$("#formatSelect");
  s.innerHTML=opts.map(x=>`<option value="${x}" ${x===state.type?"selected":""}>${types[x].label}</option>`).join("");
  $("#formatChooser").hidden=opts.length===1;$("#dynamicFields").innerHTML=t.html;
  const saved=state.values[state.type]||{};
  $$("[data-field]",$("#dynamicFields")).forEach(el=>{if(!(el.dataset.field in saved))return;el.type==="checkbox"?el.checked=!!saved[el.dataset.field]:el.value=saved[el.dataset.field]});
  updateCapacity();
}
function saveField(el){state.values[state.type]??={};state.values[state.type][el.dataset.field]=el.type==="checkbox"?el.checked:el.value}
const V=()=>state.values[state.type]||{};

/* Payload */
const escWifi=s=>String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/:/g,"\\:").replace(/"/g,'\\"');
const esc=s=>String(s||"").replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
const normUrl=v=>{v=String(v||"").trim();return !v?"":/^[a-z][a-z0-9+.-]*:/i.test(v)?v:`https://${v}`};
const icsDate=v=>{if(!v)return"";const[d,t=""]=v.split("T");return d.replaceAll("-","")+"T"+t.replaceAll(":","").padEnd(6,"0")};

function payload(){
  const v=V();
  switch(state.type){
    case"url":return normUrl(v.url);
    case"whatsapp":{const p=String(v.phone||"").replace(/\D/g,"");return p?`https://wa.me/${p}${v.message?`?text=${encodeURIComponent(v.message)}`:""}`:""}
    case"text":return String(v.text||"");
    case"email":{if(!v.email&&!v.subject&&!v.body)return"";const q=new URLSearchParams();if(v.subject)q.set("subject",v.subject);if(v.body)q.set("body",v.body);return `mailto:${String(v.email||"").trim()}${q.toString()?`?${q}`:""}`}
    case"phone":return v.phone?`tel:${String(v.phone).trim()}`:"";
    case"sms":return v.phone?`sms:${String(v.phone).trim()}${v.message?`?body=${encodeURIComponent(v.message)}`:""}`:"";
    case"wifi":{if(!v.ssid)return"";const sec=v.security||"WPA";return `WIFI:T:${sec};S:${escWifi(v.ssid)};${sec!=="nopass"&&v.password?`P:${escWifi(v.password)};`:""}H:${v.hidden?"true":"false"};;`}
    case"vcard":{
      if(!Object.values(v).some(x=>String(x||"").trim()))return"";
      const name=[v.firstName,v.lastName].filter(Boolean).join(" "),l=["BEGIN:VCARD","VERSION:3.0",`N:${esc(v.lastName)};${esc(v.firstName)};;;`,`FN:${esc(name)}`];
      if(v.company)l.push(`ORG:${esc(v.company)}`);if(v.title)l.push(`TITLE:${esc(v.title)}`);if(v.phone)l.push(`TEL;TYPE=CELL:${esc(v.phone)}`);if(v.email)l.push(`EMAIL:${esc(v.email)}`);if(v.url)l.push(`URL:${esc(normUrl(v.url))}`);
      if(v.street||v.city||v.region||v.postal||v.country)l.push(`ADR;TYPE=HOME:;;${esc(v.street)};${esc(v.city)};${esc(v.region)};${esc(v.postal)};${esc(v.country)}`);
      if(v.note)l.push(`NOTE:${esc(v.note)}`);l.push("END:VCARD");return l.join("\n");
    }
    case"geo":{
      if(v.latitude===""||v.longitude===""||v.latitude==null||v.longitude==null)return"";
      const lat=Number(v.latitude),lng=Number(v.longitude);
      if(!Number.isFinite(lat)||lat< -90||lat>90)throw Error("Latitude must be between -90 and 90.");
      if(!Number.isFinite(lng)||lng< -180||lng>180)throw Error("Longitude must be between -180 and 180.");
      return `geo:${lat},${lng}${v.label?`?q=${lat},${lng}(${encodeURIComponent(v.label)})`:""}`;
    }
    case"event":{
      if(!v.title&&!v.start&&!v.end&&!v.location&&!v.description)return"";
      const l=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT"];
      if(v.title)l.push(`SUMMARY:${esc(v.title)}`);if(v.start)l.push(`DTSTART:${icsDate(v.start)}`);if(v.end)l.push(`DTEND:${icsDate(v.end)}`);if(v.location)l.push(`LOCATION:${esc(v.location)}`);if(v.description)l.push(`DESCRIPTION:${esc(v.description)}`);l.push("END:VEVENT","END:VCALENDAR");return l.join("\n");
    }
    case"raw":return String(v.raw||"");
    default:return"";
  }
}

/* Capacity */
const caps={L:2953,M:2331,Q:1663,H:1273},bytes=s=>new TextEncoder().encode(s).length;
function updateCapacity(){
  let p="";try{p=payload()}catch{$("#capacitySize").textContent="Invalid data";$("#capacityLevel").textContent="Check input";$("#capacityFill").style.width="0%";return}
  const e=$("#errorCorrection").value,max=caps[e],n=bytes(p),pct=max?n/max*100:0,fill=$("#capacityFill");
  fill.style.width=`${Math.min(pct,100)}%`;fill.className="capacity-fill";let level="Empty";
  if(n){if(pct<20)level="Low density";else if(pct<50){level="Moderate";fill.classList.add("medium")}else if(pct<80){level="High density";fill.classList.add("medium")}else{level=pct>100?"Over capacity":"Very high";fill.classList.add("high")}}
  $("#capacitySize").textContent=`${n.toLocaleString()} B`;$("#capacityLevel").textContent=level;$("#capacityFoot").textContent=`${Math.round(pct)}% of the approximate ${max.toLocaleString()} B byte-mode maximum with ${e} error correction.`;
}

/* QR */
function options(data){
  const gradient=$("#gradientEnabled").checked,dots={type:$("#dotStyle").value};
  if(gradient)dots.gradient={type:$("#gradientType").value,rotation:Number($("#gradientRotation").value)*Math.PI/180,colorStops:[{offset:0,color:$("#dotColor").value},{offset:1,color:$("#gradientColor").value}]};
  else dots.color=$("#dotColor").value;
  return{width:Number($("#qrSize").value),height:Number($("#qrSize").value),type:"svg",data,margin:Number($("#quietZone").value),image:state.logo?.data,qrOptions:{errorCorrectionLevel:$("#errorCorrection").value},dotsOptions:dots,backgroundOptions:{color:$("#backgroundColor").value},cornersSquareOptions:{type:$("#cornerStyle").value,color:$("#cornerColor").value},cornersDotOptions:{type:$("#cornerDotStyle").value,color:$("#cornerDotColor").value},imageOptions:{hideBackgroundDots:$("#hideLogoDots").checked,imageSize:Number($("#logoSize").value),margin:Number($("#logoMargin").value),saveAsBlob:false}};
}
function showEmpty(text){state.qr=null;$("#qrMount").innerHTML="";const d=document.createElement("div");d.className="empty";d.textContent=text;$("#qrMount").append(d)}
function actionState(){
  const auto=$("#autoGenerate").checked,bad=!state.lastPayload||state.dirty;
  $("#generateButton").hidden=auto;$("#copyImage").disabled=bad;$("#downloadButton").disabled=bad;$("#actionMessage").textContent=!auto&&state.dirty?"Changes waiting to be generated":"";
}
async function generate(){
  clearTimeout(state.timer);let data;
  try{data=payload()}catch(e){state.lastPayload="";state.dirty=true;showEmpty(e.message);actionState();return}
  if(!data){state.lastPayload="";state.dirty=false;showEmpty("Enter content to generate a QR code.");actionState();return}
  if(typeof QRCodeStyling==="undefined"){state.lastPayload="";state.dirty=true;showEmpty("Local QR library could not be loaded.");actionState();return}
  try{
    if(!state.qr){$("#qrMount").innerHTML="";state.qr=new QRCodeStyling(options(data));state.qr.append($("#qrMount"))}else state.qr.update(options(data));
    state.lastPayload=data;state.dirty=false;actionState();
  }catch(e){console.error(e);state.lastPayload="";state.dirty=true;showEmpty("The QR code could not be generated. The content may be too large.");actionState()}
}
function changed(){state.dirty=true;updateCapacity();actionState();if(!$("#autoGenerate").checked)return;clearTimeout(state.timer);state.timer=setTimeout(generate,140)}

/* Logo */
function imageFromUrl(url){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error("The image could not be opened."));i.src=url})}
async function normalizeLogo(file){
  if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Choose a PNG, JPG or WebP image.");
  if(file.size>8*1024*1024)throw Error("The image is larger than 8 MB.");
  const url=URL.createObjectURL(file);
  try{
    const img=await imageFromUrl(url);if(!img.naturalWidth||!img.naturalHeight)throw Error("The selected image has invalid dimensions.");
    const size=512,c=document.createElement("canvas"),ctx=c.getContext("2d",{alpha:true});c.width=c.height=size;if(!ctx)throw Error("Image processing is unavailable.");
    const scale=Math.max(size/img.naturalWidth,size/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
    return{name:file.name,data:c.toDataURL("image/png")};
  }finally{URL.revokeObjectURL(url)}
}
$("#logoInput").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;$("#logoError").hidden=true;
  try{state.logo=await normalizeLogo(file);state.qr=null;$("#logoName").textContent=file.name;$("#logoFile").classList.add("visible");$("#errorCorrection").value="H";readouts();changed()}
  catch(err){state.logo=null;state.qr=null;e.target.value="";$("#logoFile").classList.remove("visible");$("#logoError").textContent=err.message;$("#logoError").hidden=false}
};
$("#removeLogo").onclick=()=>{state.logo=null;state.qr=null;$("#logoInput").value="";$("#logoName").textContent="";$("#logoFile").classList.remove("visible");$("#logoError").hidden=true;changed()};

/* Readouts */
function lum(hex){const x=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*x[0]+.7152*x[1]+.0722*x[2]}
function contrast(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function readouts(){
  $("#gradientSettings").hidden=!$("#gradientEnabled").checked;$("#gradientRotationValue").textContent=`${$("#gradientRotation").value}°`;$("#quietZoneValue").textContent=`${$("#quietZone").value} px`;$("#logoSizeValue").textContent=`${Math.round(Number($("#logoSize").value)*100)}%`;$("#logoMarginValue").textContent=`${$("#logoMargin").value} px`;
  const colors=[$("#dotColor").value,...($("#gradientEnabled").checked?[$("#gradientColor").value]:[])],ratio=Math.min(...colors.map(c=>contrast(c,$("#backgroundColor").value))),box=$("#contrastNotice");
  box.className="inline-status "+(ratio>=7?"success":ratio>=4?"warning":"danger");box.textContent=`${ratio>=7?"Strong":ratio>=4?"Moderate":"Low"} · ${ratio.toFixed(1)}:1${ratio<7?" · Test scanning":""}`;
  const size=Number($("#logoSize").value),safe=$("#logoSafety");safe.className="inline-status "+(size<=.26?"success":size<=.32?"warning":"danger");safe.textContent=size<=.26?"Recommended size":size<=.32?"Large · Use High and test":"Very large · Scanning may fail";
  updateCapacity();
}
[["dotColor","dotColorText"],["backgroundColor","backgroundColorText"],["cornerColor","cornerColorText"],["cornerDotColor","cornerDotColorText"],["gradientColor","gradientColorText"]].forEach(([p,t])=>{
  $(`#${p}`).oninput=()=>{$(`#${t}`).value=$(`#${p}`).value;readouts();changed()};
  $(`#${t}`).onchange=()=>{const v=$(`#${t}`).value.trim();if(/^#[0-9a-f]{6}$/i.test(v)){$(`#${p}`).value=v;$(`#${t}`).value=v.toLowerCase();readouts();changed()}else $(`#${t}`).value=$(`#${p}`).value};
});

/* Reset */
$("#resetDesign").onclick=()=>{
  Object.entries({dotStyle:"rounded",cornerStyle:"extra-rounded",cornerDotStyle:"dot",gradientType:"linear",gradientRotation:"45",errorCorrection:"H",quietZone:"16",logoSize:".22",logoMargin:"8"}).forEach(([k,v])=>$(`#${k}`).value=v);
  [["dotColor","#111111"],["backgroundColor","#ffffff"],["cornerColor","#111111"],["cornerDotColor","#111111"],["gradientColor","#536dfe"]].forEach(([k,v])=>{$(`#${k}`).value=v;$(`#${k}Text`).value=v});
  $("#gradientEnabled").checked=false;$("#hideLogoDots").checked=true;readouts();changed();
};

/* Export */
const safeName=s=>String(s||"qr-code").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g,"-").replace(/\.+$/,"").slice(0,80)||"qr-code";
function exportStatus(text,type=""){const e=$("#exportStatus");e.hidden=false;e.className=`notice ${type}`;e.textContent=text}
$("#downloadButton").onclick=async()=>{
  if(!state.qr||!state.lastPayload||state.dirty)return;
  const requested=$("#exportFormat").value,format=requested==="jpg"?"jpeg":requested,name=safeName($("#fileName").value);
  try{const blob=await state.qr.getRawData(format),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${name}.${requested}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);exportStatus(`Downloaded ${name}.${requested}`,"success")}
  catch(e){console.error(e);exportStatus("The QR code could not be downloaded.","danger")}
};
$("#copyImage").onclick=async()=>{
  if(!state.qr||!state.lastPayload||state.dirty)return;
  if(!navigator.clipboard||typeof ClipboardItem==="undefined"){exportStatus("Image clipboard is not supported by this browser.","warning");return}
  try{const blob=await state.qr.getRawData("png");await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);exportStatus("Image copied.","success")}
  catch(e){console.error(e);exportStatus("The browser blocked image clipboard access.","warning")}
};

/* Events */
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-pressed","false")});$$(".tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");b.setAttribute("aria-pressed","true");$(`[data-panel="${b.dataset.tab}"]`).classList.add("active")});
$$(".category").forEach(b=>b.onclick=()=>{state.category=b.dataset.category;$$(".category").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-pressed","false")});b.classList.add("active");b.setAttribute("aria-pressed","true");state.type=state.selected[state.category]||categories[state.category][0];render();changed()});
$("#formatSelect").onchange=e=>{state.type=e.target.value;state.selected[state.category]=state.type;render();changed()};
$("#dynamicFields").addEventListener("input",e=>{const f=e.target.closest("[data-field]");if(f){saveField(f);changed()}});
$("#dynamicFields").addEventListener("change",e=>{const f=e.target.closest("[data-field]");if(f){saveField(f);changed()}});
$$(".qr-control").forEach(x=>{x.addEventListener("input",()=>{readouts();changed()});x.addEventListener("change",()=>{readouts();changed()})});
$("#gradientEnabled").onchange=()=>{readouts();changed()};
$("#autoGenerate").onchange=()=>{actionState();if($("#autoGenerate").checked&&state.dirty)generate()};
$("#generateButton").onclick=generate;

applyTheme();render();readouts();actionState();
