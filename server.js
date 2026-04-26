const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const CIUDADES = {
    cartagena: { lat: 10.3997, lon: -75.5144, nombre: 'Cartagena' },
    barranquilla: { lat: 10.9639, lon: -74.7964, nombre: 'Barranquilla' },
    monteria: { lat: 8.7479, lon: -75.8814, nombre: 'Montería' },
    'santa marta': { lat: 11.2408, lon: -74.1990, nombre: 'Santa Marta' },
    bogota: { lat: 4.7110, lon: -74.0721, nombre: 'Bogotá' },
    medellin: { lat: 6.2442, lon: -75.5812, nombre: 'Medellín' }
};

// cache por ciudad
let cacheClima = {};

// Archivos estáticos principales
app.use(express.static(path.join(__dirname, 'public')));

// Servir carpeta de fotos locales
app.use('/fotos', express.static(path.join(__dirname, 'assets', 'fotos')));

// API clima
app.get('/api/clima', async (req, res) => {
    try {
        const ciudadKey = (req.query.ciudad || 'cartagena').toLowerCase();
        const ciudad = CIUDADES[ciudadKey] || CIUDADES.cartagena;
        
        const now = Date.now();
        const cache = cacheClima[ciudadKey];

        // cache por 15 minutos
        if (cache && (now - cache.lastUpdate < 900000)) {
            return res.json({ ...cache.data, nombreCiudad: ciudad.nombre });
        }

        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${ciudad.lat}&longitude=${ciudad.lon}&hourly=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&forecast_days=1&timezone=auto`
        );

        cacheClima[ciudadKey] = {
            data: response.data,
            lastUpdate: now
        };

        res.json({ ...response.data, nombreCiudad: ciudad.nombre });

    } catch (error) {
        console.error('Error clima:', error.message);
        res.status(500).json({ error: 'Error obteniendo clima' });
    }
});

const Parser = require('rss-parser');
const parser = new Parser();

// API fotos — lee la carpeta assets/fotos y devuelve las URLs
app.get('/api/fotos', (req, res) => {
    const carpeta = path.join(__dirname, 'assets', 'fotos');
    const extensiones = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const archivos = fs.readdirSync(carpeta).filter(f =>
        extensiones.includes(path.extname(f).toLowerCase())
    );

    const fotos = archivos.map((nombre, i) => ({
        id: i + 1,
        titulo: path.basename(nombre, path.extname(nombre)),
        url: `/fotos/${nombre}`
    }));

    res.json({ fotos });
});

// API RSS - Noticias Combinadas
app.get('/api/rss', async (req, res) => {
    const FEEDS = [
        { url: 'https://www.cartagenaactualidad.com/rss/salud/', cat: 'Salud' },
        { url: 'https://www.cartagenaactualidad.com/rss/actualidad/', cat: 'Actualidad' },
        { url: 'https://www.cartagenaactualidad.com/rss/deportes/', cat: 'Deportes' }
    ];

    try {
        const promesas = FEEDS.map(async (f) => {
            try {
                const feed = await parser.parseURL(f.url);
                return feed.items.map(item => ({ ...item, categoria: f.cat }));
            } catch (e) {
                console.error(`Error en feed ${f.cat}:`, e.message);
                return [];
            }
        });

        const resultados = await Promise.all(promesas);
        let todasLasNoticias = [].concat(...resultados);

        // Ordenar por fecha (más recientes primero)
        todasLasNoticias.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

        res.json(todasLasNoticias.slice(0, 30)); // Devolver las 30 más recientes

    } catch (error) {
        console.error('Error RSS general:', error.message);
        res.status(500).json({ error: 'Error obteniendo noticias' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});