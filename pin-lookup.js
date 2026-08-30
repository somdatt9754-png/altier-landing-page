/* JHAMM PIN lookup helper.
   Primary: India Post data mirrored in GitHub (CORS-friendly).
   Fallback: PostalPincode API.
*/
(function(){
  const INDIA_POST_SOURCE='https://raw.githubusercontent.com/IndiaPost/pin/master/api/v01/json/';
  const POSTAL_PINCODE_SOURCE='https://api.postalpincode.in/pincode/';
  const cache=new Map();

  async function fetchJson(url){
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }

  async function lookupFromIndiaPost(pin){
    const rows=await fetchJson(INDIA_POST_SOURCE+pin+'.json');
    if(!Array.isArray(rows)||!rows.length) throw new Error('PIN not found');

    const delivery=rows.find(r=>String(r.Deliverystatus||'').toLowerCase()==='delivery')||rows[0];
    return {
      pincode:pin,
      state:delivery.statename||rows[0].statename||'',
      district:delivery.Districtname||rows[0].Districtname||'',
      postOffice:delivery.officename||rows[0].officename||'',
      taluk:delivery.Taluk||rows[0].Taluk||''
    };
  }

  async function lookupFromPostalPincode(pin){
    const x=await fetchJson(POSTAL_PINCODE_SOURCE+pin);
    const rows=x&&x[0]&&x[0].PostOffice;
    if(!Array.isArray(rows)||!rows.length) throw new Error('PIN not found');

    const r=rows[0];
    return {
      pincode:pin,
      state:r.State||'',
      district:r.District||'',
      postOffice:r.Name||'',
      taluk:r.Block||r.Taluk||''
    };
  }

  window.jhammLookupPin=async function(pin){
    pin=String(pin||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(pin)) throw new Error('Invalid PIN');
    if(cache.has(pin)) return cache.get(pin);

    let result;

    try{
      result=await lookupFromIndiaPost(pin);
    }catch(primaryError){
      console.warn('India Post lookup failed, trying fallback:',primaryError);
      result=await lookupFromPostalPincode(pin);
    }

    cache.set(pin,result);
    return result;
  };
})();
