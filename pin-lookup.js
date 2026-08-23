document.addEventListener('DOMContentLoaded', () => {
  const pin = document.getElementById('pin');
  const state = document.getElementById('state');
  if (!pin || !state) return;

  let district = document.getElementById('district');
  if (!district) {
    const stateInput = state;
    const districtWrap = document.createElement('div');
    districtWrap.innerHTML = '<label for="district">जिला</label><input id="district" type="text" readonly placeholder="पिन कोड से पता चलेगा">';
    const grid = stateInput.closest('.grid2');
    if (grid) grid.appendChild(districtWrap.firstElementChild.nextElementSibling);
    district = document.getElementById('district');
  }

  const postOffice = document.getElementById('postOffice');
  let timer;
  pin.addEventListener('input', () => {
    clearTimeout(timer);
    const value = pin.value.replace(/\D/g, '').slice(0, 6);
    pin.value = value;
    state.value = '';
    if (district) district.value = '';
    if (postOffice) postOffice.value = '';
    if (value.length !== 6) return;
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.postalpincode.in/pincode/${value}`, { cache: 'no-store' });
        const data = await r.json();
        const offices = data?.[0]?.PostOffice;
        if (!Array.isArray(offices) || !offices.length) throw new Error('Invalid PIN');
        const first = offices[0];
        state.value = first.State || '';
        if (district) district.value = first.District || '';
        if (postOffice) postOffice.value = first.Name || '';
      } catch {
        state.value = 'PIN Code नहीं मिला';
        if (district) district.value = '';
        if (postOffice) postOffice.value = '';
      }
    }, 200);
  });
});
