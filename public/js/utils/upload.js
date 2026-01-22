/**
 * upload.js
 * 
 * Utility for handling file uploads with progress tracking.
 */

import { notify } from '../components/notification.js';

/**
 * Uploads a file to the server using XHR to support progress tracking.
 * 
 * @param {File} file - The file object to upload.
 * @param {object} options - Upload options.
 * @param {string} [options.visibility='events'] - Visibility of the uploaded file.
 * @param {string} [options.title] - Title for the uploaded file metadata.
 * @param {string} [options.categoryId] - Optional category ID.
 * @param {Function} [options.onProgress] - Callback for upload progress (0-100).
 * @returns {Promise<number>} - The ID of the uploaded file.
 */
export async function uploadFile(file, options = {}) {
    if (!file) return null;

    const visibility = options.visibility || 'events';
    const title = options.title || `${file.name.split('.')[0]} - ${Date.now()}`;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('visibility', visibility);
    formData.append('title', title);
    if (options.categoryId) {
        formData.append('categoryId', options.categoryId);
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files', true);

        if (options.onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    options.onProgress(percent);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status === 201) {
                const result = JSON.parse(xhr.responseText);
                if (result.success && result.ids.length > 0) {
                    resolve(result.ids[0]);
                } else {
                    reject(new Error('Upload succeeded but no ID returned'));
                }
            } else {
                reject(new Error('Upload failed: ' + xhr.status));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
    });
}
