const cron = require('cron');
let express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const request = require('request')
let intervalIds = {}
let cronJobs = {}
const schedule = require('node-schedule')
const logger = require('logger').createLogger('debug.log'); 

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
        logger.info(reminder1 + ',' + reminder2 + ',' + uid + ',' + timeZoneOffset)
        let hourMinute1 = reminder1.split(':');
        let hour1 = hourMinute1[0];
        let minute1 = hourMinute1[1];
        let hourMinute2 = reminder2.split(':');
        let hour2 = hourMinute2[0];
        let minute2 = hourMinute2[1];

        if (cronJobs[uid] !== undefined) {
            Array(...cronJobs[uid]).forEach(c => {
                console.log('stopping cron job for ' + uid + ' for phone ' + phone)
                logger.info('stopping cron job for ' + uid + ' for phone ' + phone)
                c.stop()
            })
        }

        let sendReminder = () => {
            const url = 'https://platform.clickatell.com/messages/http/send?apiKey=-MJU6bpsQtuWnjBPposNdg==&to=1' + phone + '&content=Reminder+from+Constipation+APP:+Hey!+This+is+a+reminder+to+go+the+bathroom!+App+link:+https://stop-847d8.firebaseapp.com&from=1202-735-3375';
            request(url, { method: 'GET' }, (err, res, body) => {
                if (err) { return console.log('ERROR:' + err); }
                console.log('BODY:' + body);
                logger.info('BODY:' + body);
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

        logger.info(hour1 + ":" + minute1)
        logger.info(hour2 + ":" + minute2)

        let cronTime1 = `${Number(minute1)} ${Number(hour1)} * * *`
        console.log(cronTime1)
        let cronTime2 = `/${Number(minute2)} ${Number(hour2)} * * *`
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
        

        let rule1 = new schedule.RecurrenceRule();
        rule1.hour = Number(hour1);
        rule1.minute = Number(minute1);
        rule1.dayOfWeek = new schedule.Range(0,6)
 
        // let j1 = schedule.scheduleJob(rule1, function(){
        //     logger.info('reminder 1 fired for' + uid)
        //     sendReminder()
        // });

        let rule2 = new schedule.RecurrenceRule();
        // rule2.hour = Number(hour2);
        rule2.minute = Number(minute2);
        // rule2.dayOfWeek = new schedule.Range(0,6)
 
        // let j2 = schedule.scheduleJob(rule2, function(){
        //     logger.info('reminder 2 fired for' + uid)
        //     sendReminder()
        // });

        cronJobs[uid] = [reminderCron1, reminderCron2]
        
        return {
            time1: cronTime1,
            time2: cronTime2,
            uids: Object.keys(cronJobs)
        }
    }
    catch (e) {
        console.log(e)
        logger.error('caught exception:' + e)
        return e
    }
}

app.use(bodyParser.json())
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
  });
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


