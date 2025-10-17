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
    setupFocusTrap(loginModal);
    const firstField = loginModal.querySelector('#loginEmail');
    firstField && firstField.focus();
  }
  function closeModal(){
    if(!loginModal) return; 
    loginModal.style.display = 'none';
    loginModal.setAttribute('aria-hidden','true');
    removeFocusTrap(loginModal);
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
      if(inFlight.register) return; // prevent double submit
      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value;
      const password2 = registerForm.password2.value;
      const emailValid = emailRegex.test(email);
      const pwdValid = validatePassword(password);
      if(!emailValid){ showFieldError('regEmail','Email inválido'); return; }
      if(!pwdValid){ showFieldError('regPassword','Contraseña débil (mín 6, 1 letra, 1 número)'); return; }
      if(password !== password2){
        showFieldError('regPassword2','Las contraseñas no coinciden');
        return;
      }
      clearFieldErrors(['regEmail','regPassword','regPassword2']);
      inFlight.register = true;
      toggleLoading(registerSubmit,true);
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
          // Auto abrir login para continuar flujo
          setTimeout(()=>{ closeRegistroOverlay(); openModal(); }, 800);
        } else {
          showMessage(registerMessage, data.message || 'Error al registrar', 'error');
        }
      } catch(err){
        showMessage(registerMessage, 'Error de conexión', 'error');
      }
      inFlight.register = false;
      toggleLoading(registerSubmit,false);
    });
  }

  // Login submit
  if(loginForm){
    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(inFlight.login) return;
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if(!emailRegex.test(email)){ showFieldError('loginEmail','Email inválido'); return; }
      clearFieldErrors(['loginEmail']);
      inFlight.login = true;
      toggleLoading(loginSubmit,true);
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
      inFlight.login = false;
      toggleLoading(loginSubmit,false);
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

// Validation & accessibility helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validatePassword(p){
  if(!p || p.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(p);
  const hasNumber = /\d/.test(p);
  return hasLetter && hasNumber;
}
function showFieldError(id,msg){
  const input = document.getElementById(id);
  if(!input) return;
  let err = input.nextElementSibling;
  if(!err || !err.classList.contains('field-error')){
    err = document.createElement('div');
    err.className='field-error';
    input.after(err);
  }
  err.textContent = msg;
  input.setAttribute('aria-invalid','true');
  input.classList.add('invalid');
}
function clearFieldErrors(ids){
  ids.forEach(id=>{
    const input = document.getElementById(id);
    if(!input) return;
    input.removeAttribute('aria-invalid');
    input.classList.remove('invalid');
    const err = input.nextElementSibling;
    if(err && err.classList.contains('field-error')) err.remove();
  });
}
const inFlight = { register:false, login:false };
function toggleLoading(btn,loading){
  if(!btn) return;
  if(loading){
    btn.disabled = true; btn.dataset.originalText = btn.textContent; btn.textContent='Procesando...';
  } else {
    btn.disabled = false; if(btn.dataset.originalText) btn.textContent=btn.dataset.originalText;
  }
}

// Focus trap implementation
const focusTrapState = new WeakMap();
function setupFocusTrap(container){
  const selectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  function handler(e){
    if(e.key !== 'Tab') return;
    const focusables = Array.from(container.querySelectorAll(selectors)).filter(el=>el.offsetParent!==null);
    if(focusables.length===0) return;
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    if(e.shiftKey){
      if(document.activeElement === first){ e.preventDefault(); last.focus(); }
    } else {
      if(document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', handler);
  focusTrapState.set(container, handler);
}
function removeFocusTrap(container){
  const handler = focusTrapState.get(container);
  if(handler){ document.removeEventListener('keydown', handler); focusTrapState.delete(container); }
}
