const API = 'https://akline-backend-production.up.railway.app';

let userProgress = {};
let currentBook = null;
let currentFileUrl = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let pdfRendering = false;
let progressDebounce;

function isAdminUser() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.isAdmin === true;
}

function getUser() {
    return JSON.parse(localStorage.getItem('user'));
}

// ── Progress ──────────────────────────────────────────
async function loadProgress() {
    const user = getUser();
    if (!user) return;
    try {
        const response = await fetch(`${API}/api/progress/${user.id}`);
        const rows = await response.json();
        rows.forEach(row => { userProgress[row.book_id] = row.progress; });
    } catch (err) { console.error('Failed to load progress:', err); }
}

async function setProgress(bookId, progress) {
    const user = getUser();
    if (!user) return;
    try {
        await fetch(`${API}/api/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, bookId, progress })
        });
        userProgress[bookId] = progress;
    } catch (err) { console.error('Failed to set progress:', err); }
}

function updateReaderProgress(bookId, progress) {
    userProgress[bookId] = progress;
    document.getElementById('readerProgress').textContent = progress + '% read';

    const slider = document.querySelector(`input[data-book-id="${bookId}"]`);
    if (slider) {
        slider.value = progress;
        const card = slider.closest('.book-card');
        if (card) {
            card.querySelector('.progress-bar-fill').style.width = progress + '%';
            card.querySelector('.progress-label').textContent = progress + '% read';
        }
    }

    clearTimeout(progressDebounce);
    progressDebounce = setTimeout(() => setProgress(bookId, progress), 2000);
}

// ── Load Books ────────────────────────────────────────
async function loadBooks() {
    await loadProgress();

    try {
        const response = await fetch(`${API}/api/books`);
        const books = await response.json();

        const container = document.querySelector('.library-container');
        const bookCount = document.querySelector('.book-count');

        container.querySelectorAll('.book-card').forEach(card => card.remove());

        books.forEach((book, index) => {
            const progress = userProgress[book.id] || 0;
            const card = document.createElement('div');
            card.classList.add('book-card');
            card.innerHTML = `
                ${book.cover_url
                    ? `<img src="${book.cover_url}" class="book-cover" />`
                    : `<div class="book-cover cover-${(index % 4) + 1}"></div>`
                }
                <p class="book-title">${book.title}</p>
                <div class="progress-container">
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-label">${progress}% read</span>
                </div>
                <div class="progress-input-row">
                    <input type="range" min="0" max="100" value="${progress}" data-book-id="${book.id}" />
                </div>
                ${isAdminUser() ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteBook(${book.id})">Delete</button>` : ''}
            `;

            card.addEventListener('click', () => openBookModal(book));

            // auto-save slider
            const slider = card.querySelector('input[type="range"]');
            let debounceTimer;
            slider.addEventListener('input', (e) => {
                e.stopPropagation();
                const val = parseInt(slider.value);
                card.querySelector('.progress-bar-fill').style.width = val + '%';
                card.querySelector('.progress-label').textContent = val + '% read';
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => setProgress(book.id, val), 500);
            });
            slider.addEventListener('click', e => e.stopPropagation());

            container.insertBefore(card, bookCount);
        });

        bookCount.textContent = `${books.length} BOOKS`;

    } catch (err) { console.error('Failed to load books:', err); }
}

// ── Add / Delete Book ─────────────────────────────────
async function addBook() {
    const user = getUser();
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const cover_url = document.getElementById('bookCover').value;
    const category = document.getElementById('bookCategory').value;
    const pdfFile = document.getElementById('bookPdfFile').files[0];

    if (!title) { alert('Please enter a book title!'); return; }

    let file_url = '';

    // Step 1 — Upload PDF first if provided
    if (pdfFile) {
        document.getElementById('uploadStatus').textContent = 'Uploading PDF...';

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('userId', user.id);

        const uploadResponse = await fetch(`${API}/api/upload-pdf`, {
            method: 'POST',
            body: formData  // ← no Content-Type header for FormData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
            alert('PDF upload failed: ' + uploadData.error);
            document.getElementById('uploadStatus').textContent = '';
            return;
        }

        file_url = uploadData.url;
        document.getElementById('uploadStatus').textContent = '✅ PDF uploaded!';
    }

    // Step 2 — Save book to database
    const response = await fetch(`${API}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, cover_url, file_url, category, userId: user.id })
    });

    const data = await response.json();

    if (response.ok) {
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookCover').value = '';
        document.getElementById('bookPdfFile').value = '';
        document.getElementById('bookCategory').value = '';
        document.getElementById('uploadStatus').textContent = '';
        loadBooks();
    } else {
        alert(data.error);
    }
}

