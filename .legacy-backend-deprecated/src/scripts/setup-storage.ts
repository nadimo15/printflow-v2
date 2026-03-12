// @ts-nocheck
import { insforge } from '../config/insforge';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function setupStorage() {
    const logFile = path.resolve(__dirname, 'storage_setup_result.txt');
    let output = 'Setting up InsForge Storage...\n';

    try {
        const bucketName = 'products';

        // Check if bucket exists
        const { data: buckets, error: listError } = await insforge.storage.listBuckets();

        if (listError) {
            output += `❌ Failed to list buckets: ${listError.message}\n`;
            // If list fails, try create anyway
        } else {
            const exists = buckets.find(b => b.name === bucketName);
            if (exists) {
                output += `✅ Bucket "${bucketName}" already exists.\n`;
                fs.writeFileSync(logFile, output);
                console.log('Setup complete. see storage_setup_result.txt');
                return;
            }
        }

        // Create bucket
        const { data, error } = await insforge.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
        });

        if (error) {
            output += `❌ Failed to create bucket "${bucketName}": ${error.message}\n`;
        } else {
            output += `✅ Bucket "${bucketName}" created successfully.\n`;
        }

    } catch (error) {
        output += `❌ Unexpected error: ${error}\n`;
    }

    fs.writeFileSync(logFile, output);
    console.log('Setup complete. see storage_setup_result.txt');
}

setupStorage();
