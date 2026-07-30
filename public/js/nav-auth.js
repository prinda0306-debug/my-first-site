(function () {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;

  fetch('/api/auth/me')
    .then(function (res) {
      if (!res.ok) throw new Error('not logged in');
      return res.json();
    })
    .then(function (data) {
      const user = data.user;
      const homeLink = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
      const homeLabel = user.role === 'admin' ? '管理後台' : '會員中心';
      slot.innerHTML =
        '<a href="' + homeLink + '">' + homeLabel + '</a>' +
        '<a href="#" id="nav-logout">登出</a>';
      document.getElementById('nav-logout').addEventListener('click', function (e) {
        e.preventDefault();
        fetch('/api/auth/logout', { method: 'POST' }).then(function () {
          window.location.href = 'index.html';
        });
      });
    })
    .catch(function () {
      slot.innerHTML =
        '<a href="login.html">登入</a>' +
        '<a href="register.html" class="btn btn-primary">會員註冊</a>';
    });
})();
