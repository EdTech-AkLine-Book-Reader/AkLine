const API = 'https://akline-backend-production.up.railway.app';

// Show/hide loading
function setLoading(type, isLoading) {
    const btn = document.getElementById(`${type}Btn`);
    const spinner = document.getElementById(`${type}Spinner`);

    if (isLoading) {
        btn.disabled = true;
        btn.textContent = type === 'register' ? 'Registering...' : 'Logging in...';
        spinner.classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.textContent = type === 'register' ? 'CREATE ACCOUNT' : 'LOG IN TO AKLINE';
        spinner.classList.add('hidden');
    }
}

// REGISTER
async function register() {
    const firstname = document.getElementById('registerFirstname').value;
    const lastname = document.getElementById('registerLastname').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('registerMsg').style.color = 'red';
        document.getElementById('registerMsg').textContent = '❌ Passwords do not match';
        return;
    }

    setLoading('register', true);
    document.getElementById('registerMsg').style.color = 'rgba(255,255,255,0.5)';
    document.getElementById('registerMsg').textContent = 'Connecting to server...';

    try {
        const response = await fetch(`${API}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstname, lastname, email, password, confirmPassword })
        });

        const data = await response.json();
        setLoading('register', false);

        if (response.ok) {
            document.getElementById('registerMsg').style.color = 'green';
            document.getElementById('registerMsg').textContent = '✅ ' + data.message;
        } else {
            document.getElementById('registerMsg').style.color = 'red';
            document.getElementById('registerMsg').textContent = '❌ ' + data.error;
        }
    } catch (err) {
        setLoading('register', false);
        document.getElementById('registerMsg').style.color = 'orange';
        document.getElementById('registerMsg').textContent = '⚠️ Server is waking up, please try again in 30 seconds.';
    }
}

// LOGIN
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    setLoading('login', true);
    document.getElementById('loginMsg').style.color = 'rgba(255,255,255,0.5)';
    document.getElementById('loginMsg').textContent = 'Connecting to server...';

    try {
        const response = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        setLoading('login', false);

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'home.html';
        } else {
            document.getElementById('loginMsg').style.color = 'red';
            document.getElementById('loginMsg').textContent = '❌ ' + data.error;
        }
    } catch (err) {
        setLoading('login', false);
        document.getElementById('loginMsg').style.color = 'orange';
        document.getElementById('loginMsg').textContent = '⚠️ Server is waking up, please try again in 30 seconds.';
    }
}

// Floating particles
function createParticles() {
    const panel = document.querySelector('.login-background');
    const colors = [
        'rgba(217, 205, 248, 0.9)',
        'rgba(185, 240, 216, 0.85)',
        'rgba(255, 255, 255, 0.8)',
        'rgba(217, 205, 248, 0.7)',
        'rgba(185, 240, 216, 0.6)',
    ];

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 10 + 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.bottom = '-10px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = (Math.random() * 8 + 6) + 's';
        particle.style.animationDelay = (Math.random() * 8) + 's';
        particle.style.boxShadow = `0 0 ${size * 2}px ${particle.style.background}`;

        panel.appendChild(particle);
    }
}

createParticles();

// Flip animations
function switchToRegister() {
    const loginPanel = document.querySelector('.login-background');
    const registerPanel = document.querySelector('.register-background');
    const quotesContainer = document.querySelector('.quotes-container');

    loginPanel.classList.add('flip-out');

    setTimeout(() => {
        loginPanel.style.display = 'none';
        loginPanel.classList.remove('flip-out');
        loginPanel.style.transform = 'none';

        registerPanel.style.display = 'block';
        registerPanel.style.left = '0';
        registerPanel.style.right = 'auto';
        registerPanel.classList.add('flip-in');

        quotesContainer.style.transition = 'left 0.25s linear';
        quotesContainer.style.left = '50%';

        setTimeout(() => {
            registerPanel.classList.remove('flip-in');
            registerPanel.style.transform = 'none';
        }, 260);

    }, 240);
}

function switchToLogin() {
    const loginPanel = document.querySelector('.login-background');
    const registerPanel = document.querySelector('.register-background');
    const quotesContainer = document.querySelector('.quotes-container');

    registerPanel.classList.add('flip-out-back');

    setTimeout(() => {
        registerPanel.style.display = 'none';
        registerPanel.classList.remove('flip-out-back');
        registerPanel.style.transform = 'none';

        loginPanel.style.display = 'block';
        loginPanel.style.right = '0';
        loginPanel.style.left = 'auto';
        loginPanel.classList.add('flip-in-back');

        quotesContainer.style.transition = 'left 0.25s linear';
        quotesContainer.style.left = '0%';

        setTimeout(() => {
            loginPanel.classList.remove('flip-in-back');
            loginPanel.style.transform = 'none';
        }, 260);

    }, 240);
}