// Central error-handling middleware for Express.
// Any error passed to next(err) in a route/controller ends up here.
export function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message
  });
}
