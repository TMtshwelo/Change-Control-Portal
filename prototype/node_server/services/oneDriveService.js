const graphClient = require('./msGraphClient');
require('dotenv').config({ path: './config.env' });

async function uploadDocument(file, changeRequestId) {
    try {
        const folderPath = `${process.env.ONEDRIVE_FOLDER_PATH}/${changeRequestId}`;
        
        // Create folder if it doesn't exist
        await graphClient.api(`/me/drive/root:${folderPath}`)
            .put({
                name: changeRequestId,
                folder: {}
            });

        // Upload file
        const uploadResponse = await graphClient.api(`/me/drive/root:${folderPath}/${file.name}:/content`)
            .put(file.buffer);

        return uploadResponse;
    } catch (error) {
        console.error('Error uploading to OneDrive:', error);
        throw error;
    }
}

async function getDocuments(changeRequestId) {
    try {
        const folderPath = `${process.env.ONEDRIVE_FOLDER_PATH}/${changeRequestId}`;
        const files = await graphClient.api(`/me/drive/root:${folderPath}:/children`)
            .get();
        return files;
    } catch (error) {
        console.error('Error fetching OneDrive documents:', error);
        throw error;
    }
}

module.exports = {
    uploadDocument,
    getDocuments
};