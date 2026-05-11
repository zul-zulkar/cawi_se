/* ====== AMBIL LOKASI GPS ====== */
let _lokasiMap = null;
let _lokasiMarker = null;
let _lokasiCircle = null;

function renderLokasiMap(lat, lng, akurasi) {
  const wrap = document.getElementById('lokasiMapWrap');
  if (!wrap) return;
  wrap.style.display = 'block';

  const latF = parseFloat(lat);
  const lngF = parseFloat(lng);
  const acc  = parseInt(akurasi) || 0;

  if (_lokasiMap) {
    setTimeout(() => {
      _lokasiMap.invalidateSize();
      _lokasiMap.setView([latF, lngF], 17);
      if (_lokasiMarker) _lokasiMarker.setLatLng([latF, lngF]);
      if (_lokasiCircle) { _lokasiCircle.setLatLng([latF, lngF]); _lokasiCircle.setRadius(acc); }
    }, 50);
    return;
  }

  // Tunggu 2 frame agar browser selesai render container sebelum Leaflet ukur dimensi
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      _lokasiMap = L.map('lokasiMap', {zoomControl: true, attributionControl: true}).setView([latF, lngF], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(_lokasiMap);

      const icon = L.divIcon({
        html: '<div style="background:#fc6c00;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      _lokasiMarker = L.marker([latF, lngF], {icon}).addTo(_lokasiMap)
        .bindPopup('<b>Lokasi Kunjungan</b><br>Lat: ' + lat + '<br>Lng: ' + lng + (acc ? '<br>Akurasi: ±' + acc + ' m' : ''))
        .openPopup();

      if (acc > 0) {
        _lokasiCircle = L.circle([latF, lngF], {
          radius: acc,
          color: '#fc6c00',
          fillColor: '#fc6c00',
          fillOpacity: 0.12,
          weight: 1.5
        }).addTo(_lokasiMap);
      }

      setTimeout(() => _lokasiMap && _lokasiMap.invalidateSize(), 300);
    });
  });
}

function ambilLokasi() {
  const btn = document.getElementById('lokasiBtn');
  const result = document.getElementById('lokasiResult');
  btn.innerHTML = '&#9203; Mengambil lokasi...';
  btn.disabled = true;
  btn.style.background = '#aaa';

  if (!navigator.geolocation) {
    result.innerHTML = '<span style="color:#c53030">&#10005; Browser tidak mendukung GPS.</span>';
    btn.innerHTML = '&#128205; Ambil Lokasi GPS';
    btn.disabled = false;
    btn.style.background = '#fc6c00';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      const akurasi = Math.round(pos.coords.accuracy);
      document.getElementById('lokasi_lat').value = lat;
      document.getElementById('lokasi_lng').value = lng;
      document.getElementById('lokasi_akurasi').value = akurasi;
      result.innerHTML =
        '<div style="color:#276749;font-weight:700;margin-bottom:4px">&#10003; Lokasi berhasil diambil</div>' +
        '<div style="color:#555">Lat: <strong>' + lat + '</strong> &nbsp;|&nbsp; Lng: <strong>' + lng + '</strong></div>' +
        '<div style="color:#888;font-size:11.5px;margin-top:2px">Akurasi: ±' + akurasi + ' meter</div>';
      result.style.background = '#f0fff4';
      result.style.borderColor = '#68d391';
      btn.innerHTML = '&#10003; Lokasi Terekam';
      btn.style.background = '#276749';
      btn.dataset.done = '1';
      btn.disabled = false;
      btn.onmouseover = null;
      btn.onmouseout = null;
      markFieldFilled(document.getElementById('lokasi_lat'));
      renderLokasiMap(lat, lng, akurasi);
    },
    function(err) {
      const msg = err.code === 1 ? 'Izin GPS ditolak — aktifkan lokasi di browser.' :
                  err.code === 2 ? 'Sinyal GPS tidak tersedia.' : 'Waktu habis, coba lagi.';
      result.innerHTML = '<span style="color:#c53030">&#10005; ' + msg + '</span>';
      result.style.background = '#fff5f5';
      result.style.borderColor = '#feb2b2';
      btn.innerHTML = '&#128205; Coba Lagi';
      btn.disabled = false;
      btn.style.background = '#fc6c00';
    },
    {enableHighAccuracy: true, timeout: 12000, maximumAge: 0}
  );
}
