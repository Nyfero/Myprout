import 'dotenv/config'
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

import authRoutes from './routes/auth'
app.use('/api/auth', authRoutes)

import adminRoutes from './routes/admin'
app.use('/api/admin/', adminRoutes)

import passwordRoutes from './routes/passwords'
app.use('/api/passwords/', passwordRoutes)

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});