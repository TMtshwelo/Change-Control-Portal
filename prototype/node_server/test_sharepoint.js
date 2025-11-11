require('dotenv').config({ path: './config.env' });
const sharePointService = require('./services/sharePointService');

async function testSharePoint() {
    console.log('Testing SharePoint connection...');
    console.log('Config:', {
        siteUrl: process.env.SHAREPOINT_SITE_URL,
        listName: process.env.SHAREPOINT_LIST_NAME,
        username: process.env.SHAREPOINT_USERNAME,
        domain: process.env.SHAREPOINT_DOMAIN
    });

    try {
        const result = await sharePointService.testConnection();
        console.log('Connection test result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Connection test failed:', error.message);
    }
}

testSharePoint();
