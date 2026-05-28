# MicroGuard Backend API

Backend desarrollado para la plataforma **MicroGuard**, una aplicación orientada a la gestión, monitoreo y administración de procesos empresariales y operativos mediante una arquitectura escalable basada en APIs REST.

El proyecto fue desarrollado utilizando una arquitectura modular inspirada en patrones profesionales como MVC + Services + Repository Pattern, priorizando:

* Escalabilidad
* Mantenibilidad
* Seguridad
* Separación de responsabilidades
* Buenas prácticas backend

---

# Tecnologías Utilizadas

## Backend

* Node.js
* Express.js
* PostgreSQL
* JWT Authentication
* bcrypt
* dotenv

## Arquitectura

* REST API
* MVC Pattern
* Service Layer
* Repository Pattern
* Middlewares
* Validaciones

---

# Características Principales

* Autenticación mediante JWT
* Manejo de roles y permisos
* Arquitectura desacoplada
* Conexión con PostgreSQL
* Middlewares de seguridad
* Validación de datos
* Manejo centralizado de errores
* API modular y escalable
* Separación entre lógica de negocio y acceso a datos

---

# Arquitectura del Proyecto

```txt
src/
│
├── config/
│   └── database.js
│
├── controllers/
│
├── services/
│
├── repositories/
│
├── routes/
│
├── middlewares/
│
├── validators/
│
├── utils/
│
├── constants/
│
└── app.js
```

---

# Flujo de la Arquitectura

```txt
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
PostgreSQL
```

---

# Descripción de Capas

## Routes

Definen los endpoints disponibles de la API.

## Controllers

Gestionan las peticiones HTTP y las respuestas.

## Services

Contienen la lógica de negocio principal.

## Repositories

Gestionan el acceso y consultas a la base de datos PostgreSQL.

## Middlewares

Manejo de autenticación, validaciones y control de errores.

---

# Seguridad

El backend implementa:

* Hash de contraseñas con bcrypt
* Autenticación JWT
* Variables de entorno con dotenv
* Validación de peticiones
* Middleware de autorización

---

# Base de Datos

La aplicación utiliza PostgreSQL como sistema de gestión de base de datos relacional.

Se diseñó una estructura enfocada en:

* Escalabilidad
* Relaciones normalizadas
* Optimización de consultas
* Integridad de datos

---

# Endpoints Principales

## Auth

```http
POST /api/auth/login
POST /api/auth/register
```

## Usuarios

```http
GET /api/users
GET /api/users/:id
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

---

# Objetivos del Proyecto

* Implementar una arquitectura backend escalable
* Aplicar buenas prácticas de desarrollo
* Mejorar el rendimiento y organización del código
* Desarrollar una API mantenible para aplicaciones empresariales
* Fortalecer conocimientos en Node.js y PostgreSQL

---

# Aprendizajes Aplicados

Durante el desarrollo del proyecto se aplicaron conceptos relacionados con:

* Arquitectura backend
* Diseño de APIs REST
* Gestión de autenticación
* Manejo de middlewares
* Optimización de consultas SQL
* Separación de responsabilidades
* Seguridad backend
* Organización modular

---

# Estado del Proyecto

Proyecto en desarrollo y mejora continua.

Próximamente:

* Documentación Swagger
* Docker
* Testing
* Logs avanzados
* CI/CD
* Deploy en servidor cloud

---

# Autor

Desarrollado por Jhordany Torres.

Backend Developer | Software Developer
