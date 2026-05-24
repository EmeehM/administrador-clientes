# SegurTrack 🛡️
> **Sistema Inteligente e Independiente para el Control de Vencimientos de Pólizas de Seguros.**

**SegurTrack** es una aplicación de escritorio híbrida y portátil diseñada para automatizar la gestión, control y monitoreo de vencimientos de pólizas de seguros a partir de planillas Excel extraídas manualmente. Su gran fortaleza es que es **100% offline y local**, garantizando absoluta privacidad y velocidad sin depender de servidores externos de internet.

---

## ✨ Características Principales

*   **📊 Tablero Principal (Dashboard):**
    *   Métricas clave consolidadas en tiempo real: Asegurados Totales, Pólizas Vigentes, Próximas a Vencer y Vencidas.
    *   Tarjetas visuales premium con gradients vibrantes y efectos de iluminación dinámica (*hover glow*).
*   **🟢 Lógica Inteligente de Semáforo:**
    *   **Verde (Vigente):** Cobertura segura. Faltan **más de 15 días** para el vencimiento.
    *   **Amarillo (Próximo a Vencer):** Alerta preventiva. Faltan **entre 1 y 15 días** para expirar.
    *   **Rojo (Vencido):** Alerta crítica. Pólizas que vencen en el día actual o con fecha anterior.
*   **🔔 Centro de Alertas Interactivo (Campanita):**
    *   Ubicada permanentemente en el header con un contador flotante (*badge* rojo) mostrando las alertas críticas pendientes.
    *   Panel flotante con efecto *glassmorphism* que lista todas las pólizas en estado Amarillo y Rojo.
    *   **Interactividad Directa:** Al hacer clic sobre cualquier alerta del panel, la app redirige automáticamente a la tabla, busca el registro específico y aplica un destello animado temporal en la fila para su rápida localización.
*   **📥 Importador de Planillas Excel (SheetJS):**
    *   Zona de arrastre interactiva (*Drag & Drop*) para procesar archivos `.xlsx`, `.xls` o `.csv`.
    *   **Prevención Automática de Duplicados:** Si un número de póliza ya existe en el sistema local, los datos antiguos son sobrescritos y actualizados con el registro más reciente sin generar registros repetidos.
    *   Mapeo inteligente que normaliza las cabeceras (remueve tildes, espacios y puntos) buscando: `ASEGURADO`, `POLIZA`, `RAMO`, `VTO.`, `SALDO`, `EMISION` y `F. NAC`.
*   **✍️ CRUD Manual e Interactivo:**
    *   Formulario modal estéticamente cuidado para crear, editar o eliminar registros de pólizas directamente desde la aplicación sin recurrir al Excel.
*   **💾 Almacenamiento Local Seguro (Dexie.js / IndexedDB):**
    *   Persistencia de datos íntegramente local en la máquina del usuario mediante base de datos indexada del navegador.
*   **🔌 Gestión de Copias de Seguridad (Backups):**
    *   Exportar toda la base de datos en formato portable `.json`.
    *   Restaurar la base de datos desde un archivo de copia de seguridad previo en un solo clic.
*   **💡 Herramienta de Demostración:**
    *   Botón para descargar directamente una planilla de Excel de prueba (`.xlsx`) preconfigurada con fechas relativas al día de hoy para testear los semáforos de forma inmediata.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** HTML5 Semántico, CSS3 Puro (con variables dinámicas de color para temas Claro y Oscuro) y JavaScript Vanilla.
*   **Persistencia Local:** `Dexie.js` (un wrapper ligero y de alto rendimiento para IndexedDB).
*   **Procesador de Planillas:** `SheetJS` (`xlsx.full.min.js`) para análisis local rápido en cliente.
*   **Empaquetador de Escritorio (Opcional):** `Electron.js` para generar el instalador/ejecutable `.exe`.

---

## 📂 Estructura del Proyecto

```text
administrador-clientes/
├── index.html         # Estructura del Layout, Secciones y Modales
├── style.css          # Estilos visuales Premium, Variables de Tema y Animaciones
├── app.js             # Lógica de Negocio, DB local, Excel Parser e Interactividad
├── main.js            # Script de inicialización de ventana nativa de Electron
├── package.json       # Configuración de dependencias de Node/Electron
├── .env               # Archivo de variables de entorno de desarrollo
├── .env.example       # Plantilla de variables de entorno de desarrollo
└── README.md          # Este archivo de documentación
```

---

## 🚀 Instrucciones de Ejecución y Compilación

Tienes tres métodos sencillos para ejecutar y utilizar el sistema:

### Método A: Ejecución Directa en Navegador (Desarrollo Rápido)
Al ser una aplicación de frontend independiente, no requiere servidores complejos para funcionar localmente:
1.  Haz **doble clic** en el archivo [index.html](index.html) para abrirlo en cualquier navegador (Chrome, Edge, Firefox).
2.  *Opcional:* Si deseas simular un servidor estático local completo, ejecuta desde tu terminal:
    ```bash
    python -m http.server 8000
    ```
    Y abre en tu navegador `http://localhost:8000`.

---

### Método B: Empaquetar a Aplicación Nativa (`.exe` para Windows) 📦
Ideal para distribuir al usuario final como un programa instalable de escritorio que no requiere navegador.

**Requisito de desarrollo:** Tener instalado [Node.js](https://nodejs.org/).

1.  Abre tu consola de comandos en esta carpeta del proyecto:
    ```bash
    cd "/administrador-clientes"
    ```
2.  Instala Electron y las herramientas de empaquetado:
    ```bash
    npm install
    ```
3.  Compila la aplicación para generar el ejecutable nativo de Windows:
    ```bash
    npm run build
    ```
4.  Busca tu aplicación final dentro de la carpeta generada:
    `dist/SegurTrack-win32-x64/SegurTrack.exe`
    *   *Nota:* Puedes enviar esa carpeta entera comprimida en un `.zip` a cualquier cliente y este podrá abrir el programa con solo hacer doble clic en el ejecutable, sin necesidad de instalar Node.js ni configurar nada.

---

### Método C: Instalar como Aplicación Web Progresiva (PWA / Sin Programar)
Si el usuario final no tiene conocimientos técnicos, puedes instalar el sitio como una aplicación desde el propio navegador en 10 segundos:
1.  Abre [index.html](index.html) en **Microsoft Edge** o **Google Chrome**.
2.  Haz clic en el menú superior del navegador (los **tres puntos `...`**).
3.  Ve a **"Aplicaciones"** (Apps) y haz clic en **"Instalar este sitio como una aplicación"**.
4.  Coloca de nombre `SegurTrack` y confirma.
5.  El navegador creará automáticamente un acceso directo en tu **Escritorio de Windows**. Al hacer doble clic sobre él, la aplicación se abrirá en una ventana dedicada premium, elegante, sin barras de navegación y con soporte 100% offline.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Siéntete libre de adaptarlo y expandirlo para tus necesidades de gestión de clientes.
