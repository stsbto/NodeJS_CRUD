const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// const bcrypt = require('bcryptjs');

// const { promisify } = require('util');
const Error = require('../utils/appError');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

//https://github.com/auth0/node-jsonwebtoken
//Khoi tao 1 tolen theo id trong database
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

//tao respone send token
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true,
    httpOnly: true
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

/*
  Da xu ly loi trung email trong userModel
*/
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const user = await User.findById(newUser._id);
  createSendToken(user, 201, res);
});

/*
  Check req co email voi password hay chua
  Check email nay trong DB
  Check password voi email nay
*/
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide your email and password'));
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  createSendToken(user, 200, res);
};

/*
  Kiem tra Token co dung hay khong
  Giai ma Token thanh decode, sau do tim user dua tren decode 
  Kiem tra user co thay doi password khong, neu thoi gian token < thoi gian changedPassword thi Error
*/
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new Error('You are not logged in! Please log in to get access', 401)
    );
  }
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id).select('+password');
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist!',
        401
      )
    );
  }
  if (currentUser.passwordChangedAffter(decoded.iat)) {
    return next(
      new AppError('User recently changed. Please log in again!', 401)
    );
  }
  //dung de kiem tra role cho restrictTo
  req.user = currentUser;
  next();
});

/*
  chi admin va lead-guide moi co quyen next()
*/
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

/*
  Tim user bang req.body.email
  Khoi tao resetToken && ma hoa resetToken roi luu vao database
  Gui Email cho user kem theo resetToken (ma hoa khong luu trong database)
  Xoa settoken
  Xoa expire token
 */
exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address!', 404));
  }
  const resetToken = user.createPasswordResetToken();
  user.save({ validateBeforeSave: false });
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/resetPassword/${resetToken}`;
  const message = `Cá vàng quên mật khẩu hả? Vui lòng nhấp vào đây để đặt lại mật khẩu ${resetURL}.\nNếu bạn không quên mật khấu. Vui lòng bỏ qua email này!`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (invalid in 10min)',
      message
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There are an error sending the email. Try again later!',
        404
      )
    );
  }
};

/*
  Bam token ra de so sanh vi trong database luu token da bam
  !user -> error
  user -> setPassword
*/
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHmac('sha256', process.env.HASH_SECRET)
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+password');

  if (await user.correctPassword(req.body.password, user.password)) {
    return next(new AppError('Vui lòng nhập khác password cũ dùm 😒', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

/*
  Nhap id tu req.user o middleware protect de xac nhan da dang nhap
  find id trong db.
*/
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne(req.user._id).select('+password');
  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('Khong dung password', 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
