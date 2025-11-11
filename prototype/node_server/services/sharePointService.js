const axios = require('axios');
const https = require('https');

// SharePoint REST API configuration for on-premises
const SHAREPOINT_CONFIG = {
    siteUrl: process.env.SHAREPOINT_SITE_URL || 'https://your-sharepoint-server/sites/changecontrol',
    listName: process.env.SHAREPOINT_LIST_NAME || 'ISV Change Requests',
    username: process.env.SHAREPOINT_USERNAME,
    password: process.env.SHAREPOINT_PASSWORD,
    domain: process.env.SHAREPOINT_DOMAIN
};

// Create axios instance with SharePoint configuration
const spClient = axios.create({
    baseURL: SHAREPOINT_CONFIG.siteUrl,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // For on-premises with self-signed certificates
    }),
    headers: {
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose'
    }
});

// Authenticate with SharePoint (NTLM or Basic Auth)
async function authenticate() {
    if (SHAREPOINT_CONFIG.username && SHAREPOINT_CONFIG.password) {
        // For on-premises SharePoint, you might need to configure NTLM authentication
        // This is a basic implementation - you may need to adjust based on your auth method
        spClient.defaults.auth = {
            username: SHAREPOINT_CONFIG.username,
            password: SHAREPOINT_CONFIG.password
        };
    }
}

async function createChangeRequest(data) {
    try {
        await authenticate();

        const requestData = {
            __metadata: { type: 'SP.Data.ISVChangeRequestsListItem' },
            Title: data.title,
            RequestID: data.requestId,
            RequestorName: data.requestorName,
            RequestorEmail: data.requestorEmail,
            Department: data.department,
            Summary: data.summary,
            Description: data.description,
            ChangeType: data.changeType,
            Priority: data.priority,
            Status: "Pending",
            SubmittedDate: new Date().toISOString()
        };

        const response = await spClient.post(
            `/_api/web/lists/getbytitle('${SHAREPOINT_CONFIG.listName}')/items`,
            requestData
        );

        return {
            id: response.data.d.Id,
            ...response.data.d
        };
    } catch (error) {
        console.error('Error creating SharePoint item:', error.response?.data || error.message);
        throw error;
    }
}

async function updateChangeRequest(id, data) {
    try {
        await authenticate();

        const updateData = {
            __metadata: { type: 'SP.Data.ISVChangeRequestsListItem' },
            ...data
        };

        const response = await spClient.post(
            `/_api/web/lists/getbytitle('${SHAREPOINT_CONFIG.listName}')/items(${id})`,
            {
                ...updateData,
                '__metadata': { type: 'SP.Data.ISVChangeRequestsListItem' }
            },
            {
                headers: {
                    'X-HTTP-Method': 'MERGE',
                    'If-Match': '*'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error updating SharePoint item:', error.response?.data || error.message);
        throw error;
    }
}

async function getChangeRequests(filter = '') {
    try {
        await authenticate();

        let url = `/_api/web/lists/getbytitle('${SHAREPOINT_CONFIG.listName}')/items?$select=Id,Title,RequestID,RequestorName,RequestorEmail,Department,Summary,Description,ChangeType,Priority,Status,SubmittedDate,ApprovedDate,RejectedDate,Comments&$orderby=Id desc`;

        if (filter) {
            url += `&$filter=${encodeURIComponent(filter)}`;
        }

        const response = await spClient.get(url);

        // Transform SharePoint response to consistent format
        return response.data.d.results.map(item => ({
            id: item.Id,
            title: item.Title,
            requestId: item.RequestID,
            requestorName: item.RequestorName,
            requestorEmail: item.RequestorEmail,
            department: item.Department,
            summary: item.Summary,
            description: item.Description,
            changeType: item.ChangeType,
            priority: item.Priority,
            status: item.Status,
            submittedDate: item.SubmittedDate,
            approvedDate: item.ApprovedDate,
            rejectedDate: item.RejectedDate,
            comments: item.Comments
        }));
    } catch (error) {
        console.error('Error fetching SharePoint items:', error.response?.data || error.message);
        throw error;
    }
}

async function getChangeRequestById(id) {
    try {
        await authenticate();

        const response = await spClient.get(
            `/_api/web/lists/getbytitle('${SHAREPOINT_CONFIG.listName}')/items(${id})`
        );

        const item = response.data.d;
        return {
            id: item.Id,
            title: item.Title,
            requestId: item.RequestID,
            requestorName: item.RequestorName,
            requestorEmail: item.RequestorEmail,
            department: item.Department,
            summary: item.Summary,
            description: item.Description,
            changeType: item.ChangeType,
            priority: item.Priority,
            status: item.Status,
            submittedDate: item.SubmittedDate,
            approvedDate: item.ApprovedDate,
            rejectedDate: item.RejectedDate,
            comments: item.Comments
        };
    } catch (error) {
        console.error('Error fetching SharePoint item:', error.response?.data || error.message);
        throw error;
    }
}

async function testConnection() {
    try {
        await authenticate();

        const response = await spClient.get('/_api/web/title');
        return {
            success: true,
            siteTitle: response.data.d.Title,
            message: 'Successfully connected to SharePoint site'
        };
    } catch (error) {
        console.error('SharePoint connection test failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.message,
            details: error.response?.data
        };
    }
}

module.exports = {
    createChangeRequest,
    updateChangeRequest,
    getChangeRequests,
    getChangeRequestById,
    testConnection
};
