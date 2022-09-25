const express = require('express');
const morgan = require('morgan');
const path = require('path');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');

const app = express();

/*
  Middleware truoc khi chay router && controller
*/
app.use((req, res, next) => {
  //console khi request tu postman
  console.log('----------------------------- from postman 🍊');
  // console.log(path.join(__dirname, 'public'));
  next();
});

// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
//loi tat ca cac duong dan khong hop le
app.use('*', (req, res, next) => {
  console.log(req.originalUrl);
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); //next toi error
});

app.use(errorController);

module.exports = app;
