//Autor: Hector Alfonzo
//Fecha de creacion: 29/07/2023
//Tema: Api para requerimientos en un hospital.

//Declarando constantes.
const express = require('express');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const cors = require('cors');

//Declarando aplicacion, puerto , formato y seguridad. 
const app = express();
const port = 6100;
app.use(bodyParser.json());
app.use(cors());

// Cargar contenido de la especificación Swagger desde el archivo JSON
const swaggerFile = fs.readFileSync('swagger.json', 'utf8');
const swaggerSpec = JSON.parse(swaggerFile);

const { Sequelize, DataTypes } = require('sequelize');

// Configuración de la conexión a PostgreSQL
const sequelize = new Sequelize('hospital', 'postgres', 'PENTEST', {
  host: 'localhost',
  dialect: 'postgres',
});

// Para probar la conexión a la base de datos
sequelize
  .authenticate()
  .then(() => {
    console.log('Conexión establecida con la base de datos PostgreSQL.');
  })
  .catch((err) => {
    console.error('Error al conectar a la base de datos:', err);
  });

console.log('Ahora voy a ingresar en el modelo de tablas');

// Creacion de tablas en la base de datos hospital.
// Modelo para la tabla de pacientes
const paciente = sequelize.define('paciente', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sexo: { // Nuevo campo "sexo"
    type: DataTypes.STRING,
    allowNull: true,
  },
  fecha_nacimiento: { // Nuevo campo "fecha_nacimiento"
    type: DataTypes.DATEONLY, // Usamos DataTypes.DATEONLY para almacenar solo la fecha sin la hora
    allowNull: true,
  },
  diagnostico: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: false, // Deshabilita la creación automática de createdAt y updatedAt
});

// Modelo para la tabla de signos vitales
const signovital = sequelize.define('signovital', {
  presion_arterial: { 
    type: DataTypes.STRING,
    allowNull: false,
  },
  ritmo_cardiaco: { 
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: false, // Deshabilita la creación automática de createdAt y updatedAt
});

// Definicion de relación entre pacientes y signos vitales (uno a muchos)
paciente.hasMany(signovital, { onDelete: 'CASCADE', hooks: true });
signovital.belongsTo(paciente);

// Aquí empiezan los endpoint.

// Funcion para obtener todos los pacientes
app.get('/pacientes', (req, res) => {
  paciente
    .findAll()
    .then((patients) => {
      res.json(patients);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al obtener los pacientes' });
    });
});

// Funcion para agregar un nuevo paciente
app.post('/pacientes', (req, res) => {
  const { nombre, apellido, sexo, fecha_nacimiento, diagnostico } = req.body;

  paciente
    .create({ nombre, apellido, sexo, fecha_nacimiento, diagnostico })
    .then((newPatient) => {
      res.status(201).json(newPatient);
    })
    .catch((err) => {
      console.error('Error al agregar un nuevo paciente:', err);
      res.status(500).json({ error: 'Error al agregar un nuevo paciente' });
    });
});
  
// Funcion para agregar signos vitales a un paciente
app.post('/pacientes/:id/signos-vitales', (req, res) => {
  const patientId = parseInt(req.params.id);
  const { presion_arterial, ritmo_cardiaco } = req.body;

  paciente
    .findByPk(patientId)
    .then((patient) => {
      if (!patient) {
        return res.status(404).json({ message: 'Paciente no encontrado' });
      }
      signovital
        .create({ presion_arterial, ritmo_cardiaco, pacienteId: patientId })
        .then((newVitalSign) => {
          res.status(201).json(newVitalSign);
        })
        .catch((err) => {
          res.status(500).json({ error: 'Error al agregar signos vitales' });
        });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al buscar el paciente' });
    });
});

// Funcion para editar información de un paciente
app.put('/pacientes/:id', (req, res) => {
  const patientId = parseInt(req.params.id);
  const { nombre, apellido, sexo, fecha_nacimiento, diagnostico } = req.body;

  paciente
    .findByPk(patientId)
    .then((patient) => {
      if (!patient) {
        return res.status(404).json({ message: 'Paciente no encontrado' });
      }
      paciente
        .update({ nombre, apellido, sexo, fecha_nacimiento, diagnostico}, { where: { id: patientId } })
        .then((updatedPatient) => {
          res.json(updatedPatient);
        })
        .catch((err) => {
          res.status(500).json({ error: 'Error al editar el paciente' });
        });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al buscar el paciente' });
    });
});

// Eliminar signos vitales de un paciente
// Eliminar signos vitales de un paciente
app.delete('/pacientes/:id/signos-vitales/delete', (req, res) => {
  const patientId = parseInt(req.params.id);

  signovital
    .destroy({ where: { pacienteId: patientId } })
    .then(() => {
      res.sendStatus(204);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al eliminar signos vitales' });
    });
});

// Eliminar información de un paciente y sus signos vitales
app.delete('/pacientes/:id', (req, res) => {
  const patientId = parseInt(req.params.id);

  paciente
    .destroy({ where: { id: patientId } })
    .then(() => {
      res.sendStatus(204);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Error al eliminar el paciente' });
    });
});

// Configuración de Swagger UI
const swaggerOptions = {
  definition: swaggerSpec,
  apis: ['pacientesdb.js'],
  exclude: ['createdAt', 'updatedAt'], // Excluye las columnas createdAt y updatedAt de la documentación.
};

const swaggerSpec2 = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec2));

// Sincronizar modelos con la base de datos y crear tablas (si no existen)
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados con la base de datos.');

    // Iniciar el servidor después de la sincronización de modelos
    app.listen(8000, () => {
      console.log(`Servidor en http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    console.error('Error al sincronizar modelos con la base de datos:', error);
  }
})();
console.log('He salido del bucle, estoy al final');

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}/api-docs`);
});
