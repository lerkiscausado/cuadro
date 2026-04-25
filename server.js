const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// cache en memoria (reduce CPU y red)
let cache = null;
let lastUpdate = 0;

app.use(express.static(path.join(__dirname, 'public')));

// API clima
app.get('/api/clima', async (req, res) => {
    try {
        const now = Date.now();

        // cache por 10 minutos
        if (cache && (now - lastUpdate < 600000)) {
            return res.json(cache);
        }

        const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast?latitude=10.3997&longitude=-75.5144&hourly=temperature_2m,relative_humidity_2m&forecast_days=1&timezone=auto'
        );

        cache = response.data;
        lastUpdate = now;

        res.json(cache);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Error obteniendo clima' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});