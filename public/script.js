let currentClass = 'a13'; // Default to 'a13'

// Check if user is logged in upon page load
window.onload = function () {
  const token = sessionStorage.getItem('token');
  if (token) {
    // Make sure 'a13' is selected on load
    showTab(currentClass);

    // Hide login form and show attendance tabs and table
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('classTabs').style.display = 'flex';
    document.getElementById('attendanceContainer').style.display = 'block';
    document.getElementById('logoutForm').style.display = 'block';

    loadAttendance(); // Load attendance for default class only once
  }
};

// Handle login
function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.token) {
        // Store token in session storage
        sessionStorage.setItem('token', data.token);

        // Hide login form and show attendance tabs and table
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('classTabs').style.display = 'flex';
        document.getElementById('attendanceContainer').style.display = 'block';
        document.getElementById('logoutForm').style.display = 'block';

        showTab('a13') // Automatically show the 'a13' class
      } else {
        alert(data.message);
      }
    })
    .catch((error) => {
      console.error('Login error:', error);
    });
}

// Handle logout
function logout() {
  sessionStorage.removeItem('token');
  location.reload(); // Reload the page to show the login form again
}

// Load attendance for selected class
async function loadAttendance() {
  const token = sessionStorage.getItem('token');

  const response = await fetch(`http://localhost:3000/api/get-attendance/${currentClass}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (response.ok) {
    // Populate the table with students' attendance data
    const tableBody = document.querySelector('#attendanceTable tbody');
    tableBody.innerHTML = ''; // Clear the current table

    data.students.forEach((student, studentIndex) => {
      const studentRow = document.createElement('tr');

      // Adding sticky to the first two columns (Delete and Name)
      studentRow.innerHTML = `
        <td class="sticky">${studentIndex + 1}</td> <!-- Serial Number -->
        <td class="sticky">
          <button class="delete-btn" onclick="deleteStudent(${studentIndex})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
        <td class="sticky">${student.name}</td>
      `;

      // Adding the 25 days of attendance
      for (let i = 0; i < 25; i++) {
        const attendanceCell = document.createElement('td');
        attendanceCell.innerHTML = `<input type="checkbox" ${student.attendance[i] ? 'checked' : ''} data-student-index="${studentIndex}" data-day="${i}" onchange="handleAttendanceChange(this)" />`;
        studentRow.appendChild(attendanceCell);
      }
      tableBody.appendChild(studentRow);
    });
  } else {
    alert(data.message || 'Failed to load attendance data');
  }
}

// Handle tab switching for class attendance
function showTab(className) {
  currentClass = className;

  // Update the class heading
  document.getElementById('class-heading').innerText = `Attendance for ${className.toUpperCase()}`;

  // Load the attendance data for the selected class
  loadAttendance();

  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Add active class to the clicked tab
  const activeTab = document.querySelector(`#${className}`);
  activeTab?.classList.add('active');
}

// Handle attendance checkbox change
function handleAttendanceChange(checkbox) {
  const studentIndex = checkbox.getAttribute('data-student-index');
  const day = checkbox.getAttribute('data-day');
  const status = checkbox.checked;

  const token = sessionStorage.getItem('token');
  fetch('http://localhost:3000/api/mark-attendance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: currentClass,
      studentIndex: studentIndex,
      day: day,
      status: status,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        console.log(data.message);
      }
    })
    .catch((error) => {
      console.error('Error marking attendance:', error);
    });
}

// Add student to the class
function addStudent(event) {
  event.preventDefault();

  const studentName = document.getElementById('studentName').value;
  if (!studentName) return;

  const token = sessionStorage.getItem('token');
  fetch('http://localhost:3000/api/add-student', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: currentClass,
      studentName: studentName,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        console.log(data.message);
        loadAttendance(); // Reload attendance data
        document.getElementById('studentName').value = ''; // Clear form input
      }
    })
    .catch((error) => {
      console.error('Error adding student:', error);
    });
}

// Delete student from the class
function deleteStudent(studentIndex) {
  const token = sessionStorage.getItem('token');
  fetch('http://localhost:3000/api/delete-student', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      className: currentClass,
      studentIndex: studentIndex,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        console.log(data.message);
        loadAttendance(); // Reload attendance data after deletion
      }
    })
    .catch((error) => {
      console.error('Error deleting student:', error);
    });
}
