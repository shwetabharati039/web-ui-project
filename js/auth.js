// Auth page logic shared by index.html (login).
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('loginForm');
    var toggleBtn = document.getElementById('togglePass');
    var passInput = document.getElementById('loginPass');

    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var isPassword = passInput.type === 'password';
            passInput.type = isPassword ? 'text' : 'password';

            // Toggle SVG icons if present
            var eyeOpen = toggleBtn.querySelector('.eye-open');
            var eyeClosed = toggleBtn.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.style.display = isPassword ? 'none' : 'block';
                eyeClosed.style.display = isPassword ? 'block' : 'none';
            }

            // Toggle image if present (fallback)
            var toggleImg = toggleBtn.querySelector('img') || document.getElementById('togglePassImg');
            if (toggleImg) {
                toggleImg.src = isPassword ? 'Eye open.png' : 'Hide eye.png';
            }

            var actionText = isPassword ? 'Hide password' : 'Show password';
            toggleBtn.setAttribute('aria-label', actionText);
            toggleBtn.setAttribute('title', actionText);
            passInput.focus();
        });
    }

    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var user = document.getElementById('loginUser').value.trim();
        var pass = document.getElementById('loginPass').value;
        if (user === 'shwetabharati' && pass === 'shweta') {
            window.location.href = 'home.htm';
        } else {
            var err = document.getElementById('loginError');
            if (err) err.style.display = 'block';
        }
    });
});
