const AppError = require('../utils/appError');

const handleCastError = err => {
  const message = `Invailid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateError = err => {
  const message = `Dupicate field value: ${err.keyValue.name}. Please change another name!`;
  return new AppError(message, 400);
};
const handleValidationError = err => {
  const values = Object.values(err.errors).map(el => el.message);
  const message = `Invailid input data. ${values.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError(`Invalid token. Please login again!`, 401);

const handleExpiredError = () =>
  new AppError(`Token is expired. Please login again!`, 401);

const handleErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.statusCode,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

const handleErrorClient = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message
    });
  } else {
    res.status(500).json({
      status: 500,
      message: 'Something were wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'fail';
  if (process.env.NODE_ENV === 'development') {
    handleErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // let error = JSON.parse(JSON.stringify(err));
    let error = { ...err };
    error.message = err.message;
    console.log(error);
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleExpiredError();
    handleErrorClient(error, res);
  }
};
