// Basic client-side auth and modal handling
(function(){
  // Overlay elements for registro
  const openRegisterBtn = document.getElementById('openRegisterOverlay');
  const registroOverlay = document.getElementById('registroOverlay');
  const closeRegisterBtn = document.getElementById('closeRegisterOverlay');

  function openRegistroOverlay(){
    if(!registroOverlay) return;
    registroOverlay.style.display = 'flex';
    registroOverlay.setAttribute('aria-hidden','false');
    document.body.classList.add('overlay-open');
    const firstInput = document.getElementById('regName');
    setTimeout(()=> firstInput && firstInput.focus(), 50);
    openRegisterBtn && openRegisterBtn.setAttribute('aria-expanded','true');
  }
  function closeRegistroOverlay(){
    if(!registroOverlay) return;
    registroOverlay.style.display = 'none';
    registroOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('overlay-open');
    openRegisterBtn && openRegisterBtn.setAttribute('aria-expanded','false');
  }
  if(openRegisterBtn){
    openRegisterBtn.addEventListener('click', function(e){ e.preventDefault(); openRegistroOverlay(); });
  }
  if(closeRegisterBtn){
    closeRegisterBtn.addEventListener('click', function(){ closeRegistroOverlay(); });
  }
  // Close on ESC
  window.addEventListener('keydown', function(e){ if(e.key==='Escape' && registroOverlay && registroOverlay.style.display==='flex'){ closeRegistroOverlay(); }});

  // Optional: close when clicking outside content
  if(registroOverlay){
    registroOverlay.addEventListener('click', function(e){
      if(e.target === registroOverlay){ closeRegistroOverlay(); }
    });
  }

  const loginModal = document.getElementById('loginModal');
  const openLoginBtn = document.getElementById('openLogin');
  const closeLoginBtn = document.getElementById('closeLogin');
  const goToRegister = document.getElementById('goToRegister');
  const openLoginFromRegister = document.getElementById('openLoginFromRegister');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const registerMessage = document.getElementById('registerMessage');
  const loginMessage = document.getElementById('loginMessage');

  function openModal(){
    if(!loginModal) return; 
    loginModal.style.display = 'flex';
    loginModal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    if(!loginModal) return; 
    loginModal.style.display = 'none';
    loginModal.setAttribute('aria-hidden','true');
  }
  if(openLoginBtn){
    openLoginBtn.addEventListener('click', function(e){ e.preventDefault(); openModal(); });
  }
  if(closeLoginBtn){
    closeLoginBtn.addEventListener('click', function(){ closeModal(); });
  }
  window.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeModal(); }});
  if(goToRegister){
    goToRegister.addEventListener('click', function(){ closeModal(); document.getElementById('regName')?.focus(); });
  }
  if(openLoginFromRegister){
    openLoginFromRegister.addEventListener('click', function(e){ e.preventDefault(); openModal(); });
  }

  // Helper to show messages
  function showMessage(el, text, type){
    if(!el) return; 
    el.textContent = text; 
    el.className = 'form-message ' + (type||'');
  }

  // Registration submit
  if(registerForm){
    registerForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const password2 = registerForm.password2.value;
      if(password !== password2){
        showMessage(registerMessage, 'Las contraseñas no coinciden', 'error');
        return;
      }
      try {
        const res = await fetch('http://localhost:4000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if(res.ok){
          showMessage(registerMessage, 'Registro exitoso. Ahora inicia sesión.', 'success');
          registerForm.reset();
        } else {
          showMessage(registerMessage, data.message || 'Error al registrar', 'error');
        }
      } catch(err){
        showMessage(registerMessage, 'Error de conexión', 'error');
      }
    });
  }

  // Login submit
  if(loginForm){
    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      try {
        const res = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(res.ok && data.token){
          localStorage.setItem('authToken', data.token);
          showMessage(loginMessage, 'Login exitoso', 'success');
          setTimeout(()=>{ closeModal(); }, 800);
          // Example call to AI endpoints after login
          fetchAIExamples();
        } else {
          showMessage(loginMessage, data.message || 'Credenciales inválidas', 'error');
        }
      } catch(err){
        showMessage(loginMessage, 'Error de conexión', 'error');
      }
    });
  }

  async function fetchAIExamples(){
    const token = localStorage.getItem('authToken');
    if(!token) return;
    try {
      const headers = { 'Authorization': 'Bearer ' + token };
      const [coursesRes, bibleRes] = await Promise.all([
        fetch('http://localhost:4000/api/ai/courses', { headers }),
        fetch('http://localhost:4000/api/ai/bible', { headers })
      ]);
      const coursesData = await coursesRes.json();
      const bibleData = await bibleRes.json();
      console.log('AI Cursos:', coursesData);
      console.log('AI Biblia:', bibleData);
    } catch(err){
      console.warn('Error llamando a endpoints IA', err);
    }
  }
})();
