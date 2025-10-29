// Importar librerías
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// --- Configuración ---
const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI; // Esta la definiremos en Render

// --- Conexión a MongoDB ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// --- Definición del Schema (la "Tabla") ---
const evidenceSchema = new mongoose.Schema({
  team: { type: String, required: true },
  teamClass: { type: String },
  level: { type: Number, required: true },
  points: { type: Number, required: true },
  link: { type: String, required: true },
  note: { type: String },
  validated: { type: Boolean, default: false },
  correctionNote: { type: String }
}, {
  timestamps: true // Esto añade automáticamente createdAt y updatedAt
});

// Crear el "Modelo" (el objeto para interactuar con la colección 'evidences')
const Evidence = mongoose.model('Evidence', evidenceSchema);

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Rutas de la API ---

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend CODE HOPE (MongoDB) funcionando!');
});

// GET /evidence - Obtener todas las evidencias
app.get('/evidence', async (req, res) => {
  try {
    const evidences = await Evidence.find().sort({ createdAt: -1 }); // Ordenar por más nuevo
    res.json(evidences);
  } catch (err) {
    console.error('Error fetching evidence:', err);
    res.status(500).json({ error: 'Error al obtener las evidencias' });
  }
});

// POST /evidence - Guardar/Actualizar una evidencia
app.post('/evidence', async (req, res) => {
  const { team, teamClass, level, points, link, note } = req.body;

  if (!team || !level || !points || !link) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Buscar y actualizar si existe (upsert: true)
    // Esto busca un documento que coincida con team, teamClass y level.
    // Si lo encuentra, lo actualiza. Si no, crea uno nuevo.
    const filter = { team: team, teamClass: teamClass || null, level: level };
    const update = {
      team: team,
      teamClass: teamClass || null,
      level: level,
      points: points,
      link: link,
      note: note || null,
      validated: false, // Siempre resetea la validación al (re)enviar
      correctionNote: null
    };
    const options = {
      new: true, // Devuelve el documento actualizado (o nuevo)
      upsert: true, // Crea el documento si no existe
      setDefaultsOnInsert: true
    };

    const savedEvidence = await Evidence.findOneAndUpdate(filter, update, options);
    
    console.log('Evidence SAVED/UPDATED:', savedEvidence);
    res.status(201).json(savedEvidence);

  } catch (err) {
    console.error('Error saving evidence:', err);
    res.status(500).json({ error: 'Error al guardar la evidencia' });
  }
});

// PUT /evidence/:id/validate - Marcar como validada
app.put('/evidence/:id/validate', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedEvidence = await Evidence.findByIdAndUpdate(
      id,
      { validated: true, correctionNote: null },
      { new: true } // Devuelve el documento actualizado
    );
    if (!updatedEvidence) {
      return res.status(404).json({ error: 'Evidencia no encontrada' });
    }
    console.log('Evidence VALIDATED:', updatedEvidence);
    res.json(updatedEvidence);
  } catch (err) {
    console.error('Error validating evidence:', err);
    res.status(500).json({ error: 'Error al validar la evidencia' });
  }
});

// PUT /evidence/:id/correct - Marcar para corrección
app.put('/evidence/:id/correct', async (req, res) => {
  const { id } = req.params;
  const { correctionNote } = req.body;

  if (correctionNote === undefined) {
      return res.status(400).json({ error: 'Falta la nota de corrección (correctionNote)' });
  }

  try {
    const updatedEvidence = await Evidence.findByIdAndUpdate(
      id,
      { validated: false, correctionNote: correctionNote },
      { new: true }
    );
    if (!updatedEvidence) {
      return res.status(404).json({ error: 'Evidencia no encontrada' });
    }
    console.log('Evidence MARKED FOR CORRECTION:', updatedEvidence);
    res.json(updatedEvidence);
  } catch (err) {
    console.error('Error marking evidence for correction:', err);
    res.status(500).json({ error: 'Error al marcar para corrección' });
  }
});

// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});