// Récupère la fenêtre modale QR et ses commandes ; le comportement nécessite l'API native showModal.
const dialog = document.querySelector('#qr-dialog');
const openButton = document.querySelector('[data-qr-open]');
const closeButtons = document.querySelectorAll('[data-qr-close]');

if (dialog && typeof dialog.showModal === 'function' && openButton) {
  // Ouvre la modale et permet de la fermer par ses boutons ou en cliquant sur l'arrière-plan.
  openButton.addEventListener('click', () => {
    dialog.showModal();
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      dialog.close();
    });
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // Rend le focus au déclencheur lorsque la modale se ferme.
  dialog.addEventListener('close', () => {
    openButton.focus();
  });
}