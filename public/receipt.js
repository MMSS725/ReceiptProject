const email =
    sessionStorage.getItem('userEmail');

const emailDisplay =
    document.getElementById('emailDisplay');

const confirmButton =
    document.getElementById('confirmReceipt');

const confirmationMessage =
    document.getElementById('confirmationMessage');

const downloadReceipt =
    document.getElementById('downloadReceipt');

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
            'Thank you for confirming that you received your receipt. The data email was sent.';

        downloadReceipt.href =
            `/api/download-receipt/${encodeURIComponent(submissionId)}`;
        downloadReceipt.hidden = false;

    } catch (error) {

        console.error(error);
        confirmButton.disabled = false;
        confirmationMessage.textContent =
            error.message ||
            'The confirmation could not be sent. Please try again.';

    }

});
