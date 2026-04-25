const { app, BrowserWindow } = require('electron');
const express = require('express');
const axios = require('axios');
const path = require('path');

const server = express();
const PORT = 3000;

// Servir frontend
server.use(express.static(path.join(__dirname, 'public')));

// API clima (Open-Meteo)
server.get('/api/clima', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast?latitude=10.3997&longitude=-75.5144&hourly=temperature_2m,relative_humidity_2m&forecast_days=1&timezone=auto'
        );

        res.json(response.data);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Error obteniendo clima' });
    }
});

// Crear ventana kiosko
function createWindow() {
    const win = new BrowserWindow({
        kiosk: true,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true
        }
    });

    // Bloquear teclas y permitir salida secreta
    win.webContents.on('before-input-event', (event, input) => {
        // Salida secreta
        if (input.control && input.shift && input.key.toLowerCase() === 'q') {
            app.quit();
        }

        // Bloqueos
        if (
            input.key === 'Escape' ||
            input.key === 'F11' ||
            (input.alt && input.key === 'F4')
        ) {
            event.preventDefault();
        }
    });

    win.loadURL(`http://localhost:${PORT}`);
}

// Iniciar servidor + app
app.whenReady().then(() => {
    server.listen(PORT, () => {
        console.log('Servidor iniciado');
        createWindow();
    });
});

// Seguridad extra
app.on('window-all-closed', () => {
    app.quit();
});