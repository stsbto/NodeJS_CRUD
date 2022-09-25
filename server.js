const dotenv = require('dotenv'); // khai bao bien moi truong
const mongoose = require('mongoose'); //de connect db

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 🔥 Shutting dowm...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' }); //khai bieo bien moi truong voi file custom
const app = require('./app');
//link connect db
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//connect db
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));

//run app
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port} --> ${process.env.NODE_ENV} 🌎`);
});

process.on('unhandledRejection', err => {
  console.log('UNCAUGHT EXCEPTION! 🔥 Shutting dowm...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
