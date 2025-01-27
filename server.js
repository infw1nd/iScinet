const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const USERS_FILE = 'users.json';

// Hàm load/save users
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading users file:', err);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error writing to users file:', err);
    }
}

// Serve static
app.use(express.static(path.join(__dirname, 'public')));

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middleware auth
app.use(async (req, res, next) => {
    if (!req.headers['user-credentials']) {
        return res.status(401).send('Authorization required');
    }

    const credentials = Buffer.from(req.headers['user-credentials'], 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
        return res.status(400).send('Invalid username or password');
    }

    let users = loadUsers();
    let user = users.find(u => u.username === username);

    if (user) {
        // Kiểm tra password
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).send('Incorrect password');
        }
        req.user = user;
    } else {
        // Tạo user mới, tránh trùng lặp tasks
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = {
                username,
                passwordHash: hashedPassword,
                // 3 task mẫu
                tasks: [
                    { name: 'Sample Task 1', checked: false, weight: 10 },
                    { name: 'Sample Task 2', checked: false, weight: 20 },
                    { name: 'Sample Task 3', checked: false, weight: 30 }
                ],
                score: 0,
                target: 100,
                theme: 'light',
                mode: 'free'
            };
            users.push(user);
            saveUsers(users);
            console.log(`New user ${username} created.`);
            req.user = user;
        } catch (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Internal Server Error');
        }
    }
    next();
});

// Lấy data user
app.get('/user-data', (req, res) => {
    res.json(req.user);
});

// Update user data
app.post('/update-data', (req, res) => {
    console.log("Received user data update:", req.body);

    let users = loadUsers();
    const userIndex = users.findIndex(u => u.username === req.user.username);
    if (userIndex !== -1) {
        users[userIndex] = {
            ...users[userIndex],
            tasks: req.body.tasks || users[userIndex].tasks,
            theme: req.body.theme || users[userIndex].theme,
            mode: req.body.mode || users[userIndex].mode,
            score: req.body.score !== undefined ? req.body.score : users[userIndex].score,
            target: req.body.target !== undefined ? req.body.target : users[userIndex].target
        };
        saveUsers(users);
        console.log("User data saved successfully.");
        res.json({ success: true });
    } else {
        console.error("User not found.");
        res.status(400).json({ success: false, message: 'User not found' });
    }
});

// Thêm route cho đổi password
app.post('/change-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ success: false, message: 'No new password provided' });
  }

  try {
    let users = loadUsers();
    const userIndex = users.findIndex(u => u.username === req.user.username);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật passwordHash
    users[userIndex].passwordHash = hashedPassword;
    saveUsers(users);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// Trang chủ -> redirect login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
