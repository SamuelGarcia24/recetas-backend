const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
// npm run dev to start

const app = express()

app.use(cors())
app.use(express.json())

// path to the local json file
const DB_PATH = path.join(__dirname, 'data', 'db.json')

// read data from file
function readData() {
  const content = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(content)
}

// save data to file
function saveData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// generate a simple unique id
function generateId() {
  return Date.now().toString()
}

// ===== recipes =====

// get all recipes
app.get('/api/recetas', (req, res) => {
  const db = readData()
  res.json({ success: true, data: db.recetas })
})

// get one recipe with its opinions
app.get('/api/recetas/:id', (req, res) => {
  const db = readData()
  const receta = db.recetas.find(r => r.id === req.params.id)

  if (!receta) {
    return res.status(404).json({ success: false, message: 'recipe not found' })
  }

  const opiniones = db.opiniones.filter(o => o.recetaId === req.params.id)
  res.json({ success: true, data: { ...receta, opiniones } })
})

// create a new recipe
app.post('/api/recetas', (req, res) => {
  const db = readData()

  const nuevaReceta = {
    id: generateId(),
    nombre: req.body.nombre,
    imagen: req.body.imagen,
    ingredientes: req.body.ingredientes,
    pasos: req.body.pasos,
    categoria: req.body.categoria,
    tiempoPreparacion: req.body.tiempoPreparacion,
    porciones: req.body.porciones,
    puntuacionPromedio: 0
  }

  db.recetas.push(nuevaReceta)
  saveData(db)

  res.status(201).json({ success: true, data: nuevaReceta })
})

// delete a recipe and its opinions
app.delete('/api/recetas/:id', (req, res) => {
  const db = readData()
  const index = db.recetas.findIndex(r => r.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'recipe not found' })
  }

  db.recetas.splice(index, 1)
  db.opiniones = db.opiniones.filter(o => o.recetaId !== req.params.id)
  saveData(db)

  res.json({ success: true, message: 'recipe deleted' })
})

// update a recipe
app.put('/api/recetas/:id', (req, res) => {
  const db = readData()
  const index = db.recetas.findIndex(r => r.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'recipe not found' })
  }

  db.recetas[index] = {
    ...db.recetas[index],
    nombre: req.body.nombre,
    imagen: req.body.imagen,
    ingredientes: req.body.ingredientes,
    pasos: req.body.pasos,
    categoria: req.body.categoria,
    tiempoPreparacion: req.body.tiempoPreparacion,
    porciones: req.body.porciones
  }

  saveData(db)
  res.json({ success: true, data: db.recetas[index] })
})

// ===== opinions =====

// add an opinion with vecesPreparada and update the average rating
app.post('/api/opiniones', (req, res) => {
  const db = readData()
  const receta = db.recetas.find(r => r.id === req.body.recetaId)

  if (!receta) {
    return res.status(404).json({ success: false, message: 'recipe not found' })
  }

  const nuevaOpinion = {
    id: generateId(),
    recetaId: req.body.recetaId,
    nombreComensal: req.body.nombreComensal,
    comentario: req.body.comentario,
    calificacion: req.body.calificacion,
    vecesPreparada: req.body.vecesPreparada,
    fecha: new Date().toISOString().split('T')[0]
  }

  db.opiniones.push(nuevaOpinion)

  // recalculate average rating
  const opinionesReceta = db.opiniones.filter(o => o.recetaId === req.body.recetaId)
  const suma = opinionesReceta.reduce((acc, o) => acc + o.calificacion, 0)
  receta.puntuacionPromedio = parseFloat((suma / opinionesReceta.length).toFixed(1))

  saveData(db)

  res.status(201).json({ success: true, data: nuevaOpinion })
})

// get all opinions for a recipe
app.get('/api/opiniones/receta/:recetaId', (req, res) => {
  const db = readData()
  const opiniones = db.opiniones.filter(o => o.recetaId === req.params.recetaId)
  res.json({ success: true, data: opiniones })
})

// delete an opinion and update the average rating
app.delete('/api/opiniones/:id', (req, res) => {
  const db = readData()
  const index = db.opiniones.findIndex(o => o.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'opinion not found' })
  }

  const recetaId = db.opiniones[index].recetaId
  db.opiniones.splice(index, 1)

  // recalculate average rating
  const receta = db.recetas.find(r => r.id === recetaId)
  if (receta) {
    const restantes = db.opiniones.filter(o => o.recetaId === recetaId)
    if (restantes.length > 0) {
      const suma = restantes.reduce((acc, o) => acc + o.calificacion, 0)
      receta.puntuacionPromedio = parseFloat((suma / restantes.length).toFixed(1))
    } else {
      receta.puntuacionPromedio = 0
    }
  }

  saveData(db)

  res.json({ success: true, message: 'opinion deleted' })
})

// home
app.get('/', (req, res) => {
  res.json({ message: 'recipes api is running!' })
})

app.listen(3000, () => {
  console.log('server running on http://localhost:3000')
})

// Nuevo endpoint para las estadísticas completas
app.get('/api/recetas/:id/estadisticas', (req, res) => {
  const db = readData();
  const receta = db.recetas.find(r => r.id === req.params.id);

  if (!receta) {
    return res.status(404).json({ success: false, message: 'recipe not found' });
  }

  const opiniones = db.opiniones.filter(o => o.recetaId === req.params.id);
  
  // Sumar cuántas veces se ha preparado según los registros de opiniones
  const totalVecesPreparada = opiniones.reduce((acc, o) => acc + (o.vecesPreparada || 0), 0);

  res.json({
    success: true,
    data: {
      puntuacionPromedio: receta.puntuacionPromedio,
      totalPreparaciones: totalVecesPreparada,
      totalOpiniones: opiniones.length,
      tiempoPreparacion: receta.tiempoPreparacion,
      porciones: receta.porciones,
      opiniones: opiniones
    }
  });
});