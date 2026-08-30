/* JHAMM PIN lookup helper — direct read from local Supabase master. */
(function(){
  const REST_URL='https://oljqgaqgxypzvavimkye.supabase.co/rest/v1/pin_master';
  const API_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sanFnYXFneHlwenZhdmlta3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTk0MzIsImV4cCI6MjEwMjM3NTQzMn0.6tWKMS8uaZ-Eid3y52WOqWEtAqI7XznLrGiiyD_TSk4';
  const cache=new Map();

  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);

    const url=REST_URL+'?select=pincode,city,district,state&pincode=eq.'+encodeURIComponent(pin)+'&limit=1';
    const res=await fetch(url,{
      cache:'no-store',
      headers:{
        apikey:API_KEY,
        Authorization:'Bearer '+API_KEY
      }
    });

    const rows=await res.json().catch(()=>[]);
    if(!res.ok || !Array.isArray(rows) || !rows.length){
      throw new Error('PIN not found');
    }

    const row=rows[0]||{};
    const result={
      pincode:pin,
      city:row.city||row.district||'',
      postOffice:row.city||row.district||'',
      district:row.district||'',
      state:row.state||''
    };

    if(!result.city && !result.state) throw new Error('PIN not found');
    cache.set(pin,result);
    return result;
  };

  function cleanLocationLabel(){
    const label=document.querySelector('label[for="city"]');
    if(label) label.textContent='शहर';
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',cleanLocationLabel,{once:true});
  }else{
    cleanLocationLabel();
  }
})();
