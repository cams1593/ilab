const dialog = document.querySelector('#qr-dialog');
const openButton = document.querySelector('[data-qr-open]');
const closeButtons = document.querySelectorAll('[data-qr-close]');

if (dialog && typeof dialog.showModal === 'function' && openButton) {
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

  dialog.addEventListener('close', () => {
    openButton.focus();
  });
}