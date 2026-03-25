// --- CONFIGURACIÓN ---
const URL = "my_model/";

// Variables globales
let model, maxPredictions;
let rutasData = {};
let allDestinations = [];
let selectedDestination = null;
let currentFacingMode = "environment";
let animationId = null;
let stream = null;

// Referencias al video y canvas (se asignan en DOMContentLoaded)
let video, canvas, ctx;

console.log("app.js cargado.");

// ─────────────────────────────────────────────
// Obtener deviceId real de la cámara trasera
// (fix específico para iOS Safari)
// ─────────────────────────────────────────────
async function getBackCameraId() {
    // iOS no revela labels hasta tener permiso — abrimos un stream genérico y lo cerramos
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    tempStream.getTracks().forEach(t => t.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log("📷 Cámaras encontradas:", cameras.map(c => c.label));

    const back = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
    );

    return back ? back.deviceId : null;
}

// ─────────────────────────────────────────────
// Configurar cámara con fallback completo
// ─────────────────────────────────────────────
async function setupCamera() {
    // 1. Limpiar animación y stream previos
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }

    // 2. Intentar obtener deviceId real de la cámara trasera (fix iOS Safari)
    try {
        const backId = await getBackCameraId();
        if (backId) {
            console.log("✅ DeviceId trasera encontrado, usando directamente");
            stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: backId } }
            });
            currentFacingMode = "environment-exact";
        }
    } catch (err) {
        console.warn("⚠️ No se pudo obtener deviceId trasera:", err.name);
    }

    // 3. Si no funcionó el deviceId, usar strategies normales
    if (!stream) {
        const strategies = [
            { video: { facingMode: { exact: "environment" } }, label: "environment-exact" },
            { video: { facingMode: "environment" }, label: "environment" },
            { video: { facingMode: "user" }, label: "user" },
            { video: true, label: "default" }
        ];

        for (const strategy of strategies) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(strategy);
                currentFacingMode = strategy.label;
                console.log(`✅ Cámara activa: ${strategy.label}`);
                break;
            } catch (err) {
                console.warn(`⚠️ Falló "${strategy.label}":`, err.name);
            }
        }
    }

    if (!stream) {
        throw new Error("No se pudo acceder a ninguna cámara.");
    }

    // 4. Asignar stream al video
    video.srcObject = stream;

    await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
        setTimeout(() => reject(new Error("Timeout al cargar el video")), 10000);
    });

    // 5. Ajustar canvas a un tamaño PEQUEÑO para no congelar el celular
    const maxSize = 300; 
    const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    console.log(`📐 Dimensiones: ${video.videoWidth}x${video.videoHeight}`);

    // 6. Iniciar loop — dibuja cada frame en el canvas para que el modelo pueda leerlo
    function loop() {
        if (!stream) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(loop);
    }
    loop();
}

// ─────────────────────────────────────────────
// Cargar datos de rutas desde archivo estático
// ─────────────────────────────────────────────
async function loadRouteData() {
    console.log("Cargando datos_rutas.json...");
    try {
        const response = await fetch('datos_rutas.json');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        rutasData = await response.json();
        console.log("Datos de rutas cargados.", rutasData);

        const destinationsSet = new Set();
        rutasData.rutas.forEach(route => {
            route.paradas.forEach(stop => destinationsSet.add(stop));
        });
        allDestinations = Array.from(destinationsSet).sort();

        const select = document.getElementById('destination-select');
        allDestinations.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest;
            option.textContent = dest;
            select.appendChild(option);
        });

        console.log("Destinos cargados:", allDestinations.length);
    } catch (error) {
        console.error("ERROR: No se pudo cargar datos_rutas.json.", error);
        alert("Error: No se pudo cargar la información de las rutas.");
    }
}

