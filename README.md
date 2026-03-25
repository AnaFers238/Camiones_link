📖 Descripción del Proyecto

En el contexto de la movilidad urbana en Tijuana (específicamente con la línea "Azul y Blanco"), la identificación visual de rutas suele ser confusa debido a la similitud de las unidades y letreros poco claros.

Esta solución aplica Visión por Computadora directamente en el navegador para:

Capturar la imagen del autobús mediante la cámara del dispositivo.

Clasificar la ruta utilizando una Red Neuronal Convolucional (CNN).

Validar si la ruta detectada coincide con el destino seleccionado por el usuario.

🚀 Características Principales

Detección en Tiempo Real: Procesamiento instantáneo con TensorFlow.js.

Validación Lógica Inteligente: Cruce automático entre Ruta Detectada vs. Destino Deseado.

Smart Camera Handling: Priorización de cámara trasera (facingMode: environment) con fallback.

Interfaz Responsiva: Optimizada para móviles y escritorio.

Base de Datos Dinámica: Destinos y paradas cargadas desde un archivo JSON estructurado.

🛠️ Tecnologías Utilizadas

Frontend: HTML5, CSS3.

Lógica: JavaScript (ES6+).

Inteligencia Artificial:

Teachable Machine
 (entrenamiento del modelo)

TensorFlow.js
 (inferencia en navegador)

Datos: JSON para rutas y metadatos.

📊 Enfoque de Inteligencia de Negocios (BI)

Este proyecto no es solo técnico, sino una solución estratégica basada en datos:

Solución de Problemas Reales: Reduce tiempo perdido e incertidumbre del usuario.

Soporte a la Toma de Decisiones: Convierte video → datos → decisión (“¿Me subo o no?”).

Accesible: No requiere GPS ni hardware adicional; solo el celular del usuario.

📂 Estructura del Repositorio
/
├── index.html          # Interfaz de usuario principal
├── app.js              # Lógica de negocio y controlador de la cámara
├── datos_rutas.json    # Base de datos de rutas y paradas
├── README.md           # Documentación del proyecto
└── my_model/           # Archivos del Modelo de IA
    ├── model.json      # Topología de la red neuronal
    ├── metadata.json   # Etiquetas (labels) y configuración
    └── weights.bin     # Pesos sinápticos del modelo
