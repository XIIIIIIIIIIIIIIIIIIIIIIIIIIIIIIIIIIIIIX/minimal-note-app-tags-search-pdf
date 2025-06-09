// État de l'application
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let searchActive = false;

// Éléments DOM
const noteForm = document.getElementById('note-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const tagsInput = document.getElementById('tags');
const searchInput = document.getElementById('search');
const notesContainer = document.getElementById('notes-container');

// Passage de l'objet jsPDF dans une variable locale
const jsPDF = window.jspdf.jsPDF;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    renderNotes();
    
    // Écouteurs d'évènements
    noteForm.addEventListener('submit', addNote);
    searchInput.addEventListener('input', filterNotes);
});

// Ajouter une note
function addNote(e) {
    e.preventDefault();
    
    const note = {
        id: Date.now(),
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        tags: tagsInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0),
        timestamp: new Date().toISOString()
    };
    
    notes.unshift(note);
    saveNotes();
    renderNotes();
    resetForm();
}

// Filtrer les notes
function filterNotes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    searchActive = searchTerm !== '';
    renderNotes();
}

// Affichage des notes
function renderNotes() {
    // Convertir le tableau de notes avec un indicateur de correspondance
    let notesWithMatches = notes.map(note => {
        const titleMatch = searchActive && note.title.toLowerCase().includes(searchInput.value.toLowerCase());
        const contentMatch = searchActive && note.content.toLowerCase().includes(searchInput.value.toLowerCase());
        const tagMatch = searchActive && note.tags.some(tag => 
            tag.toLowerCase().includes(searchInput.value.toLowerCase())
        );
        
        return {
            ...note,
            match: searchActive ? (titleMatch || contentMatch || tagMatch) : true
        };
    });
    
    // Filtrer pour obtenir uniquement les notes correspondantes
    let filteredNotes = searchActive 
        ? notesWithMatches.filter(note => note.match) 
        : notes;
    
    // Trier par ordre chronologique inverse
    filteredNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Rendu des notes
    notesContainer.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `<p class="no-notes">${searchActive ? 'Aucune note correspondante' : 'Aucune note'}</p>`;
        return;
    }
    
    filteredNotes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note';
        noteEl.dataset.id = note.id;
        
        const formattedDate = new Date(note.timestamp).toLocaleString('fr-FR');
        
        noteEl.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${sanitizeHTML(note.title)}</h3>
                <button class="export-btn" data-id="${note.id}">PDF</button>
            </div>
            <div class="note-content">
                <p>${sanitizeHTML(note.content).replace(/\n/g, '<br>')}</p>
            </div>
            <div class="note-footer">
                <div class="tags-container">
                    ${note.tags.map(tag => `<span class="tag">${sanitizeHTML(tag)}</span>`).join('')}
                </div>
                <span class="note-date" style="color: var(--light-text); font-size: 12px;">${formattedDate}</span>
            </div>
        `;
        
        notesContainer.appendChild(noteEl);
        
        // Ajouter l'écouteur après le rendu
        noteEl.querySelector('.export-btn').addEventListener('click', () => exportToPDF(note));
    });
}

// Réinitialiser le formulaire
function resetForm() {
    noteForm.reset();
}

// Sauvegarder les notes
function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Échappement des balises HTML pour éviter les attaques XSS
function sanitizeHTML(text) {
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

// Export PDF
function exportToPDF(note) {
    const doc = new jsPDF();
    
    // Configuration
    const leftMargin = 15;
    let currentY = 20;
    
    // Titre avec style
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(note.title, leftMargin, currentY);
    currentY += 10;
    
    // Date de création
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    const date = new Date(note.timestamp).toLocaleString('fr-FR');
    doc.text(`Créée le : ${date}`, leftMargin, currentY);
    currentY += 15;
    
    // Contenu
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0);
    const contentLines = doc.splitTextToSize(note.content, 180);
    contentLines.forEach(line => {
        if (currentY > 280) {
            doc.addPage();
            currentY = 20;
        }
        doc.text(line, leftMargin, currentY);
        currentY += 7;
    });
    
    currentY += 10;
    
    // Tags
    if (note.tags.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Tags: ${note.tags.join(', ')}`, leftMargin, currentY);
    }
    
    // Séparateur
    doc.setLineWidth(0.2);
    doc.line(leftMargin, currentY + 5, 200, currentY + 5);
    
    doc.save(`note-${note.title.substring(0, 20)}.pdf`);
}