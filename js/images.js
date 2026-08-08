// ═══════════════════════════════════════
// IMAGE ATTACHMENTS
// ═══════════════════════════════════════
window.handleImageUpload = function(event) {
    const files = Array.from(event.target.files);
    if (currentImages.length + files.length > 3) {
        showToast('Maximum 3 images per entry', 'error');
        return;
    }
    files.forEach(file => {
        if (file.size > 3 * 1024 * 1024) {
            showToast('Image must be under 3MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                    else { w = Math.round(w * MAX / h); h = MAX; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                currentImages.push(compressed);
                renderImagePreviews();
                autoSaveDraft();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    event.target.value = '';
};

window.removeImage = function(index) {
    currentImages.splice(index, 1);
    renderImagePreviews();
    autoSaveDraft();
};

function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewGrid');
    grid.innerHTML = currentImages.map((src, i) =>
        '<div class="image-preview-item"><img src="' + src + '" alt="Preview"><button class="image-preview-remove" onclick="removeImage(' + i + ')">&times;</button></div>'
    ).join('');
}

// ═══════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════
window.openLightbox = function(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('show');
};

window.closeLightbox = function() {
    document.getElementById('lightbox').classList.remove('show');
};
