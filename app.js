/* -------------------------------------------------------------
   CONTROLADOR DE NEGOCIO Y DOM (VANILLA JS) - SEGURTRACK
   ------------------------------------------------------------- */

// 1. INICIALIZACIÓN DE LA BASE DE DATOS (IndexedDB con Dexie.js)
const db = new Dexie('SegurTrackDB');
db.version(1).stores({
  policies: 'poliza, asegurado, ramo, vto, saldo, emision, fNac'
});

// VARIABLES DE ESTADO GLOBAL
let allPolicies = [];
let filteredPolicies = [];
let activeSection = 'dashboard-section';
let currentSortColumn = 'dias';
let currentSortOrder = 'asc'; // 'asc' o 'desc'
let filterStatus = 'all'; // 'all', 'green', 'yellow', 'red'
let filterRamo = 'all';

// DOM ELEMENTOS
const sidebarLinks = document.querySelectorAll('.menu-item');
const appSections = document.querySelectorAll('.app-section');
const pageTitle = document.getElementById('page-title');
const globalSearch = document.getElementById('global-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const themeToggle = document.getElementById('theme-toggle');
const bellBtn = document.getElementById('bell-btn');
const bellBadge = document.getElementById('bell-badge');
const notificationsPanel = document.getElementById('notifications-panel');
const notificationsList = document.getElementById('notifications-list');
const notificationsCountDesc = document.getElementById('notifications-count-desc');
const mobileToggle = document.getElementById('mobile-toggle');
const sidebar = document.getElementById('sidebar');

// 2. CICLO DE VIDA DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar Tema desde LocalStorage
  const savedTheme = localStorage.getItem('theme') || 'dark-theme';
  document.body.className = savedTheme;

  // Cargar datos iniciales
  await refreshData();
  setupEventListeners();
  navigateToSection('dashboard-section');
});

// 3. EVENT LISTENERS PRINCIPALES
function setupEventListeners() {
  // Navegación Sidebar
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSectionId = link.getAttribute('data-target');
      navigateToSection(targetSectionId);
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
      }
    });
  });

  // Toggle de Menú Móvil
  mobileToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Toggle Tema Claro/Oscuro
  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.className = 'light-theme';
      localStorage.setItem('theme', 'light-theme');
      showToast('Modo claro activado', 'info');
    } else {
      document.body.className = 'dark-theme';
      localStorage.setItem('theme', 'dark-theme');
      showToast('Modo oscuro activado', 'info');
    }
  });

  // Buscar en tiempo real
  globalSearch.addEventListener('input', () => {
    if (globalSearch.value.trim().length > 0) {
      searchClearBtn.style.display = 'block';
    } else {
      searchClearBtn.style.display = 'none';
    }
    applyFiltersAndRender();
  });

  searchClearBtn.addEventListener('click', () => {
    globalSearch.value = '';
    searchClearBtn.style.display = 'none';
    applyFiltersAndRender();
    globalSearch.focus();
  });

  // Campanita de Notificaciones (Toggle Panel)
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsPanel.classList.toggle('active');
  });

  // Cerrar paneles flotantes al hacer clic afuera
  document.addEventListener('click', (e) => {
    if (!notificationsPanel.contains(e.target) && e.target !== bellBtn) {
      notificationsPanel.classList.remove('active');
    }
  });

  // Filtros de Estado en la Sección Pólizas
  const filterStatusBtns = document.querySelectorAll('.filter-status-btn');
  filterStatusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterStatusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterStatus = btn.getAttribute('data-status');
      applyFiltersAndRender();
    });
  });

  // Filtro de Ramo en la Sección Pólizas
  const filterRamoDropdown = document.getElementById('filter-ramo');
  filterRamoDropdown.addEventListener('change', () => {
    filterRamo = filterRamoDropdown.value;
    applyFiltersAndRender();
  });

  // Agregar Póliza Manual (Botones)
  document.getElementById('btn-add-policy-manual').addEventListener('click', () => openPolicyModal());
  document.getElementById('dashboard-btn-new-policy').addEventListener('click', () => openPolicyModal());
  document.getElementById('btn-close-modal').addEventListener('click', closePolicyModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closePolicyModal);

  // Guardado de Póliza Manual (Submit Form)
  document.getElementById('policy-form').addEventListener('submit', handleSavePolicyManual);

  // Cabeceras de Tabla Ordenables
  const sortableHeaders = document.querySelectorAll('.data-table th.sortable');
  sortableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (currentSortColumn === col) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortColumn = col;
        currentSortOrder = 'asc';
      }
      
      // Actualizar visual de ordenación
      sortableHeaders.forEach(h => {
        const icon = h.querySelector('.sort-icon');
        icon.textContent = '↕';
      });
      const icon = th.querySelector('.sort-icon');
      icon.textContent = currentSortOrder === 'asc' ? '▲' : '▼';
      
      applyFiltersAndRender();
    });
  });

  // Configuración de Drag & Drop para Importar Excel
  setupDragAndDrop();

  // Exportar / Importar Base de Datos JSON
  document.getElementById('btn-export-db').addEventListener('click', handleExportDatabase);
  document.getElementById('btn-trigger-import-db').addEventListener('click', () => {
    document.getElementById('import-db-input').click();
  });
  document.getElementById('import-db-input').addEventListener('change', handleImportDatabase);

  // Resetear Base de Datos
  document.getElementById('btn-reset-db').addEventListener('click', handleResetDatabase);

  // Generar Plantilla de Demostración XLSX
  document.getElementById('btn-generate-demo-xlsx').addEventListener('click', handleGenerateDemoExcel);
}

