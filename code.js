  const PRECIO = 12000;
  const $ = (id) => document.getElementById(id);

  // Datos de ejemplo para la gráfica
  let recaudaciones = [36000, 48000, 24000];

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('current', b.dataset.go === id));
    if (id === 'grafica') dibujarGrafica();
  }

  function mostrar(el, texto) {
    el.textContent = texto;
    el.classList.add('show');
  }

  function formato(n) {
    return '$ ' + Math.round(n).toLocaleString('es-CO');
  }

  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => show(b.dataset.go));
  });

  // 1. Login
  $('btnLogin').addEventListener('click', () => {
    const ok = $('user').value === 'Cinecali' && $('pass').value === 'Estrenos';
    if (ok) {
      $('loginMsg').classList.remove('show');
      show('panel');
    } else {
      mostrar($('loginMsg'), 'Usuario o contraseña incorrectos.');
    }
  });

  // 2. Calcular recaudacion
  $('btnCalcular').addEventListener('click', () => {
    const boletas = parseInt($('boletas').value, 10);
    $('resultado').classList.remove('show');
    if (!$('pelicula').value.trim() || !(boletas > 0)) {
      mostrar($('panelMsg'), 'Complete la película y una cantidad de boletas mayor a 0.');
      return;
    }
    $('panelMsg').classList.remove('show');
    $('reloj').classList.add('show');

    setTimeout(() => {
      $('reloj').classList.remove('show');
      const total = boletas * PRECIO;
      $('totalTxt').textContent = formato(total);
      $('resultado').classList.add('show');
      recaudaciones.push(total);
      $('overlayClave').classList.add('show');
      $('clave').value = '';
      $('clave').focus();
    }, 1500);
  });

  // Clave de seguridad
  $('btnClave').addEventListener('click', () => {
    if ($('clave').value === 'CINE') {
      $('overlayClave').classList.remove('show');
      $('pelicula').value = '';
      $('boletas').value = '';
      $('resultado').classList.remove('show');
    } else {
      $('overlayClave').classList.remove('show');
      show('login');
      mostrar($('loginMsg'), 'Clave incorrecta. Vuelva a ingresar.');
    }
  });

  // 3. Cambio de asiento con recargo
  $('btnAsiento').addEventListener('click', () => {
    const [h, m] = $('hora').value.split(':').map(Number);
    const minutos = h * 60 + m;
    const enRango = minutos >= 15 * 60 && minutos <= 18 * 60;
    const recargo = enRango ? PRECIO * 0.05 : 0;

    $('vBase').textContent = formato(PRECIO);
    $('vRecargo').textContent = formato(recargo);
    $('vTotal').textContent = formato(PRECIO + recargo);
    $('tablaAsiento').style.display = 'table';
    mostrar($('asientoMsg'), enRango
      ? 'Cambio dentro del horario con recargo.'
      : 'Cambio fuera del horario, sin recargo.');
  });

  // 4. Grafica de lineas
  function dibujarGrafica() {
    const x0 = 50, x1 = 580, y0 = 220, y1 = 20;
    const max = Math.max(...recaudaciones, 1) * 1.1;
    const paso = recaudaciones.length > 1 ? (x1 - x0) / (recaudaciones.length - 1) : 0;
    const pts = recaudaciones.map((v, i) => {
      const x = x0 + i * paso;
      const y = y0 - (v / max) * (y0 - y1);
      return { x, y, v };
    });
    $('linea').setAttribute('points', pts.map(p => p.x + ',' + p.y).join(' '));
    $('puntos').innerHTML = pts.map(p =>
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#111"/>' +
      '<text x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle">' + Math.round(p.v / 1000) + 'k</text>'
    ).join('');
  }

  $('btnFoto').addEventListener('click', () => {
    $('foto').classList.add('captured');
    $('foto').textContent = 'Foto capturada (simulada) ' + new Date().toLocaleTimeString('es-CO');
  });

  show('login');
