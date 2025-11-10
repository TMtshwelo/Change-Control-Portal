(function(){
  const authModal = document.getElementById('authModal');
  const authContent = document.getElementById('authContent');
  const closeAuth = document.getElementById('closeAuth');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const heroLogin = document.getElementById('heroLogin');
  const heroRegister = document.getElementById('heroRegister');

  function openModal(html){
    authContent.innerHTML = html;
    authModal.classList.remove('hidden');
    // attach submit handlers
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if(loginForm){
      loginForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const u = document.getElementById('loginUser').value.trim();
        if(!u) return alert('Please enter username');
        sessionStorage.setItem('demoUser', u);
        authContent.innerHTML = '<div style="text-align:center;padding:20px"><strong>Signed in as '+escapeHtml(u)+'</strong><div style="margin-top:10px;color:var(--muted)">You can now enter the dashboard.</div><div style="margin-top:12px"><a href="index.html" class="btn btn-ghost">Open dashboard</a></div></div>';
      });
    }
    if(registerForm){
      registerForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const u = document.getElementById('regUser').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        if(!u || !email) return alert('Please enter username and email');
        // store demo user in sessionStorage (client-side only)
        const demo = {user:u,email:email,created: new Date().toISOString()};
        sessionStorage.setItem('demoUser', u);
        sessionStorage.setItem('demoProfile', JSON.stringify(demo));
        authContent.innerHTML = '<div style="text-align:center;padding:20px"><strong>Account created for '+escapeHtml(u)+'</strong><div style="margin-top:8px;color:var(--muted)">This is a client-side demo account stored in session only.</div><div style="margin-top:12px"><a href="index.html" class="btn btn-ghost">Open dashboard</a></div></div>';
      });
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({"&":"&amp;","<":"&lt;","\>":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

  function showLogin(){
    const html = `
      <h3 style="margin-top:0">Sign in</h3>
      <form id="loginForm">
        <div class="form-row"><input id="loginUser" placeholder="Username or email" /></div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" type="button" id="cancelLogin">Cancel</button><button class="btn" type="submit">Sign in</button></div>
      </form>
    `;
    openModal(html);
    document.getElementById('cancelLogin').addEventListener('click', ()=>authModal.classList.add('hidden'));
  }
  function showRegister(){
    const html = `
      <h3 style="margin-top:0">Create demo account</h3>
      <form id="registerForm">
        <div class="form-row"><input id="regUser" placeholder="Choose a username" /></div>
        <div style="margin-top:8px" class="form-row"><input id="regEmail" placeholder="Email address" /></div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" type="button" id="cancelReg">Cancel</button><button class="btn" type="submit">Create account</button></div>
      </form>
    `;
    openModal(html);
    document.getElementById('cancelReg').addEventListener('click', ()=>authModal.classList.add('hidden'));
  }

  // wire buttons
  if(loginBtn) loginBtn.addEventListener('click', showLogin);
  if(registerBtn) registerBtn.addEventListener('click', showRegister);
  if(heroLogin) heroLogin.addEventListener('click', showLogin);
  if(heroRegister) heroRegister.addEventListener('click', showRegister);
  if(closeAuth) closeAuth.addEventListener('click', ()=>authModal.classList.add('hidden'));

  // keyboard escape
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') authModal.classList.add('hidden'); });

})();
