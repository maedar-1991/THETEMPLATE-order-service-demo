const express = require('express');
const multer = require('multer');
const { BoxClient, BoxDeveloperAuth } = require('box-node-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// メモリ上に一時保存してBoxに転送する設定
const upload = multer({ storage: multer.memoryStorage() });

// Box認証設定
const sdk = new BoxDeveloperAuth({
    developerToken: process.env.BOX_DEVELOPER_TOKEN
});
const client = new BoxClient(sdk);

app.use(express.static('public')); // フロントエンドファイルを公開
app.use(express.json());

// データ受信＆Boxアップロードのエンドポイント
app.post('/upload', upload.any(), async (req, res) => {
    try {
        const folderId = process.env.BOX_FOLDER_ID; // 保存先フォルダID
        const timestamp = new Date().getTime();

        // 1. テキスト情報の保存（JSONファイルとしてBoxへ）
        const textData = JSON.stringify(req.body, null, 2);
        await client.files.uploadFile(folderId, `order_${timestamp}.json`, textData);

        // 2. 画像・動画ファイルのアップロード
        const uploadPromises = req.files.map(file => {
            const fileName = `scene_${timestamp}_${file.originalname}`;
            return client.files.uploadFile(folderId, fileName, file.buffer);
        });

        await Promise.all(uploadPromises);

        res.status(200).json({ message: 'Success' });
    } catch (error) {
        console.error('Box Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});