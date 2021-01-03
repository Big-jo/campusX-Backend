let GCM = require('node-gcm');

export class Notification {

    private sender: any

    private registrationTokens: any[] = [];

    private message: any;

    constructor(private deviceToken: string, private title: string, private body: string) {
        this.sender = new GCM.Sender(process.env.SERVER_KEY);

        this.registrationTokens.push(deviceToken);

        this.message = new GCM.Message({
            // collapseKey: 'demo',
            priority: 'high',
            contentAvailable: true,
            delayWhileIdle: true,
            timeToLive: 3,
            restrictedPackageName: "com.insight.campus"
            ,
            dryRun: true,
            data: {
                key1: 'message1',
                key2: 'message2'
            },
            notification: {
                title: this.title,
                icon: "ic_launcher",
                body: this.body
            }
        });
        
    }

    Send() {
        console.log('sending')
        this.sender.sendNoRetry(this.message, this.registrationTokens, (err: any) => {
            if (err) console.log(err);
        });
    }
}

