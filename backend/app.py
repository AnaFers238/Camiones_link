from flask import Flask, render_template, jsonify
import json
import os

# Configuración de rutas para arquitectura Frontend/Backend
base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(base_dir), 'frontend')
template_dir = os.path.join(frontend_dir, 'templates')
static_dir = os.path.join(frontend_dir, 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
# Cargar datos de rutas una sola vez al iniciar el servidor
with open(os.path.join(os.path.dirname(__file__), 'datos_rutas.json'), encoding='utf-8') as f:
    rutas_data = json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/rutas')
def get_rutas():
    return jsonify(rutas_data)

if __name__ == '__main__':
    # ssl_context='adhoc' genera un certificado SSL autofirmado automaticamente.
    # Esto permite usar HTTPS sin ngrok, lo que habilita la camara en moviles.
    # Al abrir en el telefono, acepta la advertencia de "sitio no seguro" una sola vez.
    print("=" * 55)
    print("  Servidor iniciado con HTTPS (certificado autofirmado)")
    print("  Abre en tu telefono: https://<IP-DE-TU-PC>:5000")
    print("  Abre en este PC:     https://localhost:5000")
    print("  (Acepta la advertencia de seguridad en el navegador)")
    print("=" * 55)
    app.run(
        host='0.0.0.0',   # Accesible desde cualquier dispositivo en la red local
        port=5000,
        debug=True,
        ssl_context='adhoc'  # HTTPS sin ngrok — requiere: pip install pyopenssl
    )
