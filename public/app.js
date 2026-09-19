fetch("/api/me", { credentials: "same-origin" })
  .then((response) => (response.ok ? response.json() : null))
  .then((user) => {
          const status = document.getElementById("status");
          if (user) {
                    status.textContent = `Sessão de ${user.email ?? user.displayName}.`;
                    window.location.href = "/entrega1/";
          } else {
                    status.textContent = "Nenhuma sessão neste navegador.";
          }
  });