// ─────────────────────────────────────────────
// Iniciar cámara después de seleccionar destino
// ─────────────────────────────────────────────
async function startCamera() {
    selectedDestination = document.getElementById('destination-select').value;
    if (!selectedDestination) {
        alert("Por favor, selecciona un destino primero.");
        return;
    }

    console.log("Iniciando cámara para:", selectedDestination);

    document.querySelector('.destination-section').classList.add('hidden');
    document.querySelector('.camera-section').classList.remove('hidden');

    // Cargar modelo solo si no está cargado
    if (!model) {
        console.log("Cargando modelo de Teachable Machine...");
        try {
            model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            maxPredictions = model.getTotalClasses();
            console.log("Modelo cargado.");
        } catch (error) {
            console.error("ERROR: No se pudo cargar el modelo.", error);
            alert("Error: No se pudo cargar el modelo de IA.");
            return;
        }
    }

    // Activar cámara
    try {
        await setupCamera();
        document.getElementById("capture-btn").classList.remove("hidden");
    } catch (error) {
        console.error("ERROR CRÍTICO: No se pudo acceder a ninguna cámara.", error);
        alert("Error: No se pudo acceder a la cámara. Asegúrate de haber dado los permisos.");
    }
}

// ─────────────────────────────────────────────
// Capturar frame y predecir
// ─────────────────────────────────────────────
async function captureAndPredict() {
    console.log("Capturando y prediciendo...");

    // 1. Pausar temporalmente el dibujo para no trabajar doble
    if (animationId) cancelAnimationFrame(animationId);

    // 2. Mostrar un mini indicador visual al usuario en el botón para que sepa que está cargando
    const captureBtn = document.getElementById("capture-btn");
    const originalText = captureBtn.innerHTML;
    captureBtn.innerHTML = "Analizando...";

    try {
        // Usar el canvas directamente (ahora es muy pequeño y veloz)
        const prediction = await model.predict(canvas);

        let bestPrediction = { className: "", probability: 0 };
        for (let i = 0; i < maxPredictions; i++) {
            if (prediction[i].probability > bestPrediction.probability) {
                bestPrediction = prediction[i];
            }
        }
        console.log("Mejor predicción:", bestPrediction);

        document.querySelector('.camera-section').classList.add('hidden');
        document.querySelector('.result-section').classList.remove('hidden');

        const resultDiv = document.getElementById('result');

        if (bestPrediction.probability > 0.75) {
            const route = rutasData.rutas.find(r => r.nombre === bestPrediction.className);
            if (route) {
                if (route.paradas.includes(selectedDestination)) {
                    resultDiv.innerHTML = `¡Correcto! La ruta <strong>${route.nombre}</strong> (${route.sentido}) pasa por <strong>${selectedDestination}</strong>.`;
                    resultDiv.className = 'correct';
                } else {
                    resultDiv.innerHTML = `Incorrecto. La ruta <strong>${route.nombre}</strong> (${route.sentido}) no pasa por <strong>${selectedDestination}</strong>.`;
                    resultDiv.className = 'incorrect';
                }
            } else {
                resultDiv.innerHTML = "Ruta no encontrada en la base de datos.";
                resultDiv.className = 'incorrect';
            }
        } else {
            resultDiv.innerHTML = "No se pudo identificar la ruta con certeza. Intenta de nuevo.";
            resultDiv.className = 'incorrect';
        }

        // Restaurar estado del botón
        captureBtn.innerHTML = originalText;

    } catch (error) {
        console.error("Error prediciendo:", error);
        captureBtn.innerHTML = originalText;
    }
}

// ─────────────────────────────────────────────
// Reiniciar al estado inicial
// ─────────────────────────────────────────────
function restart() {
    document.querySelector('.destination-section').classList.remove('hidden');
    document.querySelector('.camera-section').classList.add('hidden');
    document.querySelector('.result-section').classList.add('hidden');

    document.getElementById('destination-select').value = '';

    // Detener loop y stream
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    if (video) {
        video.srcObject = null;
    }

    // Limpiar canvas
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    document.getElementById("capture-btn").classList.add("hidden");

    selectedDestination = null;
    currentFacingMode = "environment";
}

// ─────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Asignar referencias al video y canvas del HTML
    video = document.getElementById('webcam');   // <video id="webcam">
    canvas = document.getElementById('canvas');   // <canvas id="canvas">
    ctx = canvas.getContext('2d');

    await loadRouteData();
});

document.getElementById('start-camera-btn').addEventListener('click', startCamera);
document.getElementById('capture-btn').addEventListener('click', captureAndPredict);
document.getElementById('restart-btn').addEventListener('click', restart);
