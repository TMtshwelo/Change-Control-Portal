const graphClient = require('./msGraphClient');
require('dotenv').config({ path: './config.env' });

async function sendTeamsNotification(changeRequest) {
    try {
        const message = {
            body: {
                content: `New change request: ${changeRequest.title}\nStatus: ${changeRequest.status}\nPriority: ${changeRequest.priority}`
            }
        };
        
        await graphClient.api(`/teams/${process.env.TEAMS_TEAM_ID}/channels/${process.env.TEAMS_CHANNEL_ID}/messages`)
            .post(message);
    } catch (error) {
        console.error('Error sending Teams notification:', error);
        throw error;
    }
}

async function sendEmailNotification(to, subject, body) {
    try {
        const mail = {
            message: {
                subject: subject,
                body: {
                    contentType: "Text",
                    content: body
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ]
            }
        };
        
        await graphClient.api('/me/sendMail')
            .post(mail);
    } catch (error) {
        console.error('Error sending email notification:', error);
        throw error;
    }
}

module.exports = {
    sendTeamsNotification,
    sendEmailNotification
};