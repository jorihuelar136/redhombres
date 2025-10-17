require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Airtable = require('airtable');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory user store (still used alongside Airtable cache)
const users = [];

// Airtable setup (expects env vars: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME = 'Usuarios' } = process.env;
let airtableBase = null;
if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
  Airtable.configure({ apiKey: AIRTABLE_API_KEY });
  airtableBase = Airtable.base(AIRTABLE_BASE_ID);
  console.log('Airtable configurado. Tabla:', AIRTABLE_TABLE_NAME);
} else {
  console.warn('Airtable no configurado: faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID');
}

async function findAirtableUserByEmail(email){
  if(!airtableBase) return null;
  try {
    const records = await airtableBase(AIRTABLE_TABLE_NAME).select({
      filterByFormula: `LOWER({Email}) = "${String(email).toLowerCase()}"`,
      maxRecords: 1
    }).all();
    return records[0] || null;
  } catch(err){
    console.error('Error consultando Airtable:', err.message);
    return null;
  }
}

async function createAirtableUser(user){
  if(!airtableBase) return null;
  try {
    // Nota: Si el campo "Creado" en Airtable es de tipo "Created time" es computado y NO debemos asignarlo.
    // Solo enviamos los campos editables.
    const record = await airtableBase(AIRTABLE_TABLE_NAME).create({
      Nombre: user.name,
      Email: user.email,
      PasswordHash: user.password // Dev only. Remove when migrating to real DB.
      // Creado: (no se envía porque es un campo calculado)
    });
    return record;
  } catch(err){
    console.error('Error creando usuario Airtable:', err.message);
    return null;
  }
}

function generateToken(user){
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '2h' });
}

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ message: 'Falta Authorization header' });
  const parts = auth.split(' ');
  if(parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Formato token inválido' });
  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'devsecret');
    req.user = decoded;
    next();
  } catch(err){
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

// Register
app.post('/api/auth/register', async (req,res)=>{
  const { name, email, password } = req.body;
  if(!name || !email || !password) return res.status(400).json({ message: 'Campos requeridos faltantes' });

  // Check in-memory first
  if(users.find(u=>u.email === email)) return res.status(409).json({ message: 'Email ya registrado (memoria)' });

  // Check Airtable
  const existingRecord = await findAirtableUserByEmail(email);
  if(existingRecord) return res.status(409).json({ message: 'Email ya registrado (Airtable)' });

  const hash = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, name, email, password: hash };
  users.push(user);

  // Attempt Airtable create (non-blocking failure)
  const airtableRecord = await createAirtableUser(user);
  const responseUser = { id: user.id, name: user.name, email: user.email };
  return res.status(201).json({ 
    message: 'Usuario creado', 
    user: responseUser,
    airtableId: airtableRecord ? airtableRecord.getId() : null
  });
});

// Login
app.post('/api/auth/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = users.find(u=>u.email === email);
  if(!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  const match = await bcrypt.compare(password, user.password);
  if(!match) return res.status(401).json({ message: 'Credenciales inválidas' });
  const token = generateToken(user);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// AI endpoints (placeholder)
app.get('/api/ai/courses', authMiddleware, (req,res)=>{
  res.json({ message: 'Aquí podrás entrenar con los cursos. (Placeholder)', user: req.user });
});
app.get('/api/ai/bible', authMiddleware, (req,res)=>{
  res.json({ message: 'Agente IA bíblico listo para responder preguntas. (Placeholder)', user: req.user });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Backend auth & IA placeholder escuchando en puerto ${PORT}`));

// --- Airtable utility routes for testing ---
app.get('/api/airtable/ping', async (req,res)=>{
  if(!airtableBase) return res.status(500).json({ ok:false, message:'Airtable no configurado', hint:'Revisa AIRTABLE_API_KEY y AIRTABLE_BASE_ID en .env' });
  try {
    const records = await airtableBase(AIRTABLE_TABLE_NAME).select({ maxRecords: 1 }).all();
    return res.json({ ok:true, count: records.length, table: AIRTABLE_TABLE_NAME, firstId: records[0]?.getId() || null });
  } catch(err){
    console.error('Ping Airtable error:', err); // server log
    let hint = 'Verifica: nombre exacto de tabla, Base ID, permisos del token';
    if(/NOT_FOUND|Could not find/i.test(err.message)) {
      hint = 'Tabla o Base no encontrada. Asegúrate que AIRTABLE_BASE_ID y AIRTABLE_TABLE_NAME coinciden y el token tiene acceso.';
    }
    return res.status(500).json({ ok:false, message:'Error consultando Airtable', error: err.message, table: AIRTABLE_TABLE_NAME, hint });
  }
});

app.get('/api/airtable/users', async (req,res)=>{
  if(!airtableBase) return res.status(500).json({ ok:false, message:'Airtable no configurado' });
  try {
    const records = await airtableBase(AIRTABLE_TABLE_NAME).select({ maxRecords: 25, sort: [{ field: 'Creado', direction: 'desc' }] }).all();
    const data = records.map(r=>({ id: r.getId(), Nombre: r.get('Nombre'), Email: r.get('Email'), Creado: r.get('Creado') }));
    return res.json({ ok:true, total: data.length, users: data });
  } catch(err){
    return res.status(500).json({ ok:false, message:'Error listando usuarios', error: err.message });
  }
});

// Single user lookup (dev helper)
app.get('/api/airtable/user', async (req,res)=>{
  if(!airtableBase) return res.status(500).json({ ok:false, message:'Airtable no configurado' });
  const { email } = req.query;
  if(!email) return res.status(400).json({ ok:false, message:'Falta email ?email=' });
  try {
    const rec = await findAirtableUserByEmail(email);
    if(!rec) return res.status(404).json({ ok:false, message:'No encontrado' });
    return res.json({ ok:true, user: {
      id: rec.getId(),
      Nombre: rec.get('Nombre'),
      Email: rec.get('Email'),
      Creado: rec.get('Creado'),
      // Nunca expongas PasswordHash públicamente en producción
      TienePasswordHash: !!rec.get('PasswordHash')
    }});
  } catch(err){
    return res.status(500).json({ ok:false, message:'Error consultando usuario', error: err.message });
  }
});
