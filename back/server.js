require('dotenv').config();



const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const {Pool} = require('pg');
const bcrypt = require('bcrypt');

const app = express();

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to upload to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'akline-books',
        resource_type: 'raw',  // ← required for PDFs
        allowed_formats: ['pdf']
    }
});

const upload = multer({ storage });

app.use(cors({
    origin: ['https://alkine.surge.sh', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

//postgre connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false}
});

//email sender
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

//register// add new user
app.post('/api/register', async (req, res) => {
    const {firstname, lastname, email, password, confirmPassword} = req.body;

    if(!firstname || !lastname || !email || !password || !confirmPassword){
        return res.status(400).json({error: 'All fields required'});
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)){
        return res.status(400).json({error: 'Invalid email format'});
    }

    if(password.length < 6){
        return res.status(400).json({error: 'Password must be at least 6 characters'});
    }

    if(password !== confirmPassword){
        return res.status(400).json({error: 'Passwords do not match'});
    }

    try {
        const verifyToken = crypto.randomBytes(32).toString('hex');

        const result = await pool.query(
            'INSERT INTO users (firstname, lastname, email, password, verify_token) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
            [firstname, lastname, email, password, verifyToken]
        );

        // ← Respond immediately before sending email
        res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });

        // ← Send email AFTER responding so it doesn't block
        const verifyLink = `https://akline-backend-production.up.railway.app/api/verify?token=${verifyToken}`;

        resend.emails.send({
            from: 'noreply@edtech-akline.me',
            to: email,
            subject: 'Verify your email',
            html: `
                <h2>Welcome ${firstname}!</h2>
                <p>Click the link below to verify your email:</p>
                <a href="${verifyLink}">Verify Email</a>
                <p>This link expires in 24 hours.</p>
            `
        }).then(() => {
            console.log('Email sent successfully to:', email);
        }).catch(err => {
            console.error('Email send failed:', err);
        });
    } catch(err) {
        console.error(err);
        if(err.code === '23505'){
            res.status(409).json({ error: 'Email already exists'});
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

//LOGIN// verifying the user
app.post('/api/login', async (req, res) => {
    const {email, password} = req.body;

    if(!email || !password){
        return res.status(400).json({ error: 'Email and password required'});
    }

    try {
        //getting user email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Email not found'});
        }
        //comparing password
        /*const isValid = await bcrypt.compare(password, user.password);
        if(!isValid) return res.status(401).json({error: 'Invalid email or password'});*/

        //check password
        if(user.password !== password){
            return res.status(401).json({ error: 'Invalid email or password'});
        }

        //block unverified user
        if(!user.verified){
            return res.status(401).json({error: 'Please verify your email first'});
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                password: user.password,
                isAdmin: user.is_admin  // ← add this
            }
        });
    }catch (err) {
        console.error(err);
        // res.status(500).json({ error: 'Database error'});
        res.status(500).json({ error: err.message });
    }
});

//GET ALL USERS// for testing
app.get('/api/users', async (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if(apiKey !== process.env.API_KEY) {
        return res.status(401).json({error: 'Unauthorized'});
    }

    try {
        const result = await pool.query('SELECT id, email, password FROM users');
        res.json(result.rows);
    }catch (err){
        console.error(err);
        res.status(500).json({error: "Database query failed"});
    }
});

//DELETE// deleting a user
app.delete('/api/users/:id', async (req, res) => {
    const {id} = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING  *',
            [id]
        );

        if (result.rows.length === 0){
            return res.status(404).json({error: 'User not Found'});
        }

        res.json({message: 'User deleted successfully', user: result.rows[0]});
    }catch (err){
            console.error(err);
            res.status(500).json({error: 'Database error'});
        }
});

//CHANGE// changing email or pass
app.put('/api/users/:id', async (req, res) => {
    const {id} = req.params;
    const {email, password} = req.body;

    try{
        //hashing
        /*const hashedPass = password ? await bcrypt.hash(password, 10) : null;*/

        const result = await pool.query(
            `UPDATE users SET
                email = COALESCE($1, email),
                password = COALESCE($2, password)
                WHERE id = $3 RETURNING id, email`,
                [email, password, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({error: 'User not found'});
        }
        res.json({ message: 'User updated', user: result.rows[0]});
    }catch(err){
        console.error(err);
        res.status(500).json({ error: 'Database error'});
    }
});

//VERIFICATION// Email verification
app.get('/api/verify', async (req, res) => {
    const {token} = req.query;

    try{
        const result = await pool.query(
            'UPDATE users SET verified = TRUE, verify_token = NULL WHERE verify_token = $1 RETURNING email',
            [token]
        );

        if(result.rows.length === 0){
            return res.status(400).json({error: '<h2>Invalid or expired verification link ❌</h2>'});
        }

        res.send(`
            <h2>Email verified successfully! ✅</h2>
            <p>You can now <a href="https://alkine.surge.sh">login here</a></p>`);
    }catch (err){
        console.error(err);
        res.status(500).json({error: 'Database error'});
    }
});

// app.get('/api/users', async (req, res) => {
//     const result = await pool.query('SELECT * FROM users');
//     res.json(result.rows);
// });

// app.post('/api/users', async (req, res) => {
//     const {name, email} = req.body;
//     const result = await pool.query(
//         'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
//         [name, email]
//     );
//     res.json(result.rows[0]); d
// });

async function isAdmin(req, res, next) {
    console.log('req.body:', req.body);
    const { userId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    try {
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next(); // ← user is admin, continue
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
}

//get all books
// GET all books — public, anyone can see
app.get('/api/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

//POST add a book - admin only
app.post('/api/books', isAdmin, async (req, res) => {
    const { title, author, cover_url, file_url, category, userId } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    try {
        const result = await pool.query(
            'INSERT INTO books (title, author, cover_url, file_url, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, author, cover_url, file_url, category]
        );
        res.status(201).json({ book: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE a book — admin only
app.delete('/api/books/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // ← Delete related progress records first
        await pool.query('DELETE FROM reading_progress WHERE book_id = $1', [id]);

        // ← Then delete the book
        const result = await pool.query(
            'DELETE FROM books WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ message: 'Book deleted', book: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET check if user is admin — for frontend to know
app.get('/api/check-admin/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        res.json({ isAdmin: user ? user.is_admin : false });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET progress for a user
app.get('/api/progress/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT book_id, progress FROM reading_progress WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SET/UPDATE progress
app.post('/api/progress', async (req, res) => {
    const { userId, bookId, progress } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO reading_progress (user_id, book_id, progress)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, book_id)
             DO UPDATE SET progress = $3
             RETURNING *`,
            [userId, bookId, progress]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPLOAD PDF — admin only
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    const { userId } = req.body;

    // Check admin
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({ 
        message: 'PDF uploaded successfully',
        url: req.file.path  // ← Cloudinary URL
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})