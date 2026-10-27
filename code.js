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
let fotoTomada = false;
let sesion = nuevaSesion();

function nuevaSesion() {
  return { registros: [], cambios: [], foto: null };
}

function generarTxt(datos) {
  const lineas = [
    'CINE CALI - REPORTE DE TAQUILLA',
    'Generado: ' + new Date().toLocaleString('es-CO'),
    '',
    'REGISTROS DE FUNCION',
  ];

  if (datos.registros.length === 0) lineas.push('Sin registros.');
  datos.registros.forEach((r, i) => {
    lineas.push((i + 1) + '. Pelicula: ' + r.pelicula + ' | ' + r.sala +
      ' | Boletas: ' + r.boletas + ' | Precio: ' + formato(PRECIO) + ' | Total: ' + formato(r.total));
  });

  lineas.push('', 'CAMBIO DE ASIENTO');
  if (datos.cambios.length === 0) lineas.push('Sin cambios.');
  datos.cambios.forEach((c, i) => {
    lineas.push((i + 1) + '. Asiento actual: ' + c.actual + ' | Nuevo: ' + c.nuevo +
      ' | Hora: ' + c.hora + ' | Recargo: ' + formato(c.recargo) + ' | Total: ' + formato(c.total));
  });

  const totalRecaudado = datos.registros.reduce((suma, r) => suma + r.total, 0);
  lineas.push('', 'FOTO DE CONTROL: ' + (datos.foto || 'No tomada'));
  lineas.push('TOTAL RECAUDADO: ' + formato(totalRecaudado));

  return lineas.join('\r\n');
}

function descargarTxt(texto, nombre) {
  // ﻿ hace que Notepad de Windows muestre bien las tildes
  const blob = new Blob(['﻿' + texto], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Solo se muestra una etapa a la vez
function show(id) {
  if (id !== 'login' && !logueado) id = 'login';

  document.querySelectorAll('.screen').forEach((s) => {
    s.hidden = s.id !== id;
  });

  if (id !== 'grafica') detenerCamara();
  if (id === 'asientos') renderMapa();
  if (id === 'grafica') {
    dibujarGrafica();
    iniciarCamara();
  }
  window.scrollTo(0, 0);
}

function mostrar(el, texto) {
  el.textContent = texto;
  el.hidden = false;
}

function formato(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}

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

// Registro y calculo
$('btnCalcular').addEventListener('click', () => {
  const boletas = parseInt($('boletas').value, 10);
  $('resultado').hidden = true;
  $('btnSiguiente1').hidden = true;

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
    sesion.registros.push({
      pelicula: $('pelicula').value.trim(),
      sala: $('sala').value,
      boletas,
      total,
    });
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
    $('btnSiguiente1').hidden = false;
    return;
  }

  // alert() bloquea hasta que el usuario acepta, asi que el login aparece despues
  alert('Clave incorrecta. Vuelva a ingresar.');
  logueado = false;
  show('login');
});

$('btnSiguiente1').addEventListener('click', () => show('asientos'));

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
  $('btnSiguiente2').hidden = true;

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
  sesion.cambios.push({
    actual: asientoActual,
    nuevo: asientoNuevo,
    hora: $('hora').value,
    recargo,
    total: PRECIO + recargo,
  });
  $('btnSiguiente2').hidden = false;
});

$('btnSiguiente2').addEventListener('click', () => show('grafica'));

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

// Camara: se pide al entrar a la etapa de foto
async function iniciarCamara() {
  if (stream || fotoTomada) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $('estadoCam').textContent = 'Este navegador no permite usar la cámara.';
    return;
  }

  $('estadoCam').textContent = 'Solicitando acceso a la cámara...';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    $('video').srcObject = stream;
    $('video').hidden = false;
    $('estadoCam').textContent = 'Cámara lista. Tome la foto.';
  } catch (e) {
    $('estadoCam').textContent = 'Sin acceso a la cámara. Permítalo en el navegador y recargue la página.';
  }
}

function detenerCamara() {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $('video').srcObject = null;
  $('video').hidden = true;
}

function tomarFoto() {
  const video = $('video');
  if (!stream || video.videoWidth === 0) {
    $('estadoCam').textContent = 'La cámara todavía no está lista.';
    return;
  }

  const canvas = $('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.filter = 'grayscale(100%)';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  const flash = $('flash');
  flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 150);

  $('foto').src = canvas.toDataURL('image/jpeg', 0.9);
  $('foto').hidden = false;
  sesion.foto = new Date().toLocaleString('es-CO');
  $('fotoHora').textContent = 'Foto tomada: ' + sesion.foto;
  $('estadoCam').textContent = 'Foto guardada.';

  fotoTomada = true;
  detenerCamara();
  $('btnFoto').textContent = 'Terminar';
}

function terminar() {
  const ahora = new Date();
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const nombre = 'reporte_taquilla_' + ahora.getFullYear() + dosDigitos(ahora.getMonth() + 1) +
    dosDigitos(ahora.getDate()) + '_' + dosDigitos(ahora.getHours()) + dosDigitos(ahora.getMinutes()) + '.txt';
  descargarTxt(generarTxt(sesion), nombre);
  sesion = nuevaSesion();

  fotoTomada = false;
  logueado = false;
  $('foto').hidden = true;
  $('foto').src = '';
  $('fotoHora').textContent = '';
  $('btnFoto').textContent = 'Tomar foto';
  show('login');
}

$('btnFoto').addEventListener('click', () => {
  if (fotoTomada) terminar();
  else tomarFoto();
});

show('login');
