const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  email: String,
  passwordHash: String,
});

const contactSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  firm: String,
  email: String,
  phone: String,
  linkedin: String,
  referred: Boolean,
});

const interviewSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  contactId: mongoose.Schema.Types.ObjectId,
  date: Date,
  status: String,
  notes: String,
});

const documentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  url: String,
  type: String,
});

const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Interview = mongoose.model('Interview', interviewSchema);
const Document = mongoose.model('Document', documentSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => {
  res.send('Investment Banking CRM API is running');
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(409).json({ message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ email, passwordHash });
  await user.save();

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get('/contacts', authenticateToken, async (req, res) => {
  const contacts = await Contact.find({ userId: req.user.id });
  res.json(contacts);
});

app.post('/contacts', authenticateToken, async (req, res) => {
  const contact = new Contact({ ...req.body, userId: req.user.id });
  await contact.save();
  res.json(contact);
});

app.put('/contacts/:id', authenticateToken, async (req, res) => {
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true }
  );
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  res.json(contact);
});

app.delete('/contacts/:id', authenticateToken, async (req, res) => {
  const result = await Contact.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Contact not found' });
  res.json({ message: 'Deleted' });
});

app.get('/interviews', authenticateToken, async (req, res) => {
  const interviews = await Interview.find({ userId: req.user.id });
  res.json(interviews);
});

app.post('/interviews', authenticateToken, async (req, res) => {
  const interview = new Interview({ ...req.body, userId: req.user.id });
  await interview.save();
  res.json(interview);
});

app.put('/interviews/:id', authenticateToken, async (req, res) => {
  const interview = await Interview.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true }
  );
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  res.json(interview);
});

app.delete('/interviews/:id', authenticateToken, async (req, res) => {
  const result = await Interview.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Interview not found' });
  res.json({ message: 'Deleted' });
});

app.get('/documents', authenticateToken, async (req, res) => {
  const documents = await Document.find({ userId: req.user.id });
  res.json(documents);
});

app.post('/documents', authenticateToken, async (req, res) => {
  const document = new Document({ ...req.body, userId: req.user.id });
  await document.save();
  res.json(document);
});

app.put('/documents/:id', authenticateToken, async (req, res) => {
  const document = await Document.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true }
  );
  if (!document) return res.status(404).json({ message: 'Document not found' });
  res.json(document);
});

app.delete('/documents/:id', authenticateToken, async (req, res) => {
  const result = await Document.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Document not found' });
  res.json({ message: 'Deleted' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});