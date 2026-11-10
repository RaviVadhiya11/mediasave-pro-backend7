(() => {
 const base=((window.MEDIASAVE_CONFIG||{}).API_BASE_URL||'').replace(/\/+$/,'');
 const status=document.getElementById('api-status'),dot=document.getElementById('dot');
 const form=document.getElementById('form'),url=document.getElementById('url'),clear=document.getElementById('clear');
 const submit=document.getElementById('submit'),result=document.getElementById('result'),output=document.getElementById('output');
 async function request(path,opts){const r=await fetch(base+path,opts||{});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={response:t}}if(!r.ok)throw new Error(JSON.stringify(d));return d}
 async function health(){try{await request('/api/health');status.textContent='ONLINE';dot.style.background='#45d49a';dot.style.boxShadow='0 0 10px #45d49a'}catch{status.textContent='SLEEPING / ERROR'}}
 clear.addEventListener('click',()=>{url.value='';result.hidden=true;url.focus()});
 form.addEventListener('submit',async e=>{e.preventDefault();if(!base){result.hidden=false;output.textContent='API_BASE_URL missing in app-config.js';return}submit.disabled=true;submit.firstChild.textContent=' Checking…';result.hidden=false;output.textContent='Contacting backend…';try{const data=await request('/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.value.trim()})});output.textContent=JSON.stringify(data,null,2)}catch(err){output.textContent='Request failed: '+err.message+'\n\nThe current V3 backend is a starter API, not a downloader. Provider integrations are not configured yet.'}finally{submit.disabled=false;submit.firstChild.textContent='Check link '}});
 health();
})();
