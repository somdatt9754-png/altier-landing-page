/* JHAMM Shop PIN lookup helper. */
(function(){
  const SOURCE='https://raw.githubusercontent.com/IndiaPost/pin/master/api/v01/json/';
  const cache=new Map();
  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);
    const res=await fetch(SOURCE+pin+'.json',{cache:'force-cache'});
    if(!res.ok) throw new Error('PIN not found');
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length) throw new Error('PIN not found');
    const delivery=rows.find(r=>String(r.Deliverystatus).toLowerCase()==='delivery')||rows[0];
    const result={pincode:pin,state:delivery.statename||rows[0].statename||'',district:delivery.Districtname||rows[0].Districtname||'',postOffice:delivery.officename||rows[0].officename||'',taluk:delivery.Taluk||rows[0].Taluk||''};
    cache.set(pin,result);
    return result;
  };
})();