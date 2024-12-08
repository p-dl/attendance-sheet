const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path'); // Use path module for correct file paths

const app = express();
const port = process.env.PORT || 3000;

// Define the correct path to the attendance.json file inside the 'data' folder
const attendanceFilePath = path.join(__dirname, 'data', 'attendance.json');

// Serve static files from the 'public' directory (frontend assets like HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(bodyParser.json());

// Secret key for JWT signing
const JWT_SECRET = 'your-secret-key';

// Dummy user credentials (In a real app, store securely, like in a database)
const validTokens = new Set(); // Track active tokens

// Dummy user credentials
const users = [
  { username: 'teacher', password: 'Test@321', role: 'teacher' },
  { username: 'student', password: 'Test@123', role: 'student' },
];

// Load data from attendance.json or use default data
function loadAttendanceData() {
  try {
    const data = fs.readFileSync(attendanceFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log('Could not read attendance file, using default data');
    return {
      a13: { students: [] },
      a14: { students: [] },
      a19: { students: [] },
    };
  }
}

// Save data to attendance.json
function saveAttendanceData() {
  fs.writeFileSync(attendanceFilePath, JSON.stringify(attendanceData, null, 2), 'utf8');
}

let attendanceData = loadAttendanceData();

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(403).json({ message: 'Token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user; // Attach decoded user data to the request
    next();
  });
}

// Middleware to allow only teachers
function authorizeTeacher(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access restricted to teachers only' });
  }
  next();
}

// Route to login (authenticate user)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Find user by username and password
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    validTokens.add(token);
    return res.json({ message: 'Login successful', token, role: user.role });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

// Route to add a student (accessible to both teachers and students)
app.post('/api/add-student', authenticateToken, (req, res) => {
  const { className, studentName } = req.body;

  if (!studentName || !className) {
    return res.status(400).json({ message: 'Student name and class are required' });
  }

  if (!attendanceData[className]) {
    return res.status(400).json({ message: 'Invalid class name' });
  }

  const newStudent = {
    name: studentName,
    attendance: Array(25).fill(false),
  };

  attendanceData[className].students.push(newStudent);
  saveAttendanceData();

  return res.status(201).json({ message: 'Student added successfully' });
});

// Route to get attendance for a class (accessible to all authenticated users)
app.get('/api/get-attendance/:className', authenticateToken, (req, res) => {
  const { className } = req.params;

  if (!attendanceData[className]) {
    return res.status(404).json({ message: 'Class not found' });
  }

  // Sort students alphabetically by name
  const sortedStudents = attendanceData[className].students.sort((a, b) => a.name.localeCompare(b.name));

  return res.json({ students: sortedStudents });
});

// Route to mark attendance (accessible only to teachers)
app.post('/api/mark-attendance', authenticateToken, authorizeTeacher, (req, res) => {
  const { className, studentIndex, day, status } = req.body;

  if (!attendanceData[className]) {
    return res.status(404).json({ message: 'Class not found' });
  }

  const student = attendanceData[className].students[studentIndex];
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  if (day < 0 || day >= 25) {
    return res.status(400).json({ message: 'Invalid day' });
  }

  student.attendance[day] = status;
  saveAttendanceData();

  return res.json({ message: 'Attendance updated successfully' });
});

// Route to delete a student (accessible only to teachers)
app.delete('/api/delete-student', authenticateToken, authorizeTeacher, (req, res) => {
  const { className, studentIndex } = req.body;

  if (!attendanceData[className]) {
    return res.status(404).json({ message: 'Class not found' });
  }

  const student = attendanceData[className].students[studentIndex];
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  attendanceData[className].students.splice(studentIndex, 1);
  saveAttendanceData();

  return res.json({ message: 'Student deleted successfully' });
});

// Route to logout and invalidate the token
app.post('/api/logout', (req, res) => {
  const { token } = req.body;

  if (validTokens.has(token)) {
    validTokens.delete(token);
    return res.json({ message: 'Logged out successfully' });
  }

  return res.status(400).json({ message: 'Invalid token' });
});

// Server setup
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});
