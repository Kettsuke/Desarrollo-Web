const PRECIO = 12000;
const INICIO_RECARGO = 15 * 60; // 3:00 p.m. en minutos
const FIN_RECARGO = 18 * 60;    // 6:00 p.m. en minutos
const FILAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLUMNAS = 8;

const $ = (id) => document.getElementById(id);

let logueado = false;
let recaudaciones = [36000, 48000, 24000]; // datos de ejemplo
let modo = 'actual';
let asientoActual = null;
let asientoNuevo = null;
let ocupados = new Set(['A-03', 'B-05', 'C-04', 'C-05', 'D-01', 'E-07', 'F-02']);
let stream = null;

function show(id) {
  // Sin sesion solo se ve el login
  if (id !== 'login' && !logueado) id = 'login';

  document.querySelectorAll('.screen').forEach((s) => {
    s.hidden = s.id !== id;
  });
  document.querySelectorAll('nav button[data-go]').forEach((b) => {
    b.classList.toggle('current', b.dataset.go === id);
  });
  $('nav').hidden = !logueado;

  if (id === 'asientos') renderMapa();
  if (id === 'grafica') dibujarGrafica();
  window.scrollTo(0, 0);
}

function mostrar(el, texto) {
  el.textContent = texto;
  el.hidden = false;
}

function formato(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

// Navegacion
document.querySelectorAll('nav button[data-go]').forEach((b) => {
  b.addEventListener('click', () => show(b.dataset.go));
});

// Login
$('btnLogin').addEventListener('click', () => {
  const ok = $('user').value === 'Cinecali' && $('pass').value === 'Estrenos';
  if (!ok) {
    mostrar($('loginMsg'), 'Usuario o contraseña incorrectos.');
    return;
  }
  logueado = true;
  $('loginMsg').hidden = true;
  $('pass').value = '';
  show('panel');
});

$('btnSalir').addEventListener('click', () => {
  logueado = false;
  $('user').value = '';
  $('pass').value = '';
  show('login');
});

// Registro y calculo
$('btnCalcular').addEventListener('click', () => {
  const boletas = parseInt($('boletas').value, 10);
  $('resultado').hidden = true;

  if (!$('pelicula').value.trim() || !(boletas > 0)) {
    mostrar($('panelMsg'), 'Complete la película y una cantidad de boletas mayor a 0.');
    return;
  }
  $('panelMsg').hidden = true;
  $('reloj').hidden = false;

  setTimeout(() => {
    $('reloj').hidden = true;
    const total = boletas * PRECIO;
    $('totalTxt').textContent = formato(total);
    $('resultado').hidden = false;
    recaudaciones.push(total);
    $('clave').value = '';
    $('overlayClave').hidden = false;
    $('clave').focus();
  }, 1500);
});

// Clave CINE
$('btnClave').addEventListener('click', () => {
  $('overlayClave').hidden = true;

  if ($('clave').value === 'CINE') {
    $('pelicula').value = '';
    $('boletas').value = '';
    $('resultado').hidden = true;
    return;
  }

  logueado = false;
  show('login');
  mostrar($('loginMsg'), 'Clave incorrecta. Vuelva a ingresar.');
});

// Cambio de asiento
function renderMapa() {
  const mapa = $('mapa');
  if (mapa.childElementCount) {
    actualizarMapa();
    return;
  }

  FILAS.forEach((fila) => {
    const etiqueta = document.createElement('div');
    etiqueta.className = 'fila';
    etiqueta.textContent = fila;
    mapa.appendChild(etiqueta);

    for (let col = 1; col <= COLUMNAS; col++) {
      const id = fila + '-' + String(col).padStart(2, '0');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seat';
      btn.dataset.id = id;
      btn.textContent = id.slice(2);
      btn.addEventListener('click', () => elegirAsiento(id));
      mapa.appendChild(btn);
    }
  });
  actualizarMapa();
}

function elegirAsiento(id) {
  if (modo === 'actual') {
    asientoActual = id;
  } else {
    if (ocupados.has(id) || id === asientoActual) return;
    asientoNuevo = id;
  }
  actualizarMapa();
}

function actualizarMapa() {
  document.querySelectorAll('.seat').forEach((btn) => {
    const id = btn.dataset.id;
    btn.className = 'seat';
    if (id === asientoActual) btn.classList.add('actual');
    else if (id === asientoNuevo) btn.classList.add('nuevo');
    else if (ocupados.has(id)) btn.classList.add('ocupado');
  });
  $('selActual').textContent = asientoActual || '—';
  $('selNuevo').textContent = asientoNuevo || '—';
}

function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  $('modoActual').classList.toggle('activo', modo === 'actual');
  $('modoNuevo').classList.toggle('activo', modo === 'nuevo');
}

