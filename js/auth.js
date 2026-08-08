// Auth page logic shared by index.html (login).
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var user = document.getElementById('loginUser').value.trim();
        var pass = document.getElementById('loginPass').value;
        if (user === 'shwetabharati' && pass === 'shweta') {
            window.location.href = 'home.htm';
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    });
});
