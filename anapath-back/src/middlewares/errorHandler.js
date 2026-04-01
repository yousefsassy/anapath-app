export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur.',
  });
}