$('modoActual').addEventListener('click', () => cambiarModo('actual'));
$('modoNuevo').addEventListener('click', () => cambiarModo('nuevo'));
cambiarModo('actual');

$('btnAsiento').addEventListener('click', () => {
  if (!asientoActual || !asientoNuevo) {
    mostrar($('asientoMsg'), 'Seleccione el asiento actual y el nuevo en el mapa.');
    $('tablaAsiento').hidden = true;
    return;
  }

  const [h, m] = $('hora').value.split(':').map(Number);
  const minutos = h * 60 + m;
  const enRango = minutos >= INICIO_RECARGO && minutos <= FIN_RECARGO;
  const recargo = enRango ? PRECIO * 0.05 : 0;

  $('vBase').textContent = formato(PRECIO);
  $('vRecargo').textContent = formato(recargo);
  $('vTotal').textContent = formato(PRECIO + recargo);
  $('tablaAsiento').hidden = false;

  mostrar($('asientoMsg'), enRango
    ? 'Cambio dentro del horario: se aplica recargo.'
    : 'Cambio fuera del horario: sin recargo.');
});

// Grafica de lineas
function dibujarGrafica() {
  const x0 = 50;
  const x1 = 580;
  const y0 = 220;
  const y1 = 20;
  const max = Math.max(...recaudaciones, 1) * 1.1;
  const paso = recaudaciones.length > 1 ? (x1 - x0) / (recaudaciones.length - 1) : 0;

  const pts = recaudaciones.map((v, i) => ({
    x: x0 + i * paso,
    y: y0 - (v / max) * (y0 - y1),
    v,
  }));

  $('linea').setAttribute('points', pts.map((p) => p.x + ',' + p.y).join(' '));
  $('puntos').innerHTML = pts.map((p) =>
    '<circle cx="' + p.x + '" cy="' + p.y + '" r="4"/>' +
    '<text x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle">' + Math.round(p.v / 1000) + 'k</text>'
  ).join('');
}

// Camara y foto
async function activarCamara() {
  const video = $('video');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $('estadoCam').textContent = 'Este navegador no permite usar la cámara. Se usará imagen simulada.';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.hidden = false;
    $('estadoCam').textContent = 'Cámara activa.';
    $('btnCamara').textContent = 'Cámara activa';
  } catch (e) {
    $('estadoCam').textContent = 'No se pudo usar la cámara. Se usará imagen simulada.';
  }
}

function dibujarSimulada(ctx, w, h) {
  const fondo = ctx.createLinearGradient(0, 0, 0, h);
  fondo.addColorStop(0, '#555');
  fondo.addColorStop(1, '#151515');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#bbb';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.4, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.95, w * 0.28, h * 0.42, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#ddd';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('IMAGEN SIMULADA', w / 2, h - 18);
}

$('btnCamara').addEventListener('click', activarCamara);

$('btnFoto').addEventListener('click', () => {
  const video = $('video');
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const usaCamara = stream && video.videoWidth > 0;

  canvas.width = usaCamara ? video.videoWidth : 640;
  canvas.height = usaCamara ? video.videoHeight : 480;

  ctx.filter = 'grayscale(100%)';
  if (usaCamara) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } else {
    dibujarSimulada(ctx, canvas.width, canvas.height);
  }
  ctx.filter = 'none';

  const flash = $('flash');
  flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 150);

  const hora = new Date().toLocaleString('es-CO');
  $('foto').src = canvas.toDataURL('image/jpeg', 0.9);
  $('foto').hidden = false;
  $('fotoHora').textContent = 'Foto ' + (usaCamara ? '' : 'simulada ') + 'tomada: ' + hora;
});

show('login');
