const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

exports.register = async (req, res) => {
  console.log('\n========== REGISTRATION START ==========');
  console.log('1. Request received at:', new Date().toISOString());
  console.log('2. Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { name, email, password } = req.body;
    
    console.log('4. Validating input...');
    if (!name || !email || !password) {
      console.log('5. Validation FAILED: Missing fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }
    console.log('5. Validation PASSED');

    console.log('6. Checking if user exists:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('7. User ALREADY EXISTS:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    console.log('7. User does not exist, proceeding...');

    console.log('8. Creating user...');
    const user = await User.create({
      name,
      email,
      password
    });
    console.log('9. User created successfully! ID:', user._id);

    console.log('10. Generating token...');
    const token = generateToken(user._id);
    console.log('11. Token generated successfully');

    console.log('12. Sending success response');
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        themePreference: user.themePreference
      }
    });
    console.log('========== REGISTRATION SUCCESS ==========\n');
    
  } catch (error) {
    console.error('\n========== REGISTRATION ERROR ==========');
    console.error('Error message:', error.message);
    console.error('========== ERROR END ==========\n');
    
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

exports.login = async (req, res) => {
  console.log('\n========== LOGIN START ==========');
  console.log('Login attempt for:', req.body.email);
  
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);
    console.log('Login successful for:', email);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        themePreference: user.themePreference
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        themePreference: user.themePreference,
        familyTrees: user.familyTrees
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};