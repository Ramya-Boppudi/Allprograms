module.exports = (err, req, res, next) => {
  console.error(err.stack || err);
  const statusCode = err.statusCode || (err.code && String(err.code).startsWith('LIMIT_') ? 400 : 500);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong on the server.',
  });
};
