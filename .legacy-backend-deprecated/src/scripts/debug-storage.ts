// @ts-nocheck
import { insforge } from '../config/insforge';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function debugStorage() {
    const logFile = path.resolve(__dirname, 'storage_debug.txt');
    let output = 'Debugging InsForge Storage...\n';

    if (insforge.storage) {
        output += `Storage Keys: ${Object.keys(insforge.storage).join(', ')}\n`;
        output += `Storage Prototype: ${Object.getPrototypeOf(insforge.storage)}\n`;

        // Check if .from exists
        if (typeof insforge.storage.from === 'function') {
            output += '✅ storage.from() exists.\n';
        }

        // Check if .createBucket exists
        if (typeof insforge.storage.createBucket === 'function') {
            output += '✅ storage.createBucket() exists.\n';
        } else {
            output += '❌ storage.createBucket() MISSING.\n';
        }
    } else {
        output += '❌ insforge.storage is undefined.\n';
    }

    fs.writeFileSync(logFile, output);
    console.log('Debug complete. see storage_debug.txt');
}

debugStorage();