async function deleteBook(bookId) {
    if (!confirm('Delete this book?')) return;
    const user = getUser();

    const response = await fetch(`${API}/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
    });

    const data = await response.json();
    if (response.ok) loadBooks();
    else alert(data.error);
}

// ── Modal ─────────────────────────────────────────────
function openBookModal(book) {
    currentBook = book;
    document.getElementById('modalCover').src = book.cover_url || '';
    document.getElementById('modalTitle').textContent = book.title;
    document.getElementById('modalAuthor').textContent = book.author ? `by ${book.author}` : 'Author unknown';
    document.getElementById('modalCategory').textContent = book.category || 'Uncategorized';

    const btn = document.getElementById('modalOpenBtn');
    if (book.file_url) {
        btn.disabled = false;
        btn.textContent = 'Open Book';
    } else {
        btn.disabled = true;
        btn.textContent = 'No file available';
    }

    currentFileUrl = book.file_url || null;
    document.getElementById('bookModal').classList.add('open');
}

function closeModal() {
    document.getElementById('bookModal').classList.remove('open');
    currentFileUrl = null;
}

function openBookFile() {
    closeModal();
    if (!currentBook || !currentBook.file_url) return;
    openReader(currentBook);
}

// ── PDF Reader ────────────────────────────────────────
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function openReader(book) {
    currentBook = book;
    document.getElementById('readerTitle').textContent = book.title;
    document.getElementById('readerPanel').style.display = 'flex';

    const saved = userProgress[book.id] || 0;
    document.getElementById('readerProgress').textContent = saved + '% read';

    if (!window.pdfjsLib) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const loadingTask = pdfjsLib.getDocument(book.file_url);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        currentPage = Math.max(1, Math.round((saved / 100) * totalPages));
        renderPage(currentPage);
    } catch (err) {
        console.error('PDF load error:', err);
        alert('Could not load PDF. Make sure the file URL is accessible.');
    }
}

async function renderPage(pageNum) {
    if (pdfRendering) return;
    pdfRendering = true;

    const page = await pdfDoc.getPage(pageNum);
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    pdfRendering = false;

    document.getElementById('pageInfo').textContent = `Page ${pageNum} of ${totalPages}`;

    const progress = Math.round((pageNum / totalPages) * 100);
    updateReaderProgress(currentBook.id, progress);
}

function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
}

function nextPage() {
    if (currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
}

function closeReader() {
    document.getElementById('readerPanel').style.display = 'none';
    pdfDoc = null;
    currentPage = 1;
    totalPages = 1;
}

// ── Init ──────────────────────────────────────────────
if (isAdminUser()) {
    document.getElementById('adminPanel').style.display = 'block';
}
loadBooks();

function toggleProfilePanel() {
    const panel = document.getElementById('profilePanel');
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'flex' : 'none';
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('profilePanel');
    const profileIcon = document.querySelector('.profile-icon');
    if (!panel.contains(e.target) && !profileIcon.contains(e.target)) {
        panel.style.display = 'none';
    }
});

function goTo(page) {
    if (page === 'settings') window.location.href = 'settings.html';
    if (page === 'assessment') window.location.href = 'assessment.html';
    if (page === 'about') window.location.href = 'about.html';
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}