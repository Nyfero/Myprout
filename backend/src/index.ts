import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()

const allowedOrigins = ['http://localhost:5173', 'https://myprout.fr']

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json())

import cookieParser from 'cookie-parser'
app.use(cookieParser())

import authRoutes from './routes/auth'
app.use('/api/auth', authRoutes)

import adminRoutes from './routes/admin'
app.use('/api/admin/', adminRoutes)

import passwordRoutes from './routes/passwords'
app.use('/api/passwords/', passwordRoutes)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
