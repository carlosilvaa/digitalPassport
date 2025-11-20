// static/accounts/js/accounts.js
(function(){
  function onlyDigits(e) {
    const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];
    if (allowed.includes(e.key)) return;
    if (!/\d/.test(e.key)) e.preventDefault();
  }

  function enforceMaxLength(el) {
    const max = parseInt(el.getAttribute("maxlength") || "0", 10);
    if (max && el.value.length > max) el.value = el.value.slice(0, max);
  }

  function toggleExclusive(a, b) {
    if (a.value.length > 0) {
      b.setAttribute("disabled", "disabled");
      b.classList.remove("is-invalid");
      const fb = b.parentElement.querySelector(".invalid-feedback");
      if (fb) fb.textContent = "";
    } else {
      b.removeAttribute("disabled");
    }
  }

  document.addEventListener("DOMContentLoaded", function(){
    const isLogin = !!document.querySelector("#login-form");
    const isRegister = !!document.querySelector("#register-form");

    // limpar is-invalid ao digitar
    document.body.addEventListener("input", function(e){
      const el = e.target;
      if (el.classList && el.classList.contains("form-control")) {
        el.classList.remove("is-invalid");
      }
    });

    if (isRegister) {
      const form = document.querySelector("#register-form");
      const nif  = form.querySelector('input[name="nif"]');
      const niss = form.querySelector('input[name="niss"]');

      // só dígitos + length
      [nif, niss].forEach(el=>{
        if (!el) return;
        el.addEventListener("keydown", onlyDigits);
        el.addEventListener("input", function(){
          this.value = this.value.replace(/\D+/g, "");
          enforceMaxLength(this);
        });
      });

      // exclusividade
      nif && nif.addEventListener("input", ()=> toggleExclusive(nif, niss));
      niss && niss.addEventListener("input", ()=> toggleExclusive(niss, nif));
      // inicial
      if (nif && niss) { toggleExclusive(nif, niss); toggleExclusive(niss, nif); }

      // validação client-side no submit
      form.addEventListener("submit", function(e){
        let invalid = false;

        function err(name, msg){
          const el = form.querySelector(`[name="${name}"]`);
          if (!el) return;
          el.classList.add("is-invalid");
          let fb = el.parentElement.querySelector(".invalid-feedback");
          if (!fb){ fb = document.createElement("div"); fb.className = "invalid-feedback"; el.parentElement.appendChild(fb); }
          fb.textContent = msg || "Campo obrigatório.";
          invalid = true;
        }

        const full_name = form.full_name.value.trim();
        const email     = form.email.value.trim();
        const password  = form.password.value.trim();
        const nifVal    = (nif && nif.value.trim()) || "";
        const nissVal   = (niss && niss.value.trim()) || "";

        if (!full_name) err("full_name","Informe o nome completo.");
        if (!email) err("email","Informe o e-mail.");
        if (!password) err("password","Informe a palavra-passe.");

        if (!nifVal && !nissVal){
          err("nif","Informe NIF (utilizador) ou NISS (empresa).");
          err("niss","Informe NIF (utilizador) ou NISS (empresa).");
        }
        if (nifVal && nissVal){
          err("nif","Use apenas um: NIF ou NISS.");
          err("niss","Use apenas um: NIF ou NISS.");
        }

        // Formatos: NIF 9 dígitos, NISS 11 dígitos
        if (nifVal && !/^\d{9}$/.test(nifVal)) err("nif","NIF deve conter exatamente 9 dígitos.");
        if (nissVal && !/^\d{11}$/.test(nissVal)) err("niss","NISS deve conter exatamente 11 dígitos.");

        if (invalid) e.preventDefault();
      });
    }

    if (isLogin) {
      const form = document.querySelector("#login-form");
      form.addEventListener("submit", function(e){
        let invalid = false;
        ["email","password"].forEach(name=>{
          const el = form.querySelector(`[name="${name}"]`);
          if (!el.value.trim()){
            el.classList.add("is-invalid");
            let fb = el.parentElement.querySelector(".invalid-feedback");
            if (!fb){ fb = document.createElement("div"); fb.className = "invalid-feedback"; el.parentElement.appendChild(fb); }
            fb.textContent = name === "email" ? "Informe o e-mail." : "Informe a palavra-passe.";
            invalid = true;
          }
        });
        if (invalid) e.preventDefault();
      });
    }
  });
})();
