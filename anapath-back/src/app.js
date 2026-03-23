import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Anapath backend is running',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
