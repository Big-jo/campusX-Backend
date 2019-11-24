let FCM = require('fcm-node');
FCM = new FCM(process.env.SERVER_KEY);
function Notification(notificationTitle, notificationBody,deviceToken) {
    this.send = () => {
        const message = {
            to: deviceToken,
            notification: {
                title: notificationTitle,
                body: notificationBody
            }
        };
        FCM.send(message, function(err, response) {
            if(err)  {
                throw new Error(err)
            }
            else {
                return 'success'
            }
        });
    };
    return this;
}

module.exports = Notification;
