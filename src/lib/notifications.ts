let GCM = require('node-gcm');

const sender = new GCM.Sender(process.env.SERVER_KEY);

function Notification(notificationTitle, notificationBody,deviceToken) {

    const message = new GCM.Message({
        // collapseKey: 'demo',
        priority: 'high',
        contentAvailable: true,
        delayWhileIdle: true,
        timeToLive: 3,
        restrictedPackageName: "insight.campus.com",
        dryRun: true,
        data: {
            key1: 'message1',
            key2: 'message2'
        },
        notification: {
            title: notificationTitle,
            icon: "ic_launcher",
            body: notificationBody
        }
    });

    const registrationTokens = [];

    registrationTokens.push(deviceToken);

    this.send = () => {
        sender.sendNoRetry(message, registrationTokens, err => {
            if (err) console.log(err);
        });
    };
    return this;
}

module.exports = Notification;
