const form =
    document.getElementById('emailForm');

const message =
    document.getElementById('message');

const emailInput =
    document.getElementById('email');

const phoneInput =
    document.getElementById('phone');

const nameInput =
    document.getElementById('name');

const submitButton =
    form.querySelector('button[type="submit"]');

let permissionsGranted = false;

function setFormEnabled(enabled) {

    emailInput.disabled = !enabled;
    phoneInput.disabled = !enabled;
    nameInput.disabled = !enabled;
    submitButton.disabled = !enabled;

}

function requestLocationPermission() {

    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject(new Error('Location is not supported by this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => resolve(),
            error => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

    });

}

async function requestRequiredPermissions() {

    setFormEnabled(false);
    message.textContent =
        'Please allow camera and microphone access.';

    let mediaStream;

    try {

        mediaStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        mediaStream
            .getTracks()
            .forEach(track => track.stop());

        message.textContent =
            'Please allow location access.';

        await requestLocationPermission();

        permissionsGranted = true;
        setFormEnabled(true);
        message.textContent =
            'Permissions granted. Enter your name and email.';

    } catch (error) {

        console.error(error);

        if (mediaStream) {
            mediaStream
                .getTracks()
                .forEach(track => track.stop());
        }

        permissionsGranted = false;
        setFormEnabled(false);
        message.textContent =
            'Camera, microphone, and location permissions are required. Please allow them and reload the page.';

    }

}

setFormEnabled(false);
requestRequiredPermissions();


form.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        if (!permissionsGranted) {
            message.textContent =
                'Grant camera, microphone, and location permissions first.';
            return;
        }


        const email =
            emailInput.value;

        const phone =
            phoneInput.value;

        const name =
            nameInput.value;


        message.textContent =
            'Saving email...';


        try {

            const response =
                await fetch('/api/save-email', {

                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        email: email,
                        phone: phone,
                        name: name
                    })

                });


            const data =
                await response.json();


            if (!response.ok) {

                message.textContent =
                    data.message;

                return;

            }


            // Keep the email available
            // for the next page too

            sessionStorage.setItem(
                'userEmail',
                email
            );


            // Move to the camera step

            window.location.href = '/camera.html';


        } catch (error) {

            console.error(error);

            message.textContent =
                'Could not connect to the server.';

        }

    }
);