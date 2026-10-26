// Forget password page logic shared by forget.html.
function checkcaptcha() {
    var response = grecaptcha.getResponse();
    if (response.length == 0) {
        document.getElementById("verifyMsg").style.display = "block";
        return false;
    }
    return true;
}

function showForm(formId) {
    document.querySelectorAll('.auth-box').forEach(function(form) {
        form.classList.remove('active');
    });
    var target = document.getElementById(formId);
    if (target) target.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    var toggleBtn = document.getElementById('toggleNewPass');
    var passInput = document.getElementById('newPass');

    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var isPassword = passInput.type === 'password';
            passInput.type = isPassword ? 'text' : 'password';

            // Toggle SVG icons
            var eyeOpen = toggleBtn.querySelector('.eye-open');
            var eyeClosed = toggleBtn.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.style.display = isPassword ? 'none' : 'block';
                eyeClosed.style.display = isPassword ? 'block' : 'none';
            }

            // Fallback for image
            var toggleImg = toggleBtn.querySelector('img') || document.getElementById('toggleNewPassImg');
            if (toggleImg) {
                toggleImg.src = isPassword ? 'Eye open.png' : 'Hide eye.png';
            }

            var actionText = isPassword ? 'Hide password' : 'Show password';
            toggleBtn.setAttribute('aria-label', actionText);
            toggleBtn.setAttribute('title', actionText);
            passInput.focus();
        });
    }
});
