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
