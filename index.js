const cron = require('cron');
let express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const request = require('request')
let intervalIds = {}
let cronJobs = {}

const app = express()
console.log(new Date().toDateString())
let setReminderNotification = function (data) {
    try {
        const phone = data.phone
        const reminder1 = data.reminder1;
        const reminder2 = data.reminder2;
        const timeZoneOffset = data.timeZoneOffset
        const uid = data.userId;
        console.log(reminder1 + ',' + reminder2 + ',' + uid + ',' + timeZoneOffset)
        let hourMinute1 = reminder1.split(':');
        let hour1 = hourMinute1[0];
        let minute1 = hourMinute1[1];
        let hourMinute2 = reminder2.split(':');
        let hour2 = hourMinute2[0];
        let minute2 = hourMinute2[1];

        if (cronJobs[uid] !== undefined) {
            Array(...cronJobs[uid]).forEach(c => {
                console.log('stopping cron job' + c + ' for phone ' + phone)
                c.stop()
            })
        }

        let sendReminder = () => {
            const url = 'https://platform.clickatell.com/messages/http/send?apiKey=-MJU6bpsQtuWnjBPposNdg==&to=1' + phone + '&content=Reminder+from+Constipation+APP:+Hey!+This+is+a+reminder+to+go+the+bathroom!+App+link:+https://stop-847d8.firebaseapp.com&from=1202-735-3375';
            request(url, { method: 'GET' }, (err, res, body) => {
                if (err) { return console.log('ERROR:' + err); }
                console.log('BODY:' + body);
            });
        }

        if (timeZoneOffset.toString().indexOf('.') !== -1) {
            let hourMinuteComponent = timeZoneOffset.toString().split('.')
            let hourComponent = null
            let minuteComponent = null

            hourComponent = hourMinuteComponent[0]
            minuteComponent = hourMinuteComponent[1] * 6
            console.log(hourComponent + ':' + minuteComponent)
            if (hourComponent.indexOf('-') !== -1 && Number(minute1) - Number(minuteComponent) < 0) {
                hour1 = (Number(hour1) - 1 + Number(hourComponent)) % 24
                minute1 = 60 - Math.abs(Number(minute1) - Number(minuteComponent))

            } else if (hourComponent.indexOf('-') === -1 && Number(minute1) + Number(minuteComponent) > 60) {
                hour1 = (Number(hour1) + 1 + Number(hourComponent)) % 24
                minute1 = (Number(minute1) + Number(minuteComponent)) - 60
            } else {
                hour1 = (Number(hour1) + Number(hourComponent)) % 24
                minute1 = Number(minute1) - Number(minuteComponent)
            }
            if (hourComponent.indexOf('-') !== -1 && Number(minute2) - Number(minuteComponent) < 0) {
                hour2 = (Number(hour2) - 1 + Number(hourComponent)) % 24
                minute2 = 60 - Math.abs(Number(minute2) - Number(minuteComponent))
            } else if (hourComponent.indexOf('-') === -1 && Number(minute2) + Number(minuteComponent) > 60) {
                hour2 = (Number(hour2) + 1 + Number(hourComponent)) % 24
                minute2 = (Number(minute2) + Number(minuteComponent)) - 60
            } else {
                hour2 = (Number(hour2) + Number(hourComponent)) % 24
                minute2 = Number(minute2) - Number(minuteComponent)
            }
        } else {
            hour1 = (Number(hour1) + Number(timeZoneOffset)) % 24
            hour2 = (Number(hour2) + Number(timeZoneOffset)) % 24
        }
        if (hour1 < 0) {
            hour1 = 24 - Math.abs(hour1)
        }
        if (hour2 < 0) {
            hour2 = 24 - Math.abs(hour2)
        }
        console.log(hour1 + ":" + minute1)
        console.log(hour2 + ":" + minute2)
        let cronTime1 = `00 ${Number(minute1)} ${Number(hour1)} * * 0-6`
        console.log(cronTime1)
        let cronTime2 = `00 ${Number(minute2)} ${Number(hour2)} * * 0-6`
        console.log(cronTime2)
        let reminderCron1 = new cron.CronJob({
            cronTime: cronTime1,
            onTick: () => {
                console.log('reminder 1 ticked for ' + phone)
                sendReminder()
            },
            start: false,
            //  timeZone: 'America/Chicago'
        });

        let reminderCron2 = new cron.CronJob({
            cronTime: cronTime2,
            onTick: () => {
                console.log('reminder 2 ticked ' + phone)
                sendReminder()
            },
            start: false,
            // timeZone: 'America/Chicago'
        });
        reminderCron1.start()
        reminderCron2.start()
        cronJobs[uid] = [reminderCron1, reminderCron2]
        return {
            time1: cronTime1,
            time2: cronTime2
        }
    }
    catch (e) {
        console.log(e)
        return e
    }
}

app.use(bodyParser.json())
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})
app.put('/reminders', (req, res) => {
    console.log(req.body)
    res.send(setReminderNotification(req.body))
})

let port = process.env.PORT || 8082
let server = app.listen(port, () => {
    console.log('STOP server listening on port ' + port)
})