// 4. CONTROL DE VISTAS Y NAVEGACIÓN
function navigateToSection(sectionId) {
  activeSection = sectionId;
  
  // Ocultar todas las secciones y activar la seleccionada
  appSections.forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(sectionId);
  if (activeSec) activeSec.classList.add('active');

  // Actualizar clases activas en sidebar
  sidebarLinks.forEach(link => {
    if (link.getAttribute('data-target') === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Ajustar Título de Cabecera y Barra de Búsqueda
  const searchContainer = document.getElementById('header-search-container');
  if (sectionId === 'dashboard-section') {
    pageTitle.textContent = 'Tablero Principal';
    searchContainer.style.visibility = 'hidden';
  } else if (sectionId === 'policies-section') {
    pageTitle.textContent = 'Clientes y Pólizas';
    searchContainer.style.visibility = 'visible';
  } else if (sectionId === 'import-section') {
    pageTitle.textContent = 'Importar Planilla Excel';
    searchContainer.style.visibility = 'hidden';
  } else if (sectionId === 'settings-section') {
    pageTitle.textContent = 'Configuración';
    searchContainer.style.visibility = 'hidden';
  }
}

// 5. OBTENCIÓN Y PROCESAMIENTO DE DATOS (DEXIE / INDEXEDDB)
async function refreshData() {
  try {
    // Obtener todos los registros de Dexie
    const rawPolicies = await db.policies.toArray();
    
    // Mapear y procesar estados del semáforo basándose en fechas del día actual
    allPolicies = rawPolicies.map(pol => {
      const dias = getDaysDifference(pol.vto);
      let status = 'green'; // Por defecto verde
      
      if (pol.paused) {
        status = 'paused';
      } else if (dias <= 0) {
        status = 'red';
      } else if (dias >= 1 && dias <= 15) {
        status = 'yellow';
      }
      
      return {
        ...pol,
        diasRestantes: dias,
        status: status
      };
    });

    // Rellenar filtros de ramos
    populateRamoDropdown();
    
    // Aplicar filtros actuales y renderizar vistas
    applyFiltersAndRender();
    
    // Renderizar métricas del dashboard
    renderMetrics();

    // Actualizar Panel de Notificaciones
    renderNotificationsPanel();

  } catch (error) {
    console.error("Error cargando los datos de IndexedDB", error);
    showToast("Error al cargar los datos del sistema", "error");
  }
}

// Lógica de Diferencia de Días
function getDaysDifference(dateVal) {
  if (!dateVal) return -9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(dateVal);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Rellenar Selector de Ramos
function populateRamoDropdown() {
  const dropdown = document.getElementById('filter-ramo');
  if (!dropdown) return;
  
  // Guardar valor seleccionado
  const selected = dropdown.value;
  
  // Obtener ramos únicos
  const ramos = [...new Set(allPolicies.map(p => p.ramo.toUpperCase()))].sort();
  
  // Limpiar
  dropdown.innerHTML = '<option value="all">Todos los Ramos</option>';
  
  // Rellenar
  ramos.forEach(ramo => {
    if (ramo) {
      const opt = document.createElement('option');
      opt.value = ramo;
      opt.textContent = ramo;
      dropdown.appendChild(opt);
    }
  });
  
  // Reestablecer selección
  if (ramos.includes(selected)) {
    dropdown.value = selected;
  } else {
    dropdown.value = 'all';
    filterRamo = 'all';
  }
}

// 6. RENDERIZACIÓN DE COMPONENTES DE INTERFAZ

// Métricas de Dashboard
function renderMetrics() {
  const total = allPolicies.length;
  const green = allPolicies.filter(p => p.status === 'green').length;
  const yellow = allPolicies.filter(p => p.status === 'yellow').length;
  const red = allPolicies.filter(p => p.status === 'red').length;
  const paused = allPolicies.filter(p => p.status === 'paused').length;

  document.getElementById('stat-total-clients').textContent = total;
  document.getElementById('stat-green').textContent = green;
  document.getElementById('stat-yellow').textContent = yellow;
  document.getElementById('stat-red').textContent = red;
  document.getElementById('stat-paused').textContent = paused;
}

// Tabla de Datos e Interacción
function applyFiltersAndRender() {
  const searchQuery = globalSearch.value.trim().toLowerCase();
  
  // 1. Filtrado
  filteredPolicies = allPolicies.filter(pol => {
    // Filtro por Buscador (nombre, póliza o ramo)
    const matchesSearch = !searchQuery || 
      pol.asegurado.toLowerCase().includes(searchQuery) ||
      pol.poliza.toLowerCase().includes(searchQuery) ||
      pol.ramo.toLowerCase().includes(searchQuery);
      
    // Filtro por Estado (Verde, Amarillo, Rojo)
    const matchesStatus = filterStatus === 'all' || pol.status === filterStatus;
    
    // Filtro por Ramo
    const matchesRamo = filterRamo === 'all' || pol.ramo.toUpperCase() === filterRamo;
    
    return matchesSearch && matchesStatus && matchesRamo;
  });

  // 2. Ordenamiento
  filteredPolicies.sort((a, b) => {
    let valA = a[currentSortColumn];
    let valB = b[currentSortColumn];

    // Manejar casos virtuales/calculados
    if (currentSortColumn === 'dias') {
      valA = a.diasRestantes;
      valB = b.diasRestantes;
    } else if (currentSortColumn === 'vto') {
      valA = new Date(a.vto).getTime();
      valB = new Date(b.vto).getTime();
    } else if (currentSortColumn === 'saldo') {
      valA = parseFloat(a.saldo) || 0;
      valB = parseFloat(b.saldo) || 0;
    } else {
      // Ordenamiento de cadenas normal
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 3. Renderizar en la Tabla
  renderTable();
}

function renderTable() {
  const tableBody = document.getElementById('policies-table-body');
  const resultsCounter = document.getElementById('results-counter');
  
  if (!tableBody) return;

  resultsCounter.textContent = `Mostrando ${filteredPolicies.length} registros`;

  if (filteredPolicies.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table-message">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            <p>No se encontraron pólizas con los filtros seleccionados.</p>
            <span>Intenta modificar tu búsqueda o importar registros nuevos.</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = filteredPolicies.map(pol => {
    let statusClass = 'row-green';
    let statusLabel = 'Vigente';
    let daysLabel = `${pol.diasRestantes} días`;
    
    if (pol.status === 'red') {
      statusClass = 'row-red';
      statusLabel = 'Vencido';
      daysLabel = pol.diasRestantes <= 0 ? `Vencido hace ${Math.abs(pol.diasRestantes)} días` : 'Vence hoy';
      if (pol.diasRestantes === 0) daysLabel = 'Vence hoy';
    } else if (pol.status === 'yellow') {
      statusClass = 'row-yellow';
      statusLabel = 'Próximo';
      daysLabel = `Vence en ${pol.diasRestantes} días`;
    } else if (pol.status === 'paused') {
      statusClass = 'row-paused';
      statusLabel = 'En Pausa';
      daysLabel = 'Pausado';
    }

    const formattedSaldo = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(pol.saldo || 0);
    const formattedVto = formatDateToReadable(pol.vto);

    return `
      <tr class="${statusClass}" id="row-pol-${pol.poliza.replace(/[^a-zA-Z0-9]/g, '')}">
        <td><strong>${pol.asegurado.toUpperCase()}</strong></td>
        <td><code class="poliza-code">${pol.poliza}</code></td>
        <td><span class="ramo-tag">${pol.ramo.toUpperCase()}</span></td>
        <td>${formattedVto}</td>
        <td><strong>${daysLabel}</strong></td>
        <td>${formattedSaldo}</td>
        <td>
          <span class="td-state state-${pol.status}">
            <span class="led led-${pol.status}"></span> ${statusLabel}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="table-btn btn-edit-row" onclick="handleEditPolicy('${pol.poliza}')" title="Editar Póliza">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="table-btn btn-delete-row" onclick="handleDeletePolicy('${pol.poliza}')" title="Eliminar Póliza">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// Formateador de Fechas
function formatDateToReadable(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

// Panel de Notificaciones de la Campanita
function renderNotificationsPanel() {
  const critical = allPolicies.filter(p => p.status === 'red' || p.status === 'yellow');
  
  // Ordenar críticas por días restantes (vencidos primero)
  critical.sort((a, b) => a.diasRestantes - b.diasRestantes);

  // Actualizar contador visual
  if (critical.length > 0) {
    bellBadge.textContent = critical.length;
    bellBadge.classList.add('active');
    notificationsCountDesc.textContent = `${critical.length} alertas activas`;
  } else {
    bellBadge.classList.remove('active');
    notificationsCountDesc.textContent = '¡Sin alertas pendientes!';
  }

  if (critical.length === 0) {
    notificationsList.innerHTML = `
      <div class="empty-notifications">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <p>¡Todo al día!</p>
        <span style="font-size: 11.5px; color: var(--text-muted);">No hay pólizas vencidas o próximas a vencer.</span>
      </div>`;
    return;
  }

  notificationsList.innerHTML = critical.map(pol => {
    let daysText = pol.diasRestantes < 0 ? `Vencida hace ${Math.abs(pol.diasRestantes)} días` : `Vence en ${pol.diasRestantes} días`;
    if (pol.diasRestantes === 0) daysText = 'Vence hoy';

    return `
      <div class="notification-item" onclick="handleNotificationClick('${pol.poliza}')">
        <span class="notif-indicator led-${pol.status}"></span>
        <div class="notif-body">
          <div class="notif-title">${pol.asegurado.toUpperCase()}</div>
          <div class="notif-details">${pol.ramo.toUpperCase()}</div>
          <div class="notif-meta">
            <span class="notif-days state-${pol.status}">${daysText}</span>
            <span class="notif-poliza">Póliza: ${pol.poliza}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// Clic en Notificación
function handleNotificationClick(polizaId) {
  // Ocultar panel
  notificationsPanel.classList.remove('active');

  // Redirigir a sección Pólizas
  navigateToSection('policies-section');

  // Resetear filtros para que se visualice
  filterStatus = 'all';
  filterRamo = 'all';
  
  const filterStatusBtns = document.querySelectorAll('.filter-status-btn');
  filterStatusBtns.forEach(btn => {
    if (btn.getAttribute('data-status') === 'all') btn.classList.add('active');
    else btn.classList.remove('active');
  });
  
  const filterRamoDropdown = document.getElementById('filter-ramo');
  if (filterRamoDropdown) filterRamoDropdown.value = 'all';

  // Buscar específicamente la póliza
  globalSearch.value = polizaId;
  searchClearBtn.style.display = 'block';
  applyFiltersAndRender();

  // Enfocar y resaltar fila de la tabla
  setTimeout(() => {
    const safeId = polizaId.replace(/[^a-zA-Z0-9]/g, '');
    const row = document.getElementById(`row-pol-${safeId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('row-highlight');
      setTimeout(() => row.classList.remove('row-highlight'), 3000);
    }
  }, 350);
}

// 7. DRAG & DROP E IMPORTACIÓN DE EXCEL (SHEETJS)
function setupDragAndDrop() {
  const dropZone = document.getElementById('drag-drop-zone');
  const fileInput = document.getElementById('excel-file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processExcelFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      processExcelFile(fileInput.files[0]);
    }
  });
}

async function processExcelFile(file) {
  // Validar extensión
  const ext = file.name.split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].indexOf(ext) === -1) {
    showToast("Tipo de archivo no admitido. Sube un archivo Excel (.xlsx, .xls) o CSV.", "error");
    return;
  }

  const progressPanel = document.getElementById('import-progress-panel');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStatus = document.getElementById('progress-status-text');
  const progressPercent = document.getElementById('progress-percent');
  const resultCard = document.getElementById('import-result-card');

  // Mostrar visual de barra de carga
  progressPanel.style.display = 'block';
  resultCard.style.display = 'none';
  progressBarFill.style.width = '0%';
  progressPercent.textContent = '0%';
  progressStatus.textContent = 'Leyendo archivo...';

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      progressStatus.textContent = 'Analizando estructura de datos...';
      progressBarFill.style.width = '30%';
      progressPercent.textContent = '30%';

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Tomar primera hoja
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error("El archivo Excel está vacío o no contiene filas.");
      }

      progressBarFill.style.width = '60%';
      progressPercent.textContent = '60%';
      progressStatus.textContent = 'Importando y previniendo duplicados...';

      let added = 0;
      let updated = 0;
      let ignored = 0;

      // Batch import de registros en Dexie
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Mapear campos normalizando nombres de cabeceras
        const mappedRow = mapHeaders(row);

        // Validaciones mínimas de los campos obligatorios
        if (!mappedRow.poliza || !mappedRow.asegurado || !mappedRow.ramo || !mappedRow.vto) {
          ignored++;
          continue;
        }

        // Parsear campos correctamente
        const cleanPoliza = String(mappedRow.poliza).trim();
        const cleanAsegurado = String(mappedRow.asegurado).trim().toUpperCase();
        const cleanRamo = String(mappedRow.ramo).trim().toUpperCase();
        
        const dateVtoObj = parseExcelDate(mappedRow.vto);
        if (!dateVtoObj) {
          ignored++;
          continue; // Vencimiento inválido
        }
        const strVto = formatDateToISO(dateVtoObj);

        // Datos opcionales
        const parsedSaldo = parseSaldo(mappedRow.saldo);
        
        const dateFNac = parseExcelDate(mappedRow.fnac);
        const strFNac = dateFNac ? formatDateToISO(dateFNac) : '';

        const dateEmision = parseExcelDate(mappedRow.emision);
        const strEmision = dateEmision ? formatDateToISO(dateEmision) : '';

        const parsedPaused = mappedRow.paused === true || 
                             String(mappedRow.paused || '').toLowerCase().includes('si') || 
                             String(mappedRow.paused || '').toLowerCase().includes('yes') || 
                             String(mappedRow.paused || '').toLowerCase().includes('paus') || 
                             String(mappedRow.estado || '').toLowerCase().includes('paus') || 
                             false;

        const policyObj = {
          poliza: cleanPoliza,
          asegurado: cleanAsegurado,
          ramo: cleanRamo,
          vto: strVto,
          saldo: parsedSaldo,
          emision: strEmision,
          fNac: strFNac,
          paused: parsedPaused
        };

        // Comprobar si existe la póliza para marcar como nuevo o actualizado (prevención duplicados)
        const existing = await db.policies.get(cleanPoliza);
        if (existing) {
          updated++;
        } else {
          added++;
        }

        // Guardar/Actualizar
        await db.policies.put(policyObj);

        // Actualizar barra de progreso del batch
        const percent = 60 + Math.floor((i / rows.length) * 35);
        progressBarFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
      }

      progressBarFill.style.width = '100%';
      progressPercent.textContent = '100%';
      progressStatus.textContent = '¡Completado!';

      // Cargar nuevos datos e IndexedDB en la memoria del controlador
      await refreshData();

      // Renderizar resumen final
      document.getElementById('import-added-count').textContent = added;
      document.getElementById('import-updated-count').textContent = updated;
      document.getElementById('import-total-processed').textContent = rows.length;

      setTimeout(() => {
        progressPanel.style.display = 'none';
        resultCard.style.display = 'block';
        showToast(`Importación completa: +${added} nuevas, ~${updated} actualizadas.`, 'success');
      }, 500);

    } catch (err) {
      console.error(err);
      progressPanel.style.display = 'none';
      showToast(`Error al procesar el archivo: ${err.message || 'Estructura no válida'}`, 'error');
    }
  };

  reader.onerror = () => {
    progressPanel.style.display = 'none';
    showToast("Error de lectura de archivo local", "error");
  };

  reader.readAsArrayBuffer(file);
}

// Mapear Cabeceras del Excel de Forma Inteligente
function mapHeaders(row) {
  const mapped = {};
  
  // Normalizar las llaves de la fila
  Object.keys(row).forEach(key => {
    const normKey = String(key)
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remover tildes
      .replace(/\./g, "")              // remover puntos como VTO.
      .replace(/\s+/g, "");            // remover espacios

    // Mapear a propiedades internas estándar
    if (normKey === 'ASEGURADO') {
      mapped.asegurado = row[key];
    } else if (normKey === 'POLIZA' || normKey === 'NPOLIZA' || normKey === 'NUMERODEPOLIZA') {
      mapped.poliza = row[key];
    } else if (normKey === 'RAMO') {
      mapped.ramo = row[key];
    } else if (normKey === 'VTO' || normKey === 'VENCIMIENTO') {
      mapped.vto = row[key];
    } else if (normKey === 'SALDO' || normKey === 'SALDOPENDIENTE') {
      mapped.saldo = row[key];
    } else if (normKey === 'EMISION' || normKey === 'FECHAEMISION') {
      mapped.emision = row[key];
    } else if (normKey === 'FNAC' || normKey === 'FECHANACIMIENTO' || normKey === 'NACIMIENTO') {
      mapped.fnac = row[key];
    } else if (normKey === 'PAUSA' || normKey === 'PAUSADA' || normKey === 'ESTADO' || normKey === 'PAUSADO') {
      mapped.paused = row[key];
    }
  });

  return mapped;
}

// Convertidor de Fechas Completo (con número serial de Excel y Formatos comunes)
function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  
  // Si Excel lo almacena como número de día serie
  if (typeof val === 'number') {
    return excelSerialToDate(val);
  }
  
  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/AAAA o D/M/AAAA
  const dmyParts = str.split('/');
  if (dmyParts.length === 3) {
    const day = parseInt(dmyParts[0], 10);
    const month = parseInt(dmyParts[1], 10) - 1;
    let year = parseInt(dmyParts[2], 10);
    if (year < 100) year += 2000; // Ajustar año de dos dígitos
    return new Date(year, month, day);
  }

  // AAAA-MM-DD (ISO estándar)
  const ymdParts = str.split('-');
  if (ymdParts.length === 3) {
    const year = parseInt(ymdParts[0], 10);
    const month = parseInt(ymdParts[1], 10) - 1;
    const day = parseInt(ymdParts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback a parser de Date de JS
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function excelSerialToDate(serial) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const hours = Math.floor(total_seconds / 3600);
  total_seconds = total_seconds % 3600;
  const minutes = Math.floor(total_seconds / 60);
  const seconds = total_seconds % 60;
  
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

// Convertidor Date Obj a String "YYYY-MM-DD"
function formatDateToISO(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseSaldo(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  
  // Limpiar formatos como símbolos de moneda, comas de miles
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// 8. CRUD MANUAL DE PÓLIZAS (DETALLE / EDICIÓN Y ALTA)
function openPolicyModal(policyToEdit = null) {
  const modal = document.getElementById('policy-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('policy-form');
  
  form.reset();

  if (policyToEdit) {
    modalTitle.textContent = "Editar Póliza Existente";
    
    // Rellenar datos
    document.getElementById('form-edit-original-poliza').value = policyToEdit.poliza;
    document.getElementById('form-asegurado').value = policyToEdit.asegurado;
    document.getElementById('form-poliza').value = policyToEdit.poliza;
    // La póliza en edición bloquea el input original para prevenir cambiar ID principal o forzar borrado manual
    document.getElementById('form-poliza').disabled = true; 
    document.getElementById('form-ramo').value = policyToEdit.ramo;
    document.getElementById('form-vto').value = policyToEdit.vto;
    document.getElementById('form-saldo').value = policyToEdit.saldo || '';
    document.getElementById('form-emision').value = policyToEdit.emision || '';
    document.getElementById('form-f-nac').value = policyToEdit.fNac || '';
    document.getElementById('form-paused').checked = !!policyToEdit.paused;
  } else {
    modalTitle.textContent = "Agregar Nueva Póliza";
    document.getElementById('form-edit-original-poliza').value = '';
    document.getElementById('form-poliza').disabled = false;
    document.getElementById('form-paused').checked = false;
  }

  modal.classList.add('active');
}

function closePolicyModal() {
  document.getElementById('policy-modal').classList.remove('active');
}

async function handleSavePolicyManual(e) {
  e.preventDefault();
  
  const originalPolizaId = document.getElementById('form-edit-original-poliza').value;
  const newPolizaId = document.getElementById('form-poliza').value.trim();
  const aseguradoVal = document.getElementById('form-asegurado').value.trim().toUpperCase();
  const ramoVal = document.getElementById('form-ramo').value.trim().toUpperCase();
  const vtoVal = document.getElementById('form-vto').value;
  const saldoVal = parseFloat(document.getElementById('form-saldo').value) || 0;
  const emisionVal = document.getElementById('form-emision').value;
  const fNacVal = document.getElementById('form-f-nac').value;
  const pausedVal = document.getElementById('form-paused').checked;

  if (!newPolizaId || !aseguradoVal || !ramoVal || !vtoVal) {
    showToast("Por favor complete los campos obligatorios (*)", "error");
    return;
  }

  try {
    const policyObj = {
      poliza: newPolizaId,
      asegurado: aseguradoVal,
      ramo: ramoVal,
      vto: vtoVal,
      saldo: saldoVal,
      emision: emisionVal,
      fNac: fNacVal,
      paused: pausedVal
    };

    // Si es edición y la póliza ID es distinta (en teoría disabled), borrar vieja
    if (originalPolizaId && originalPolizaId !== newPolizaId) {
      await db.policies.delete(originalPolizaId);
    }

    // Persistir en Dexie
    await db.policies.put(policyObj);
    
    closePolicyModal();
    showToast("Póliza guardada con éxito", "success");
    await refreshData();

  } catch (error) {
    console.error(error);
    showToast("Error al guardar la póliza en la base de datos local", "error");
  }
}

async function handleEditPolicy(polizaId) {
  try {
    const policy = await db.policies.get(polizaId);
    if (policy) {
      openPolicyModal(policy);
    } else {
      showToast("No se encontró la póliza solicitada", "error");
    }
  } catch (err) {
    showToast("Error al recuperar el registro de póliza", "error");
  }
}

async function handleDeletePolicy(polizaId) {
  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la póliza N° ${polizaId}?`)) {
    try {
      await db.policies.delete(polizaId);
      showToast("Póliza eliminada del sistema", "success");
      await refreshData();
    } catch (err) {
      showToast("Error al eliminar la póliza local", "error");
    }
  }
}

// 9. RESPALDOS Y HERRAMIENTAS DE AJUSTES (JSON BACKUPS)
async function handleExportDatabase() {
  try {
    const allRecords = await db.policies.toArray();
    
    if (allRecords.length === 0) {
      showToast("No hay registros en la base de datos para exportar.", "info");
      return;
    }

    const backupData = {
      app: "SegurTrack",
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      data: allRecords
    };

    const strJson = JSON.stringify(backupData, null, 2);
    const blob = new Blob([strJson], { type: 'application/json' });
    
    // Crear enlace de descarga local temporal
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const todayStr = formatDateToISO(new Date());
    a.href = url;
    a.download = `backup_segurtrack_${todayStr}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast("Copia de seguridad exportada con éxito", "success");

  } catch (err) {
    console.error(err);
    showToast("Error al exportar la base de datos", "error");
  }
}

async function handleImportDatabase(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const backupObj = JSON.parse(event.target.result);
      
      // Validar estructura básica
      if (backupObj.app !== 'SegurTrack' || !Array.isArray(backupObj.data)) {
        throw new Error("El archivo no es una copia de seguridad válida de SegurTrack.");
      }

      if (confirm(`Se importarán ${backupObj.data.length} pólizas. ¿Deseas limpiar primero los registros actuales antes de restaurar?`)) {
        await db.policies.clear();
      }

      // Bulk add
      for (const pol of backupObj.data) {
        if (pol.poliza) {
          await db.policies.put({
            poliza: pol.poliza,
            asegurado: pol.asegurado || '',
            ramo: pol.ramo || '',
            vto: pol.vto || '',
            saldo: parseFloat(pol.saldo) || 0,
            emision: pol.emision || '',
            fNac: pol.fNac || '',
            paused: !!pol.paused
          });
        }
      }

      showToast("Base de datos restaurada correctamente", "success");
      await refreshData();
      
      // Limpiar input file
      e.target.value = '';

    } catch (err) {
      console.error(err);
      showToast(`Error al restaurar: ${err.message || 'JSON inválido'}`, "error");
    }
  };

  reader.readAsText(file);
}

async function handleResetDatabase() {
  if (confirm("¿ATENCIÓN! ¿Estás completamente seguro de eliminar TODAS las pólizas y registros locales? Esta acción borrará IndexedDB de forma irreversible.")) {
    if (confirm("Por favor, confirma una segunda vez. ¿Deseas formatear el sistema?")) {
      try {
        await db.policies.clear();
        showToast("Se borró la base de datos local por completo", "success");
        await refreshData();
      } catch (err) {
        showToast("Error al vaciar la base de datos", "error");
      }
    }
  }
}

// 10. GENERADOR DE EXCEL DEMOSTRATIVO DE PRUEBA (SHEETJS DE DESCARGA DIRECTA)
function handleGenerateDemoExcel() {
  try {
    const wb = XLSX.utils.book_new();
    
    // Funciones locales de ayuda para calcular fechas relativas
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    
    const fmt = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const today = new Date();

    const headers = ["ASEGURADO", "RAMO", "VTO.", "POLIZA", "SALDO", "EMISION", "F. NAC"];
    
    const rows = [
      headers,
      ["GONZALEZ HECTOR", "AUTOMOTORES", fmt(addDays(today, 45)), "POL-99220X", "0.00", fmt(addDays(today, -320)), "12/04/1975"],
      ["RODRIGUEZ ANA ESTELA", "MOTOVEHICULOS", fmt(addDays(today, 8)), "POL-11442Y", "15400.50", fmt(addDays(today, -350)), "28/08/1992"],
      ["MARTINEZ CLAUDIO", "VIDA GRUPAL", fmt(addDays(today, -5)), "POL-77332Z", "0.00", fmt(addDays(today, -365)), "05/11/1980"],
      ["GOMEZ PEDRO ALBERTO", "AUTOMOTORES", fmt(addDays(today, 2)), "POL-88114A", "8200.00", fmt(addDays(today, -360)), "19/02/1988"],
      ["FERNANDEZ LAURA", "ACCIDENTES PERSONALES", fmt(addDays(today, 75)), "POL-44558B", "0.00", fmt(addDays(today, -290)), "30/06/1995"],
      ["LOPEZ JULIO CESAR", "HOGAR", fmt(addDays(today, -20)), "POL-22336C", "4500.00", fmt(addDays(today, -385)), "15/10/1968"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Pólizas Activas");
    
    // Escribir archivo y descargar en el navegador
    XLSX.writeFile(wb, "seguros_vencimientos_demo.xlsx");
    
    showToast("Planilla Excel de prueba descargada. ¡Súbela en 'Importar Excel'!", "success");
    
  } catch (error) {
    console.error(error);
    showToast("Error al generar la planilla demostrativa", "error");
  }
}

// 11. TOAST NOTIFICATIONS SENSORIALES
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Iconos SVG para el toast
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--status-green);"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--status-red);"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  } else {
    iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--accent-color);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Auto-eliminar a los 4 segundos
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
