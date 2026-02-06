const express = require('express');
const multer = require('multer');
const BoxSDK = require('box-node-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

function initializeBox() {
    try {
        const configPath = path.resolve(process.cwd(), 'config.json');
        if (!fs.existsSync(configPath)) return null;
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const sdk = BoxSDK.getPreconfiguredInstance(config);
        return sdk.getAppAuthClient('enterprise');
    } catch (error) {
        console.error('Box初期化エラー:', error.message);
        return null;
    }
}

let client = initializeBox();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

app.use(express.static('public'));
app.use(express.json());

app.post('/upload', upload.any(), async (req, res) => {
    try {
        if (!client) client = initializeBox();
        const rootFolderId = process.env.BOX_FOLDER_ID;

        // 1. 任意のIDを発行（例: VID-X1Y2Z）
        const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        const orderId = `VID-${randomId}`;

        const companyName = req.body.company_name || '未設定企業';
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                            .replace(/[/:\s]/g, '-');

        // フォルダ名: ID_日時_企業名
        const newFolderName = `${orderId}_${timestamp}_${companyName}`;
        console.log(`フォルダ作成開始: ${newFolderName}`);

        const newFolder = await client.folders.create(rootFolderId, newFolderName);
        const targetFolderId = newFolder.id;

        // 2. 注文内容をテキストファイルとして保存
        let textContent = `--- 動画制作オーダー情報 ---\n`;
        textContent += `管理ID: ${orderId}\n`;
        textContent += `受付日時: ${timestamp}\n`;
        textContent += `企業名: ${companyName}\n\n`;

        Object.entries(req.body).forEach(([key, value]) => {
            if (key !== 'company_name') {
                textContent += `【${key}】\n${value}\n\n`;
            }
        });

        await client.files.uploadFile(targetFolderId, `${orderId}_Order_Details.txt`, textContent);

        // 3. メディアファイルをすべて新フォルダへ（ファイル名の頭にID付与）
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => {
                // ファイル名の最初にIDをつける
                const fileNameWithId = `${orderId}_${file.originalname}`;
                return client.files.uploadFile(targetFolderId, fileNameWithId, file.buffer);
            });
            await Promise.all(uploadPromises);
        }

        res.status(200).json({ message: 'Success', orderId: orderId });

    } catch (error) {
        console.error('アップロード失敗:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => console.log(`Server started on port ${port}`));
