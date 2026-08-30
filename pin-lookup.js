/* JHAMM Shop PIN lookup helper — Supabase pin_master */
(function(){
  const SOURCE='https://oljqgaqgxypzvavimkye.supabase.co/functions/v1/lookup-pin';
  const cache=new Map();

  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);

    const res=await fetch(SOURCE+'?pincode='+encodeURIComponent(pin),{
      method:'GET',
      cache:'no-store',
      headers:{'Accept':'application/json'}
    });

    let data=null;
    try{ data=await res.json(); }catch(_e){}
    if(!res.ok || !data || data.ok!==true) throw new Error((data&&data.error)||'PIN not found');

    const result={
      pincode:pin,
      state:data.state||'',
      district:data.district||'',
      postOffice:'',
      taluk:''
    };

    cache.set(pin,result);
    return result;
  };
})();
