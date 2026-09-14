const email =
    sessionStorage.getItem('userEmail');

const emailDisplay =
    document.getElementById('emailDisplay');

const confirmButton =
    document.getElementById('confirmReceipt');

const confirmationMessage =
    document.getElementById('confirmationMessage');

const submissionId =
    sessionStorage.getItem('submissionId');

emailDisplay.textContent =
    email ? `Recipient: ${email}` : '';

confirmButton.addEventListener('click', async () => {

    confirmButton.disabled = true;
    confirmationMessage.textContent =
        'Sending confirmation...';

    try {

        const response =
            await fetch('/api/confirm-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    submissionId: submissionId
                })
            });

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        confirmationMessage.textContent =
            result.userEmailSent === false
                ? result.message
                : 'Thank you for confirming that you received your receipt. Both emails were accepted for delivery.';

    } catch (error) {

        console.error(error);
        confirmButton.disabled = false;
        confirmationMessage.textContent =
            `${error.message ||
                'The confirmation could not be sent. Please try again.'} ` +
            'Check the sender configuration and retry.';

    }

});
