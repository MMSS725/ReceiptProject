const locationButton = document.getElementById('locationButton');
const status = document.getElementById('status');

locationButton.onclick = () => {

    status.textContent = 'Requesting location permission...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            status.textContent = 'Saving location...';

            try {

                const response = await fetch('/api/save-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        latitude,
                        longitude,
                        accuracy
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message);
                }

                status.textContent = '✅ Location saved successfully.';

                setTimeout(() => {
                    window.location.href = '/receipt.html';
                }, 1000);

            } catch (error) {

                console.error(error);
                status.textContent = '❌ Unable to save location.';
            }
        },

        (error) => {

            console.error(error);

            status.textContent =
                '❌ Location permission was denied or unavailable.';
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
};