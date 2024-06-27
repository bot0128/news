const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();
const port = 5000;

// Initialize Firestore Admin SDK
const serviceAccount = require('./key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

// Routes
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username, email, password, phone, location } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').doc(email).set({
      username,
      email,
      password: hashedPassword,
      phone,
      location
    });
    res.redirect('/login');
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) {
      return res.send('User does not exist');
    }

    const user = userDoc.data();
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.userId = email;
      res.redirect('/search');
    } else {
      res.send('Incorrect password');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/search', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('search');
});

app.post('/search', async (req, res) => {
  const { companyName } = req.body;
  try {
    const response = await axios.get(`https://newsapi.org/v2/everything?q=${companyName}&apiKey=2fa46610970c402db7c7d025c28e9d10`);
    const articles = response.data.articles;
    res.render('result', { articles });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
