const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

const Tour = require('./../../models/tourModel');
// const User = require('./../../models/userModel');

dotenv.config({ path: `${__dirname}./../../config.env` });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours-simple.json`));

const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('Data successful import!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('Data successful delete!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else {
  console.log('Nothing change');
  process.exit();
}
