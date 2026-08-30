/* JHAMM PIN lookup helper — local Supabase master only. */
(function(){
  const LOOKUP_URL='https://oljqgaqgxypzvavimkye.supabase.co/functions/v1/lookup-pin';
  const cache=new Map();

  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);

    const res=await fetch(LOOKUP_URL+'?pincode='+encodeURIComponent(pin)+'&v=2',{cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok || !data.ok) throw new Error(data.error||'PIN not found');

    const city=data.city || data.district || '';
    const district=data.district || '';
    const state=data.state || '';

    if(!city && !state) throw new Error('PIN not found');

    const result={
      pincode:pin,
      city,
      postOffice:city,
      district,
      state
    };

    cache.set(pin,result);
    return result;
  };

  // Final customer-facing form: PIN -> City + State only.
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
