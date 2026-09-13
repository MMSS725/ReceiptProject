const email =
    sessionStorage.getItem('userEmail');

const emailDisplay =
    document.getElementById('emailDisplay');

const confirmButton =
    document.getElementById('confirmReceipt');

const confirmationMessage =
    document.getElementById('confirmationMessage');

emailDisplay.textContent =
    email ? `Recipient: ${email}` : '';

confirmButton.addEventListener('click', () => {

    confirmButton.disabled = true;
    confirmationMessage.textContent =
        'Thank you for confirming that you received your receipt.';

});
