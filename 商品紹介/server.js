const express = require('express');
const multer = require('multer');
const { BoxSDK } = require('box-node-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- 1. Box JWT認証の設定 ---
// Boxからダウンロードした config.json を読み込みます
let sdk;
try {
    const configPath = path.join(__dirname, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath));
    sdk = BoxSDK.getPreconfiguredInstance(config);
} catch (error) {
    console.error('config.json の読み込みに失敗しました。ファイルがリポジトリにあるか確認してください。', error);
}

const client = sdk ? sdk.getAppAuthClient('enterprise') : null;

// --- 2. ファイルアップロードの設定 (multer) ---
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MBまで許可（必要に応じて調整）
});

app.use(express.static('public'));
app.use(express.json());

// --- 3. アップロード受付API ---
app.post('/upload', upload.any(), async (req, res) => {
    try {
        if (!client) {
            throw new Error('Box SDK が初期化されていません。');
        }

        const folderId = process.env.BOX_FOLDER_ID; // Renderの環境変数から取得
        const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }).replace(/[/:\s]/g, '-');

        // A. 送信されたテキストデータを1つのファイルにまとめる
        const textEntries = Object.entries(req.body);
        let textContent = "--- 商品紹介動画 オーダー情報 ---\n\n";
        textEntries.forEach(([key, value]) => {
            textContent += `【${key}】\n${value}\n\n`;
        });

        // テキストファイルをBoxに保存
        await client.files.uploadFile(folderId, `Order_Info_${timestamp}.txt`, textContent);

        // B. 送信されたメディアファイル（画像・動画）をすべてBoxに保存
        const uploadPromises = req.files.map(file => {
            // script.js で付けた名前をそのまま使う
            const fileName = `${timestamp}_${file.originalname}`;
            return client.files.uploadFile(folderId, fileName, file.buffer);
        });

        await Promise.all(uploadPromises);

        console.log(`[Success] オーダー受信完了: ${timestamp}`);
        res.status(200).json({ message: 'Success' });

    } catch (error) {
        console.error('Box Upload Error:', error);
        res.status(500).json({ error: error.message || '予期せぬエラーが発生しました。' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
