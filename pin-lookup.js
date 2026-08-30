/* JHAMM PIN lookup helper — local/master-only lookup. */
(function(){
  const MASTER_SOURCE='https://raw.githubusercontent.com/IndiaPost/pin/master/api/v01/json/';
  const cache=new Map();

  async function fetchMaster(pin){
    const res=await fetch(MASTER_SOURCE+pin+'.json',{cache:'no-store'});
    if(!res.ok) throw new Error('PIN not found');
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length) throw new Error('PIN not found');
    return rows;
  }

  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);

    const rows=await fetchMaster(pin);
    const first=rows[0]||{};

    // One PIN may have multiple post offices. We intentionally do NOT
    // expose/post a default post-office name to the customer.
    const result={
      pincode:pin,
      state:first.statename||'',
      district:first.Districtname||'',
      city:first.Districtname||''
    };

    if(!result.state && !result.city) throw new Error('PIN not found');

    cache.set(pin,result);
    return result;
  };
})();