const API = 'https://akline-backend-production.up.railway.app';

async function loadHomeBooks() {
    try {
        const response = await fetch(`${API}/api/books`);
        const books = await response.json();

        const fictionEl = document.getElementById('fiction-books');
        const nonfictionEl = document.getElementById('nonfiction-books');
        const literatureEl = document.getElementById('literature-books');
        const allBooksEl = document.getElementById('bestsellers');

        fictionEl.innerHTML = '';
        nonfictionEl.innerHTML = '';
        literatureEl.innerHTML = '';
        allBooksEl.innerHTML = '';

        books.forEach(book => {
            const cat = (book.category || '').toLowerCase().trim();

            function makeCover(enlarged = false) {
                if (book.cover_url) {
                    const img = document.createElement('img');
                    img.src = book.cover_url;
                    img.alt = book.title;
                    img.title = book.title;
                    img.className = enlarged ? 'cat-cover-large' : '';
                    return img;
                } else {
                    const div = document.createElement('div');
                    div.title = book.title;
                    div.className = enlarged ? 'cat-placeholder-large' : 'cat-placeholder';
                    div.textContent = book.title;
                    return div;
                }
            }

            if (cat === 'fiction') fictionEl.appendChild(makeCover());
            else if (cat === 'non-fiction') nonfictionEl.appendChild(makeCover());
            else if (cat === 'literature') literatureEl.appendChild(makeCover());

            // all books row
            const item = document.createElement('div');
            item.className = 'book-item';
            item.style.cursor = 'pointer';
            item.appendChild(makeCover());
            item.addEventListener('click', () => {
                openBookModal(book);  // ← open modal instead
            });
            allBooksEl.appendChild(item);
        });

        // set up expand/collapse for each category box
        document.querySelectorAll('.category-box').forEach(box => {
            const title = box.querySelector('.cat-title');
            const booksEl = box.querySelector('.cat-books');

            box.addEventListener('click', (e) => {
                const isExpanded = box.classList.contains('expanded');

                // collapse all first
                document.querySelectorAll('.category-box').forEach(b => {
                    b.classList.remove('expanded');
                    b.querySelector('.cat-books').querySelectorAll('img, div').forEach(el => {
                        el.classList.remove('cat-cover-large', 'cat-placeholder-large');
                    });
                });

                // if it wasn't expanded, expand it
                if (!isExpanded) {
                    box.classList.add('expanded');
                    booksEl.querySelectorAll('img, div').forEach(el => {
                        el.classList.add('cat-cover-large');

                        const book = books.find(b => b.title === el.title);
                        if (book) {
                            el.style.cursor = 'pointer';
                            el.onclick = (e) => {
                                e.stopPropagation();
                                openBookModal(book);
                            };
                        }
                    });
                }
            });

            // clicking title collapses
            title.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = box.classList.contains('expanded');

    // collapse all first
    document.querySelectorAll('.category-box').forEach(b => {
        b.classList.remove('expanded');
        b.querySelector('.cat-books').querySelectorAll('img, div').forEach(el => {
            el.classList.remove('cat-cover-large', 'cat-placeholder-large');
        });
    });

    // if it wasn't expanded, expand it
    if (!isExpanded) {
        box.classList.add('expanded');
        booksEl.querySelectorAll('img, div').forEach(el => {
            el.classList.add('cat-cover-large');
            const book = books.find(b => b.title === el.title);
            if (book) {
                el.style.cursor = 'pointer';
                el.onclick = (ev) => {
                    ev.stopPropagation();
                    openBookModal(book);
                };
            }
        });
    }
});
        });

    } catch (err) {
        console.error('Failed to load home books:', err);
    }

    // expand/collapse All Books section
    const allBooksSection = document.getElementById('bestsellers').closest('.section-card');
    const allBooksLabel = allBooksSection.querySelector('.section-label');

    allBooksSection.addEventListener('click', (e) => {
        // only trigger if clicking the label or empty space, not a book item
        if (e.target.closest('.book-item')) return;

        const isExpanded = allBooksSection.classList.contains('expanded');
        if (!isExpanded) {
            allBooksSection.classList.add('expanded');
        } else {
            allBooksSection.classList.remove('expanded');
        }
    });
}

loadHomeBooks();

let currentFileUrl = null;

let currentBook = null;

function openBookModal(book) {
    currentBook = book;  // ← add this line

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

// PDF reader variables
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let pdfRendering = false;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ← Update this function
function openBookFile() {
    closeModal();
    if (!currentBook || !currentBook.file_url) {
        alert('No file available for this book.');
        return;
    }
    openReader(currentBook);
}

async function openReader(book) {
    currentBook = book;
    document.getElementById('readerTitle').textContent = book.title;
    document.getElementById('readerPanel').style.display = 'flex';
    document.getElementById('readerProgress').textContent = '0% read';

    if (!window.pdfjsLib) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const loadingTask = pdfjsLib.getDocument(book.file_url);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
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
    document.getElementById('readerProgress').textContent = progress + '% read';
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

// Toggle profile panel
function toggleProfilePanel() {
    const panel = document.getElementById('profilePanel');
    const isVisible = panel.style.display === 'flex';

    if (isVisible) {
        closeProfilePanel();
    } else {
        // create backdrop
        const backdrop = document.createElement('div');
        backdrop.classList.add('profile-backdrop');
        backdrop.id = 'profileBackdrop';
        backdrop.onclick = closeProfilePanel;
        document.body.appendChild(backdrop);

        panel.style.display = 'flex';
    }
}

function closeProfilePanel() {
    const panel = document.getElementById('profilePanel');
    const backdrop = document.getElementById('profileBackdrop');

    panel.style.display = 'none';
    if (backdrop) backdrop.remove();
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('profilePanel');
    const profileIcon = document.querySelector('.profile-icon');
    if (panel.style.display === 'flex' &&
        !panel.contains(e.target) &&
        !profileIcon.contains(e.target)) {
        closeProfilePanel();
    }
});

// Navigation
function goTo(page) {
    if (page === 'settings') window.location.href = 'settings.html';
    if (page === 'assessment') window.location.href = 'assessment.html';
    if (page === 'about') window.location.href = 'about.html';
}

// Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}